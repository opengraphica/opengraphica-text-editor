class TextSelection {
    constructor(editor) {
        this.editor = editor;
        this.isVisible = false;
        this.isActiveSideEnd = true;
        this.isBlinkVisible = true;
        this.blinkInterval = 500;

        this.start = {
            line: 0,
            character: 0
        };
        
        this.end = {
            line: 0,
            character: 0
        };

        this.setPosition(0, 0);
    }

    isEmpty() {
        return this.comparePosition(this.start.line, this.start.character, this.end.line, this.end.character) === 0;
    }

    comparePosition(line1, character1, line2, character2) {
        if (line1 < line2) {
            return -1;
        } else if (line1 > line2) {
            return 1;
        } else {
            if (character1 < character2) {
                return -1;
            } else if (character1 > character2) {
                return 1;
            } else {
                return 0;
            }
        }
    }

    setPosition(line, character, keepSelection) {
        if (line == null) {
            line = this.end.line;
        }
        if (character == null) {
            character = this.end.character;
        }

        // Check lower bounds
        line >= 0 || (line = 0);
        character >= 0 || (character = 0);

        // Check upper bounds
        const lineCount = this.editor.document.getLineCount();
        line < lineCount || (line = lineCount - 1);
        const lineCharacterCount = this.editor.document.getLineCharacterCount(line);
        character <= lineCharacterCount || (character = lineCharacterCount);

        // Add to selection
        if (keepSelection) {
            const positionCompare = this.comparePosition(
                line,
                character,
                this.start.line,
                this.start.character
            );

            // Determine whether we should make the start side of the range active, selection moving left or up.
            if (positionCompare === -1 && (this.isEmpty() || line < this.start.line)) {
                this.isActiveSideEnd = false;
            }

            // Assign new value to the side that is active
            if (this.isActiveSideEnd) {
                this.end.line = line;
                this.end.character = character;
            } else {
                this.start.line = line;
                this.start.character = character;
            }

            // Making sure that end is greater than start and swap if necessary
            if (this.comparePosition(this.start.line, this.start.character, this.end.line, this.end.character) > 0) {
                this.isActiveSideEnd = !this.isActiveSideEnd;
                const temp = {
                    line: this.start.line,
                    character: this.start.character
                }
                this.start.line = this.end.line;
                this.start.character = this.end.character;
                this.end.line = temp.line;
                this.end.character = temp.character;
            }
        }
        // Empty cursor move
        else {
            this.isActiveSideEnd = true;
            this.start.line = this.end.line = line;
            this.start.character = this.end.character = character;
        }

        // Reset cursor blink
        this.isBlinkVisible = true;
        if (this.isVisible) {
            this.startBlinking();
        }
    }

    getPosition() {
        if (this.isActiveSideEnd) {
            return {
                character: this.end.character,
                line: this.end.line
            };
        } else {
            return {
                character: this.start.character,
                line: this.start.line
            };
        }
    }

    setVisible(isVisible) {
        if (this.isVisible != isVisible) {
            this.isVisible = isVisible;
            if (isVisible) {
                this.isBlinkVisible = true;
                this.startBlinking();
            } else {
                this.stopBlinking();
            }
            this.editor.draw();
        }
    }

    startBlinking() {
        clearInterval(this.blinkIntervalHandle);
        this.blinkIntervalHandle = setInterval(this.blink.bind(this), this.blinkInterval);
        this.editor.draw();
    }

    stopBlinking() {
        clearInterval(this.blinkIntervalHandle);
    }

    blink() {
        this.isBlinkVisible = !this.isBlinkVisible;
        const firstLine = Math.min(this.start.line, this.end.line);
        const lastLine = Math.max(this.start.line, this.end.line);
        this.editor.draw({
            lineStart: firstLine,
            lineEnd: lastLine
        });
    }

    moveUp(length, keepSelection) {
        length = length || 1;
        const position = this.getPosition();
        this.setPosition(position.line - length, null, keepSelection);
    }

    moveDown(length, keepSelection) {
        length = length || 1;
        const position = this.getPosition();
        this.setPosition(position.line + length, null, keepSelection);
    }

    moveLeft(length, keepSelection) {
        length = length || 1;
        const position = this.getPosition();
        this.setPosition(position.line, position.character - length, keepSelection);
    }

    moveRight(length, keepSelection) {
        length = length || 1;
        const position = this.getPosition();
        this.setPosition(position.line, position.character + length, keepSelection);
    }

    moveLineStart(keepSelection) {
        const position = this.getPosition();
        this.setPosition(position.line, 0, keepSelection);
    }

    moveLineEnd(keepSelection) {
        const position = this.getPosition();
        this.setPosition(position.line, this.editor.document.getLineCharacterCount(position.line), keepSelection);
    }
}

export default TextSelection;