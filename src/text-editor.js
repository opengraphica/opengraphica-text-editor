import FontMetrics from './font-metrics.js';
import TextDocument from './text-document.js';
import TextSelection from './text-selection.js';

const fontMetricsMap = new Map();

class OpenGraphicaTextEditor {
    constructor(options) {
        options = options || {};

        this.domElement = document.createElement('div');
        this.domElement.className = 'opengraphica-text-editor';
        this.domElement.setAttribute('tabindex', '0');
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.style.fontKerning = 'normal';
        this.textareaElement = document.createElement('textarea');
        this.textareaElement.setAttribute('autocorrect', 'off');
        this.textareaElement.setAttribute('autocapitalize', 'off');
        this.textareaElement.setAttribute('autocomplete', 'off');
        this.textareaElement.setAttribute('spellcheck', 'false');
        this.domElement.appendChild(this.canvasElement);
        this.domElement.appendChild(this.textareaElement);
        this.ctx = this.canvasElement.getContext('2d');

        this.lineSizeMap = new Map();
        this.lineCharacterOffsetMap = new Map();

        this.scrollTop = 0;
        this.scrollLeft = 0;
        this.scrollWidth = 0;
        this.scrollHeight = 0;
        this.scrollWidthPadding = 4;
        this.scrollHeightPadding = 0;

        this.scrollbarTrackColor = options.scrollbarTrackColor || '#C3C4C4';
        this.scrollbarThumbColor = options.scrollbarThumbColor || '#787C7D';
        this.scrollbarThumbPadding = options.scrollbarThumbPadding != null ? options.scrollbarThumbPadding : 2;
        this.scrollbarThumbStyle = options.scrollbarThumbStyle || 'round';
        this.scrollbarSize = options.scrollbarSize || 12;

        this.drawOffsetTop = options.paddingVertical != null ? options.paddingVertical : 6;
        this.drawOffsetLeft = options.paddingHorizontal != null ? options.paddingHorizontal : 10;

        this.document = new TextDocument();
        this.document.parseFromCode(options.value || '');

        this.shiftPressed = false;
        this.ctrlPressed = false;
        this.selectionBackgroundColor = options.selectionBackgroundColor || '#1C79C4';
        this.selectionTextColor = options.selectionTextColor || '#FFFFFF';
        this.metaDefaults = {
            size: 12,
            font: 'Arial, sans-serif',
            kerning: 0,
            fillColor: {
                type: 'solid',
                hex: '000000FF'
            },
            strokeWidth: 0,
            strokeColor: {
                type: 'solid',
                hex: '000000FF'
            }
        };

        this.selection = new TextSelection(this);

        this.domElement.addEventListener('focus', this.onFocusRoot.bind(this), false);
        this.textareaElement.addEventListener('focus', this.onFocus.bind(this), false);
        this.textareaElement.addEventListener('blur', this.onBlur.bind(this), false);
        this.textareaElement.addEventListener('input', this.onInput.bind(this), false);
        this.textareaElement.addEventListener('keydown', this.onKeydown.bind(this), false);
        document.addEventListener('keydown', this.addKeyModifier.bind(this), true);
        document.addEventListener('keyup', this.removeKeyModfier.bind(this), true);
    }

    init() {
        requestAnimationFrame(() => {
            this.draw();
        });

        if (!this.resizeObserver) {
            if (ResizeObserver) {
                this.resizeCallback = (entries) => {
                    for (let entry of entries) {
                        if (entry.contentBoxSize) {
                            this.draw();
                        }
                    }
                };
                this.resizeObserver = new ResizeObserver(this.resizeCallback);
                this.resizeObserver.observe(this.domElement);
            } else {
                this.resizeCallback = () => {
                    this.draw();
                };
                addEventListener('resize', this.resizeCallback);
                console.warn('[opengraphica-text-editor] This browser does not support the ResizeObserver API. It is recommended that you polyfill this API so the canvas can resize automatically. Otherwise, you can call the draw() method on the OpenGraphicaTextEditor instance manually if needed.');
            }
        }
    }

    destroy() {
        if (this.domElement.parent) {
            this.domElement.parent.removeChild(this.domElement);
        }
        this.domElement = null;
        if (ResizeObserver) {
            this.resizeObserver.disconnect();
        } else {
            removeEventListener(this.resizeCallback);
        }
        document.removeEventListener('keydown', this.addKeyModifier.bind(this));
        document.removeEventListener('keyup', this.removeKeyModfier.bind(this));
        this.lineSizeMap.clear();
        this.lineSizeMap = null;
        this.lineCharacterOffsetMap.clear();
        this.lineCharacterOffsetMap = null;
        this.selection = null;
    }

    scrollToCursor() {
        if (this.selection) {
            this.draw(); // TODO - replace with calculation only method?
            const cursorPosition = this.selection.getPosition();
            let lineSize = this.lineSizeMap.get(cursorPosition.line);
            if (lineSize) {
                const lineTop = lineSize.offsetTop;
                const lineBottom = lineTop + lineSize.height;
                const scrollBottom = this.scrollTop + this.canvasElement.height;
                if (lineBottom > scrollBottom) {
                    this.scrollTop = lineBottom - this.canvasElement.height + this.scrollHeightPadding + this.scrollbarSize;
                }
                if (lineTop - this.drawOffsetTop < this.scrollTop) {
                    this.scrollTop = lineTop - this.drawOffsetTop;
                }
                let characterOffsets = this.lineCharacterOffsetMap.get(cursorPosition.line);
                if (characterOffsets && characterOffsets.length >= cursorPosition.character) {
                    const cursorLeft = characterOffsets[cursorPosition.character];
                    const scrollRight = this.scrollLeft + this.canvasElement.width;
                    if (cursorLeft > scrollRight) {
                        this.scrollLeft = cursorLeft - this.canvasElement.width + this.scrollWidthPadding + this.scrollbarSize;
                    }
                    if (cursorLeft - this.drawOffsetLeft < this.scrollLeft) {
                        this.scrollLeft = cursorLeft - this.drawOffsetLeft;
                    }
                }
            }
        }
    }

    draw(options) {
        options = options || {};
        const scrollTop = this.scrollTop;
        const scrollLeft = this.scrollLeft;
        let scrollWidth = 0;
        let scrollHeight = 0;
        let isSelectionEmpty = this.selection.isEmpty();
        let isDrawSpecificLine = false;
        const canvasClientRect = this.canvasElement.getBoundingClientRect();
        if (this.canvasElement.width !== canvasClientRect.width || this.canvasElement.height !== canvasClientRect.height) {
            this.canvasElement.width = canvasClientRect.width;
            this.canvasElement.height = canvasClientRect.height;
            options.lineStart = 0;
            options.lineEnd = this.document.lines.length - 1;
        } else {
            isDrawSpecificLine = options.lineStart != null || options.lineEnd != null;
            options.lineStart = options.lineStart != null ? options.lineStart : 0;
            options.lineEnd = options.lineEnd != null ? options.lineEnd : this.document.lines.length - 1;
        }
        const ctx = this.ctx;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        let lineTop = this.drawOffsetTop;
        if (isDrawSpecificLine) {
            const previousOffset = this.lineSizeMap.get(options.lineStart);
            if (previousOffset) {
                lineTop = previousOffset.offsetTop;
            } else {
                options.lineStart = 0;
                options.lineEnd = this.document.lines.length - 1;
                isDrawSpecificLine = false;
            }
        }
        if (!isDrawSpecificLine) {
            ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }
        for (let i = options.lineStart; i <= options.lineEnd; i++) {
            const line = this.document.lines[i];
            let isCalculateLineOnly = false;

            // Get line height
            let previousLineHeight = 0;
            let lineHeight = 0;
            let lineBaselineHeight = 0;
            if (isDrawSpecificLine) {
                previousLineHeight = this.lineSizeMap.get(i).height;
            }
            for (let j = 0; j < line.length; j++) {
                const span = line[j];
                const fontSize = (span.meta.size || this.metaDefaults.size);
                const fontName = (span.meta.font || this.metaDefaults.font);
                let fontMetrics = fontMetricsMap.get(fontName + '_' + fontSize);
                if (!fontMetrics) {
                    fontMetrics = new FontMetrics(fontName, fontSize);
                    fontMetricsMap.set(fontName + '_' + fontSize, fontMetrics);
                }
                if (fontMetrics.height > lineHeight) {
                    lineHeight = fontMetrics.height;
                    lineBaselineHeight = fontMetrics.baseline;
                }
            }
            this.lineSizeMap.set(i, { height: lineHeight, offsetTop: lineTop });

            // Don't draw if line outside the vertical scroll
            if (lineTop + lineHeight < scrollTop || lineTop > scrollTop + this.canvasElement.height) {
                isCalculateLineOnly = true;
            }
        
            // Draw line
            if (isDrawSpecificLine) {
                if (lineHeight !== previousLineHeight) {
                    options.lineEnd = this.document.lines.length - 1;
                }
                ctx.clearRect(0, lineTop - scrollTop, this.canvasElement.width, lineHeight);
                ctx.strokeColor = '#ff0000';
                ctx.lineWidth = 1;
            }
            let spanLeft = this.drawOffsetLeft;
            let spanLetterCount = 0;
            const lineCharacterOffsets = [spanLeft];
            for (let j = 0; j < line.length; j++) {
                const span = line[j];
                const kerning = span.meta.kerning || this.metaDefaults.kerning;
                ctx.font =
                    ' ' + (span.meta.italic ? 'italic' : '') +
                    ' ' + (span.meta.bold ? 'bold' : '') +
                    ' ' + (span.meta.size || this.metaDefaults.size) + 'px' +
                    ' ' + (span.meta.font || this.metaDefaults.font);
                
                const fillColor = span.meta.fillColor || this.metaDefaults.fillColor;
                let fillStyle;
                if (fillColor.type === 'solid') {
                    fillStyle = '#' + fillColor.hex;
                }
                const strokeWidth = (span.meta.strokeWidth != null) ? span.meta.strokeWidth : this.metaDefaults.strokeWidth;
                let strokeStyle;
                if (strokeWidth) {
                    const strokeColor = span.meta.strokeColor || this.metaDefaults.strokeColor;
                    if (strokeColor.type === 'solid') {
                        strokeStyle = '#' + strokeColor.hex;
                    }
                    ctx.lineWidth = strokeWidth;
                }
                let spanWidth = 0;
                for (let k = 0; k < span.text.length; k++) {
                    let isLetterSelected = false;
                    if (!isCalculateLineOnly && !isSelectionEmpty && this.selection.isVisible) {
                        isLetterSelected = (
                            (
                                this.selection.start.line === i &&
                                this.selection.start.character <= spanLetterCount + k &&
                                (this.selection.end.line > i || this.selection.end.character > spanLetterCount + k)
                            ) ||
                            (
                                this.selection.end.line === i &&
                                this.selection.end.character > spanLetterCount + k &&
                                (this.selection.start.line < i || this.selection.start.character <= spanLetterCount + k)
                            ) ||
                            (
                                this.selection.start.line < i &&
                                this.selection.end.line > i
                            )
                        );
                    }
                    const letter = span.text.charAt(k);
                    const letterWidth = ctx.measureText(letter).width;
                    if (!isCalculateLineOnly) {
                        const letterDrawX = Math.round(spanLeft - scrollLeft + kerning + spanWidth);
                        const letterDrawY = Math.round(lineTop - scrollTop + lineBaselineHeight);
                        if (isLetterSelected) {
                            ctx.fillStyle = this.selectionBackgroundColor;
                            ctx.fillRect(spanLeft - scrollLeft + spanWidth, lineTop - scrollTop, letterWidth + kerning + 1, lineHeight);
                        }
                        if (isLetterSelected) {
                            ctx.fillStyle = this.selectionTextColor;
                            ctx.strokeStyle = this.selectionTextColor;
                        } else {
                            ctx.fillStyle = fillStyle;
                            ctx.strokeStyle = strokeStyle;
                        }
                        ctx.fillText(letter, letterDrawX, letterDrawY);
                        if (strokeWidth) {
                            ctx.strokeText(letter, letterDrawX, letterDrawY);
                        }
                    }
                    spanWidth += kerning + letterWidth;
                    lineCharacterOffsets.push(spanLeft + spanWidth);
                }
                spanLetterCount += span.text.length;
                spanLeft += spanWidth;
            }

            // Draw cursor
            const cursorLine = this.selection.isActiveSideEnd ? this.selection.end.line : this.selection.start.line;
            if (this.selection.isVisible && this.selection.isBlinkVisible && cursorLine === i) {
                const cursorCharacter = this.selection.isActiveSideEnd ? this.selection.end.character : this.selection.start.character;
                const characterOffset = Math.max(1, Math.floor(lineCharacterOffsets[cursorCharacter])) + 0.5 - scrollLeft;
                const cursorTop = lineTop - 0.5 - scrollTop;
                ctx.lineCap = 'butt';
                ctx.strokeStyle = '#55555577';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(characterOffset, cursorTop + 1);
                ctx.lineTo(characterOffset, cursorTop + lineHeight - 1);
                if (lineHeight > 14) {
                    ctx.moveTo(characterOffset - 3, cursorTop + 2);
                    ctx.lineTo(characterOffset + 3, cursorTop + 2);
                    ctx.moveTo(characterOffset - 3, cursorTop + lineHeight - 2);
                    ctx.lineTo(characterOffset + 3, cursorTop + lineHeight - 2);
                }
                ctx.stroke();
                ctx.strokeStyle = '#ffffffff';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(characterOffset, cursorTop + 2);
                ctx.lineTo(characterOffset, cursorTop + lineHeight - 2);
                if (lineHeight > 14) {
                    ctx.moveTo(characterOffset - 2, cursorTop + 2);
                    ctx.lineTo(characterOffset + 2, cursorTop + 2);
                    ctx.moveTo(characterOffset - 2, cursorTop + lineHeight - 2);
                    ctx.lineTo(characterOffset + 2, cursorTop + lineHeight - 2);
                }
                ctx.stroke();
            }
            if (scrollWidth < lineCharacterOffsets[lineCharacterOffsets.length-1]) {
                scrollWidth = lineCharacterOffsets[lineCharacterOffsets.length-1];
            }
            this.lineCharacterOffsetMap.set(i, lineCharacterOffsets);

            lineTop += lineHeight;
        }
        scrollHeight = lineTop;

        // Calculate scrollbar size if didn't loop through all lines
        if (isDrawSpecificLine) {
            for (let i = 0; i < this.document.lines.length; i++) {
                const characterOffsets = this.lineCharacterOffsetMap.get(i);
                if (characterOffsets) {
                    if (scrollWidth < characterOffsets[characterOffsets.length - 1]) {
                        scrollWidth = characterOffsets[characterOffsets.length - 1];
                    }
                }
            }
            const lastLineDef = this.lineSizeMap.get(this.document.lines.length - 1);
            if (lastLineDef) {
                scrollHeight = lastLineDef.offsetTop + lastLineDef.height;
            }
        }
        scrollWidth += this.scrollWidthPadding + this.scrollbarSize;
        scrollHeight += this.scrollHeightPadding + this.scrollbarSize;

        this.scrollLeft = Math.max(0, Math.min(this.scrollLeft, scrollWidth - this.canvasElement.width));
        this.scrollTop = Math.max(0, Math.min(this.scrollTop, scrollHeight - this.canvasElement.height));

        // Draw horizontal scrollbar
        if (scrollWidth > this.canvasElement.width) {
            ctx.fillStyle = this.scrollbarTrackColor;
            ctx.fillRect(0, this.canvasElement.height - this.scrollbarSize, this.canvasElement.width, this.scrollbarSize);
            ctx.lineCap = this.scrollbarThumbStyle;
            ctx.strokeStyle = this.scrollbarThumbColor;
            ctx.lineWidth = this.scrollbarSize - (this.scrollbarThumbPadding * 2);
            ctx.beginPath();
            const scrollbarThumbTop = this.canvasElement.height - (this.scrollbarSize / 2) + 0.5;
            const scrollbarThumbLeftBound = (ctx.lineWidth / 2) + (this.scrollbarThumbPadding / 2);
            let scrollbarThumbRightBound = this.canvasElement.width - (ctx.lineWidth / 2) - (this.scrollbarThumbPadding / 2);
            if (scrollHeight > this.canvasElement.height) {
                scrollbarThumbRightBound -= this.scrollbarSize;
            }
            const scrollTrackWidth = scrollbarThumbRightBound - scrollbarThumbLeftBound;
            const scrollThumbWidth = this.canvasElement.width / scrollWidth * scrollTrackWidth;
            const scrollTrackLeft = Math.min(this.scrollLeft, scrollWidth - this.canvasElement.width) / scrollWidth * scrollTrackWidth;
            ctx.moveTo(scrollbarThumbLeftBound + scrollTrackLeft, scrollbarThumbTop);
            ctx.lineTo(scrollbarThumbLeftBound + scrollTrackLeft + scrollThumbWidth, scrollbarThumbTop);
            ctx.stroke();
        }

        // Draw vertical scrollbar
        if (scrollHeight > this.canvasElement.height) {
            ctx.fillStyle = this.scrollbarTrackColor;
            ctx.fillRect(this.canvasElement.width - this.scrollbarSize, 0, this.canvasElement.width, this.canvasElement.height);
            ctx.lineCap = this.scrollbarThumbStyle;
            ctx.strokeStyle = this.scrollbarThumbColor;
            ctx.lineWidth = this.scrollbarSize - (this.scrollbarThumbPadding * 2);
            ctx.beginPath();
            const scrollbarThumbLeft = this.canvasElement.width - (this.scrollbarSize / 2) + 0.5;
            const scrollbarThumbTopBound = (ctx.lineWidth / 2) + (this.scrollbarThumbPadding / 2);
            let scrollbarThumbBottomBound = this.canvasElement.height - (ctx.lineWidth / 2) - (this.scrollbarThumbPadding / 2);
            if (scrollWidth > this.canvasElement.width) {
                scrollbarThumbBottomBound -= this.scrollbarSize;
            }
            const scrollTrackHeight = scrollbarThumbBottomBound - scrollbarThumbTopBound;
            const scrollThumbHeight = this.canvasElement.height / scrollHeight * scrollTrackHeight;
            const scrollTrackTop = Math.min(this.scrollTop, scrollHeight - this.canvasElement.height) / scrollHeight * scrollTrackHeight;
            ctx.moveTo(scrollbarThumbLeft, scrollbarThumbTopBound + scrollTrackTop);
            ctx.lineTo(scrollbarThumbLeft, scrollbarThumbTopBound + scrollTrackTop + scrollThumbHeight);
            ctx.stroke();
        }
        this.scrollWidth = scrollWidth;
        this.scrollHeight = scrollHeight;
    }

    insertTextAtCurrentPosition(text) {
        if (!this.selection.isEmpty()) {
            this.deleteCharacterAtCurrentPosition();
        }
        const position = this.selection.getPosition();
        const newPosition = this.document.insertText(text, position.line, position.character);
        this.selection.setPosition(newPosition.line, newPosition.character);
        this.draw();
    }

    deleteCharacterAtCurrentPosition(forward) {
        let newPosition;
        if (this.selection.isEmpty()) {
            const position = this.selection.getPosition();
            newPosition = this.document.deleteCharacter(forward, position.line, position.character);
        } else {
            newPosition = this.document.deleteRange(
                this.selection.start.line,
                this.selection.start.character,
                this.selection.end.line,
                this.selection.end.character
            );
        }
        this.selection.setPosition(newPosition.line, newPosition.character);
        this.draw();
    }

    addKeyModifier(e) {
        if (e.keyCode === 16) {
            this.shiftPressed = true;
        }
        else if (e.keyCode === 17) {
            this.ctrlPressed = true;
        }
    }

    removeKeyModfier(e) {
        if (e.keyCode === 16) {
            this.shiftPressed = false;
        }
        else if (e.keyCode === 17) {
            this.ctrlPressed = false;
        }
    }

    onFocusRoot(e) {
        this.textareaElement.focus();
    }

    onFocus(e) {
        this.domElement.classList.add('focused');
        this.selection.setVisible(true);
    }

    onBlur(e) {
        this.domElement.classList.remove('focused');
        this.selection.setVisible(false);
    }

    onInput(e) {
        this.insertTextAtCurrentPosition(e.target.value);
        e.target.value = '';
    }

    onKeydown(e) {
        let handled = true;
        switch (e.keyCode) {
            case 8: // backspace
                this.deleteCharacterAtCurrentPosition(false);
                break;
            case 46: // delete
                this.deleteCharacterAtCurrentPosition(true);
                break;
            case 35: // end
                this.selection.moveLineEnd(this.shiftPressed);
                break;
            case 36: // Home
                this.selection.moveLineStart(this.shiftPressed);
                break;
            case 37: // Left arrow
                if (!this.shiftPressed && !this.selection.isEmpty()) {
                    this.selection.isActiveSideEnd = false;
                    this.selection.moveLeft(0, false);
                } else {
                    this.selection.moveLeft(1, this.shiftPressed);
                }
                break;
            case 38: // Up arrow
                this.selection.moveUp(1, this.shiftPressed);
                break;
            case 39: // Right arrow
                if (!this.shiftPressed && !this.selection.isEmpty()) {
                    this.selection.isActiveSideEnd = true;
                    this.selection.moveRight(0, false);
                } else {
                    this.selection.moveRight(1, this.shiftPressed);
                }
                break;
            case 40: // Down arrow
                this.selection.moveDown(1, this.shiftPressed);
                break;
            default:
                handled = false;
        }
        return !handled;
    }

}

export default OpenGraphicaTextEditor;