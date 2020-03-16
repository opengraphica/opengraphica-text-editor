const parseCodeColor = function(code) {
    if (code.startsWith('#')) {
        return {
            type: 'solid',
            hex: code.replace('#', '')
        };
    }
}

const parseCodeShadow = function(code) {
    return {
        // TODO
    };
}

class TextDocument {
    constructor() {
        this.lines = [];
    }

    isSameSpanMeta(meta1, meta2) {
        const meta1Keys = Object.keys(meta1).sort();
        const meta2Keys = Object.keys(meta2).sort();
        if (meta1Keys.length !== meta2Keys.length) {
            return false;
        }
        for (let i = 0; i < meta1Keys.length; i++) {
            if (meta1Keys[i] !== meta2Keys[i]) {
                return false;
            }
            const meta1Value = meta1[meta1Keys[i]];
            const meta2Value = meta2[meta2Keys[i]];
            if (JSON.stringify(meta1Value) !== JSON.stringify(meta2Value)) {
                return false;
            }
        }
        return true;
    }

    insertText(text, line, character) {
        const insertLine = this.lines[line];
        const textHasNewline = text.includes('\n');
        let characterCount = 0;
        let previousSpans = [];
        let nextSpans = [];
        let modifyingSpan = null;
        let newLine = line;
        let newCharacter = character;

        // Insert text into span at specified line/character
        for (let i = 0; i < insertLine.length; i++) {
            const span = insertLine[i];
            const spanLength = span.text.length;
            if (!modifyingSpan && (character > characterCount || character === 0)  && character <= characterCount + spanLength) {
                modifyingSpan = span;
                const textIdx = character - characterCount;
                span.text = span.text.slice(0, textIdx) + text + span.text.slice(textIdx);
                if (!textHasNewline) {
                    newCharacter = characterCount + textIdx + text.length;
                    break;
                }
            } else if (textHasNewline) {
                if (modifyingSpan) {
                    nextSpans.push(span);
                } else {
                    previousSpans.push(span);
                }
            }
            characterCount += spanLength;
        }

        // Create new lines if newline character was used
        if (textHasNewline && modifyingSpan) {
            const modifiedSpans = [];
            const textLines = modifyingSpan.text.split('\n');
            for (let i = 0; i < textLines.length; i++) {
                modifiedSpans.push({
                    meta: JSON.parse(JSON.stringify(modifyingSpan.meta)),
                    text: textLines[i]
                });
            }
            this.lines[line] = [...previousSpans, modifiedSpans.shift()];
            for (let i = 0; i < modifiedSpans.length; i++) {
                if (i === modifiedSpans.length - 1) {
                    this.lines.splice(line + i + 1, 0, [modifiedSpans[i], ...nextSpans]);
                    newLine = line + i + 1;
                    newCharacter = text.length - 1 - text.lastIndexOf('\n');
                } else {
                    this.lines.splice(line + i + 1, 0, [modifiedSpans[i]]);
                }
            }
        }

        // Return end position
        return {
            line: newLine,
            character: newCharacter
        };
    }

    deleteRange(startLine, startCharacter, endLine, endCharacter) {
        // Check bounds
        startLine >= 0 || (startLine = 0);
        startCharacter >= 0 || (startCharacter = 0);
        endLine < this.lines.length || (endLine = this.lines.length - 1);
        const endLineCharacterCount = this.getLineCharacterCount(endLine);
        endCharacter <= endLineCharacterCount || (
            endCharacter = endLineCharacterCount
        );

        // Early return if there's nothing to delete
        if (startLine === endLine && startCharacter === endCharacter) {
            return {
                line: startLine,
                character: startCharacter
            };
        }

        // Get spans in start line before range
        const beforeSpans = [];
        const afterSpans = [];
        let characterCount = 0;
        let startSpan = null;
        let startSpanDeleteIndex = 0;
        for (let i = 0; i < this.lines[startLine].length; i++) {
            const span = this.lines[startLine][i];
            const spanLength = span.text.length;
            if (!startSpan && (startCharacter > characterCount || startCharacter === 0) && startCharacter <= characterCount + spanLength) {
                startSpan = span;
                startSpanDeleteIndex = Math.max(0, startCharacter - characterCount);
                break;
            }
            if (!startSpan) {
                beforeSpans.push(span);
            }
            characterCount += spanLength;
        }

        // Get spans in end line after range
        characterCount = 0;
        let endSpan = null;    
        let endSpanDeleteIndex = 0;
        for (let i = 0; i < this.lines[endLine].length; i++) {
            const span = this.lines[endLine][i];
            const spanLength = span.text.length;
            if (!endSpan && (endCharacter > characterCount || endCharacter === 0) && endCharacter <= characterCount + spanLength) {
                endSpan = span;
                endSpanDeleteIndex = Math.max(0, endCharacter - characterCount);
            }
            else if (endSpan) {
                afterSpans.push(span);
            }
            characterCount += spanLength;
        }

        // Merge start and end lines
        this.lines[startLine] = [...beforeSpans];
        if (startSpan === endSpan || this.isSameSpanMeta(startSpan.meta, endSpan.meta)) {
            const combinedSpans = {
                meta: startSpan.meta,
                text: startSpan.text.slice(0, startSpanDeleteIndex) + endSpan.text.slice(endSpanDeleteIndex)
            };
            if (combinedSpans.text || (beforeSpans.length === 0 && afterSpans.length === 0)) {
                this.lines[startLine].push(combinedSpans);
            }
        } else {
            const middleSpans = [];
            let isAddedStartSpan = false;
            let isAddedEndSpan = false;
            if (startSpan) {
                startSpan.text = startSpan.text.slice(0, startSpanDeleteIndex);
                if (startSpan.text) {
                    middleSpans.push(startSpan);
                    isAddedStartSpan = true;
                }
            }
            if (endSpan) {
                endSpan.text = endSpan.text.slice(endSpanDeleteIndex)
                if (endSpan.text || middleSpans.length === 0) {
                    middleSpans.push(endSpan);
                    isAddedEndSpan = true;
                }
            }
            if (isAddedStartSpan && !isAddedEndSpan) {
                const afterSpan = afterSpans[0];
                if (afterSpan && this.isSameSpanMeta(startSpan.meta, afterSpan.meta)) {
                    afterSpans.shift();
                    startSpan.text += afterSpan.text;
                }
            }
            else if (isAddedEndSpan && !isAddedStartSpan) {
                const beforeSpan = beforeSpans[beforeSpans.length - 1];
                if (beforeSpan && this.isSameSpanMeta(beforeSpan.meta, endSpan.meta)) {
                    beforeSpans.pop();
                    beforeSpan.text += endSpan.text;
                }
            }
            else if (middleSpans.length === 0) {
                const beforeSpan = beforeSpans[beforeSpans.length - 1];
                const afterSpan = afterSpans[0];
                if (beforeSpan && afterSpan && this.isSameSpanMeta(beforeSpan.meta, afterSpan.meta)) {
                    afterSpans.shift();
                    beforeSpan.text += afterSpan.text;
                }
            }
            this.lines[startLine] = this.lines[startLine].concat(middleSpans);
        }
        this.lines[startLine] = this.lines[startLine].concat(afterSpans);

        // Delete lines in-between range
        this.lines.splice(startLine + 1, endLine - startLine);

        // Return new position
        return {
            line: startLine,
            character: startCharacter
        };
    }

    deleteCharacter(forward, startLine, startCharacter) {
        let endLine = startLine;
        let endCharacter = startCharacter;
        
        // Delete forwards
        if (forward) {
            // If there are characters after cursor on this line we remove one
            if (startCharacter < this.getLineCharacterCount(startLine)) {
                ++endCharacter;
            }
            // if there are Lines after this one we append it
            else if (startLine < this.lines.length - 1) {
                ++endLine;
                endCharacter = 0;
            }
        }
        // Delete backwards
        else {
            // If there are characters before the cursor on this line we remove one
            if (startCharacter > 0) {
                --startCharacter;
            }
            // if there are rows before we append current to previous one
            else if (startLine > 0) {
                --startLine;
                startCharacter = this.getLineCharacterCount(startLine);
            }
        }

        return this.deleteRange(startLine, startCharacter, endLine, endCharacter);
    }
    
    parseFromCode(code) {
        this.lines = [];
        const stringLines = code.replace(/\\\[/g, '&lsqb;').replace(/\\\]/g, '&rsqb;').split('\n');
        const tagStack = {
            b: [],
            i: [],
            u: [],
            s: [],
            left: [],
            right: [],
            center: [],
            style: []
        };
        let metaState = {
            /*
            bold: false,
            italic: false,
            underline: false,
            strikethrough: false,
            align: 'left',
            size: 12,
            font: 'Arial',
            fillColor: {
                type: 'solid',
                hex: '000000ff'
            },
            strokeColor: {
                type: 'solid',
                hex: '000000ff'
            },
            strokeWidth: 0,
            shadow: null,
            kerning: 0,
            baseline: 0
            */
        };
        for (let i = 0; i < stringLines.length; i++) {
            let currentLineIndex = 0;
            let currentSpanText = '';
            const currentLine = stringLines[i];
            const spans = [];
            const tagRegex = /\[.*?\]/g;
            let nextTagMatch = tagRegex.exec(currentLine);
            while (nextTagMatch) {
                const tag = nextTagMatch[0] || '';
                const isOpeningTag = !(/^\[\//.test(tag));
                const tagContents = /\[\/?(.*?)\]/g.exec(tag)[1].trim().toLowerCase().split(/\s{1,}(.+)/g);
                const tagName = tagContents[0] || '';
                let metaDiffs = [];
                switch (tagName) {
                    case 'b':
                        metaDiffs.push({
                            name: 'bold',
                            value: true
                        });
                        break;
                    case 'i':
                        metaDiffs.push({
                            name: 'italic',
                            value: true
                        });
                        break;
                    case 'u':
                        metaDiffs.push({
                            name: 'underline',
                            value: true
                        });
                        break;
                    case 's':
                        metaDiffs.push({
                            name: 'strikethrough',
                            value: true
                        });
                        break;
                    case 'left':
                        metaDiffs.push({
                            name: 'align',
                            value: 'left'
                        });
                        break;
                    case 'right':
                        metaDiffs.push({
                            name: 'align',
                            value: 'right'
                        });
                        break;
                    case 'center':
                        metaDiffs.push({
                            name: 'align',
                            value: 'center'
                        });
                        break;
                    case 'style':
                        if (tagContents.length > 1) {
                            const argumentList = tagContents[1].replace(/\s*=\s*/g, '=').split(/\s(?=(?:(?:[^"]*"){2})*[^"]*$)/);
                            for (let j = 0; j < argumentList.length; j++) {
                                const argumentSplit = argumentList[j].split(/\s*=\s*(.+)/);
                                const argumentName = argumentSplit[0];
                                const argumentValue = argumentSplit[1].replace(/^"/, '').replace(/"$/, '');
                                switch (argumentName) {
                                    case 'font':
                                        metaDiffs.push({
                                            name: 'font',
                                            value: argumentValue
                                        });
                                        break;
                                    case 'size':
                                        metaDiffs.push({
                                            name: 'size',
                                            value: parseFloat(argumentValue.replace('px', ''))
                                        });
                                        break;
                                    case 'fill-color':
                                        metaDiffs.push({
                                            name: 'fillColor',
                                            value: parseCodeColor(argumentValue)
                                        });
                                        break;
                                    case 'stroke-color':
                                        metaDiffs.push({
                                            name: 'strokeColor',
                                            value: parseCodeColor(argumentValue)
                                        });
                                        break;
                                    case 'stroke-width':
                                        metaDiffs.push({
                                            name: 'strokeWidth',
                                            value: parseFloat(argumentValue.replace('px', ''))
                                        });
                                        break;
                                    case 'shadow':
                                        metaDiffs.push({
                                            name: 'shadow',
                                            value: parseCodeShadow(argumentValue)
                                        });
                                        break;
                                    case 'kerning':
                                        metaDiffs.push({
                                            name: 'kerning',
                                            value: parseFloat(argumentValue.replace('px', ''))
                                        });
                                        break;
                                    case 'baseline':
                                        metaDiffs.push({
                                            name: 'baseline',
                                            value: parseFloat(argumentValue.replace('px', ''))
                                        });
                                        break;
                                }
                            }
                        }
                        break;
                }

                // Add string span with current styling meta
                currentSpanText = currentLine.slice(currentLineIndex, nextTagMatch.index);
                currentLineIndex = nextTagMatch.index + tag.length;
                if (currentSpanText) {
                    spans.push({
                        meta: JSON.parse(JSON.stringify(metaState)),
                        text: currentSpanText.replace(/&lsqb;/g, '[').replace(/&rsqb;/g, ']')
                    });
                }

                // Update styling meta based on parsed tag state
                if (tagStack[tagName]) {
                    if (isOpeningTag) {
                        for (let j = 0; j < metaDiffs.length; j++) {
                            metaDiffs.oldValue = metaState[metaDiffs[j].name];
                            metaState[metaDiffs[j].name] = metaDiffs[j].value;
                        }
                        tagStack[tagName].push(metaDiffs);
                    } else {
                        const removedTagDiffs = tagStack[tagName].pop();
                        if (removedTagDiffs) {
                            for (let j = 0; j < removedTagDiffs.length; j++) {
                                metaState[removedTagDiffs[j].name] = removedTagDiffs[j].oldValue;
                            }
                        }
                    }
                }

                nextTagMatch = tagRegex.exec(currentLine);
            }
            if (currentLineIndex < currentLine.length - 1) {
                spans.push({
                    meta: JSON.parse(JSON.stringify(metaState)),
                    text: currentLine.slice(currentLineIndex)
                });
            }
            this.lines.push(spans);
        }
    }

    getLineCount() {
        return this.lines.length;
    }

    getLineText(lineNumber) {
        let lineText = '';
        for (let i = 0; i < this.lines[lineNumber].length; i++) {
            lineText += this.lines[lineNumber][i].text;
        }
        return lineText;
    }

    getLineCharacterCount(lineNumber) {
        return this.getLineText(lineNumber).length;
    }
}

export default TextDocument;