import FontMetrics from './font-metrics.js';
import TextDocument from './text-document.js';
import TextSelection from './text-selection.js';

const fontMetricsMap = new Map();
const lineSizeMap = new Map();
const lineCharacterOffsetMap = new Map();

class OpenGraphicaTextEditor {
    constructor(options) {
        options = options || {};

        this.domElement = document.createElement('div');
        this.domElement.className = 'opengraphica-text-editor';
        this.domElement.setAttribute('tabindex', '0');
        this.canvasElement = document.createElement('canvas');
        this.canvasElement.style.fontKerning = 'normal';
        this.textareaElement = document.createElement('textarea');
        this.domElement.appendChild(this.canvasElement);
        this.domElement.appendChild(this.textareaElement);
        this.ctx = this.canvasElement.getContext('2d');

        this.document = new TextDocument();
        this.document.parseFromCode(options.value || '');

        this.shiftPressed = false;
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

    destroy() {
        if (ResizeObserver) {
            this.resizeObserver.disconnect();
        } else {
            removeEventListener(this.resizeCallback);
        }
        document.removeEventListener('keydown', this.addKeyModifier.bind(this));
        document.removeEventListener('keyup', this.removeKeyModfier.bind(this));
    }

    draw(options) {
        options = options || {};
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
        let lineTop = 1;
        if (isDrawSpecificLine) {
            const previousOffset = lineSizeMap.get(options.lineStart);
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

            // Get line height
            let previousLineHeight = 0;
            let lineHeight = 0;
            let lineBaselineHeight = 0;
            if (isDrawSpecificLine) {
                previousLineHeight = lineSizeMap.get(i).height;
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
            lineSizeMap.set(i, { height: lineHeight, offsetTop: lineTop });

            // Draw line
            if (isDrawSpecificLine) {
                if (lineHeight !== previousLineHeight) {
                    options.lineEnd = this.document.lines.length - 1;
                }
                ctx.clearRect(0, lineTop, this.canvasElement.width, lineHeight);
                ctx.strokeColor = '#ff0000';
                ctx.lineWidth = 1;
            }
            let spanLeft = 2;
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
                    if (!isSelectionEmpty && this.selection.isVisible) {
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
                    const letterDrawX = Math.round(spanLeft + kerning + spanWidth);
                    const letterDrawY = Math.round(lineTop + lineBaselineHeight);
                    if (isLetterSelected) {
                        ctx.fillStyle = this.selectionBackgroundColor;
                        ctx.fillRect(spanLeft + spanWidth, lineTop, letterWidth + kerning + 1, lineHeight);
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
                const characterOffset = Math.max(1, Math.floor(lineCharacterOffsets[cursorCharacter])) + 0.5;
                const cursorTop = lineTop - 0.5;
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
            lineCharacterOffsetMap.set(i, lineCharacterOffsets);
            lineTop += lineHeight;
        }
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
    }

    removeKeyModfier(e) {
        if (e.keyCode === 16) {
            this.shiftPressed = false;
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
                this.selection.moveLeft(1, this.shiftPressed);
                break;
            case 38: // Up arrow
                this.selection.moveUp(1, this.shiftPressed);
                break;
            case 39: // Up arrow
                this.selection.moveRight(1, this.shiftPressed);
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