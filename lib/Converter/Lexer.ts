
import { Token, TokenType } from "./Token";



export class Lexer {
    private text : string;
    private pos : number;
    private line : number;
    private column : number;
    private currentChar;

    constructor(text) {
        this.text = text;
        this.pos = 0;
        this.line = 1;
        this.column = 0;
        this.currentChar = this.text[this.pos];
    }

    static Create(text) {
        return new this(text);
    }

    Error(line, column) {
        throw new Error('Lexical error');
    }

    Advance() {
        if (this.pos > this.text.length - 1) {
            this.Error(this.line, this.column);
        }
        if (this.currentChar == "\n") {
            this.line += 1;
            this.column = 0;
        } else {
            this.column += 1;
        }

        this.pos++;
        this.currentChar = this.text[this.pos];
    }

    SkipWhitespaces() {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            this.Advance();
        }
    }

    SkipComment() {
        while (this.currentChar && this.currentChar != "\n") {
            this.Advance();
        }
    }

    Peek(resultLength = 1, skipLength = 0) {
        if (skipLength < 0 || resultLength < 0
            || (this.pos + skipLength + resultLength > this.text.length - 1)) {
            return null;
        }
        let result = this.text.slice(this.pos + skipLength, this.pos + skipLength + resultLength);
        return result;
    }

    String() {
        let re = /^("(((?=\\)\\(["\\\/bfnrt]|u[0-9a-fA-F]{4}))|[^"\\\0-\x1F\x7F]+)*")/ig; 
        let restText = this.text.slice(this.pos);
        let matchResult = restText.match(re);
        if (matchResult.length <= 0) {
            throw new Error("string syntax error");
        }
        let matchLen = matchResult[0].length;
        for (let i = 0; i < matchLen; i++) {
            this.Advance();
        }
        let text = matchResult[0];
        let parsedText = JSON.parse(text);
        return parsedText;
    }

    RawString() {
        let re = /^'(.*)'/ig; 
        let restText = this.text.slice(this.pos);
        let matchResult = restText.match(re);
        if (matchResult.length <= 0) {
            throw new Error("string syntax error");
        }
        let matchLen = matchResult[0].length;
        for (let i = 0; i < matchLen; i++) {
            this.Advance();
        }
        let text = matchResult[0];
        let parsedText = text.substring(1, matchLen - 1);
        return parsedText;
    }

    Word() {
        // let re = /^[_a-zA-Z=><@\+\-\*\/\.:][_a-zA-Z0-9=><@\+\-\*\/\.:]*/ig; 
        // let re = /^[_a-zA-Z=><@\+\-\*\/][_a-zA-Z0-9=><@\+\-\*\/]*/ig;
        let re = /^[_a-zA-Z=\+\-\*\/][_a-zA-Z0-9=\+\-\*\/]*/ig; 
        let restText = this.text.slice(this.pos);
        let matchResult = restText.match(re);
        if (matchResult.length <= 0) {
            throw new Error("word syntax error");
        }
        let matchLen = matchResult[0].length;
        for (let i = 0; i < matchLen; i++) {
            this.Advance();
        }
        return matchResult[0];
    }

    Number() {
        let result = '';
        while (/[\d\.]/.test(this.currentChar)) {
            result += this.currentChar;
            this.Advance();
        }
        return Number(result);
    }

    Boolean() {
        let expectedStr = '';
        if (this.currentChar === 'f') {
            expectedStr = 'false';
        } else if (this.currentChar === 't') {
            expectedStr = 'true';
        } else {
            this.Error(this.line, this.column);
        }

        for (let i = 0; i < expectedStr.length; i++) {
            if (this.currentChar !== expectedStr[i]) {
                this.Error(this.line, this.column);
            }
            this.Advance();
        }

        return expectedStr === 'true';
    }

    getNextToken() {
        while (this.currentChar) {
            let currentLine = this.line;
            let currentColumn = this.column;

            if (/\s/.test(this.currentChar)) {
                this.SkipWhitespaces();
                continue;
            }
            if (this.currentChar === '#') {
                this.SkipComment();
                continue;
            }

            if (this.currentChar === '{') {
                this.Advance();
                return Token.Create(TokenType.BeginCurlyBracket, '{', currentLine, currentColumn)
            }

            if (this.currentChar === '}') {
                this.Advance();
                return Token.Create(TokenType.EndCurlyBracket, '}', currentLine, currentColumn)
            }

            if (this.currentChar === '[') {
                this.Advance();
                return Token.Create(TokenType.BeginBracket, '[', currentLine, currentColumn);
            }

            if (this.currentChar === ']') {
                this.Advance();
                return Token.Create(TokenType.EndBracket, ']', currentLine, currentColumn);
            }

            if (this.currentChar === '(') {
                this.Advance();
                return Token.Create(TokenType.BeginParenthese, '(', currentLine, currentColumn);
            }

            if (this.currentChar === ')') {
                this.Advance();
                return Token.Create(TokenType.EndParenthese, ')', currentLine, currentColumn);
            }
            if (this.currentChar === '~') {
                this.Advance();
                return Token.Create(TokenType.Tilde, '~', currentLine, currentColumn);
            }
            if (this.currentChar === '?') {
                this.Advance();
                return Token.Create(TokenType.QuestionMark, '?', currentLine, currentColumn);
            }
            if (this.currentChar === '!') {
                this.Advance();
                return Token.Create(TokenType.ExclamationMark, '?', currentLine, currentColumn);
            }
            if (this.currentChar === '%') {
                this.Advance();
                return Token.Create(TokenType.Percent, '%', currentLine, currentColumn);
            }
            if (this.currentChar === '$') {
                this.Advance();
                return Token.Create(TokenType.Dollar, '$', currentLine, currentColumn);
            }
            if (this.currentChar === ':') {
                this.Advance();
                return Token.Create(TokenType.Colon, ':', currentLine, currentColumn);
            }
            if (this.currentChar === ';') {
                this.Advance();
                return Token.Create(TokenType.Semicolon, ';', currentLine, currentColumn);
            }
            if (this.currentChar === '^') {
                this.Advance();
                return Token.Create(TokenType.UpArrow, '^', currentLine, currentColumn);
            }

            if (this.currentChar === ',') {
                this.Advance();
                return Token.Create(TokenType.Comma, ',', currentLine, currentColumn);
            }
            if (this.currentChar === '`') {
                this.Advance();
                return Token.Create(TokenType.QuasiQuote, '`', currentLine, currentColumn);
            }
            if (this.currentChar === '.') {
                this.Advance();
                if (this.currentChar === ':') {
                    this.Advance();
                    return Token.Create(TokenType.Subscript, '.:', currentLine, currentColumn);
                }
                if (this.currentChar === '.') {
                    this.Advance();
                    if (this.currentChar === '.') {
                        this.Advance();
                        return Token.Create(TokenType.Word, '...', currentLine, currentColumn);
                    }
                    else {
                        return Token.Create(TokenType.UnquoteExpand, '..', currentLine, currentColumn);
                    }
                }
                else {
                    return Token.Create(TokenType.Property, '.', currentLine, currentColumn);
                }
            }
            if (this.currentChar === '@') {
                this.Advance();
                return Token.Create(TokenType.At, '@', currentLine, currentColumn);
            }
            if (this.currentChar === '=') {
                this.Advance();
                if (this.currentChar === '=') {
                    this.Advance();
                    return Token.Create(TokenType.Word, '==', currentLine, currentColumn);
                }
                else {
                    return Token.Create(TokenType.Equal, '=', currentLine, currentColumn);
                }
            }
            if (this.currentChar === '&') {
                this.Advance();
                return Token.Create(TokenType.Ampersand, '&', currentLine, currentColumn);
            }
            if (this.currentChar === '<') {
                this.Advance();
                if (this.currentChar === '=') {
                    this.Advance();
                    return Token.Create(TokenType.Word, '<=', currentLine, currentColumn);
                }
                return Token.Create(TokenType.LowerThan, '<', currentLine, currentColumn);
            }
            if (this.currentChar === '>') {
                this.Advance();
                if (this.currentChar === '=') {
                    this.Advance();
                    return Token.Create(TokenType.Word, '>=', currentLine, currentColumn);
                }
                return Token.Create(TokenType.BiggerThan, '>', currentLine, currentColumn);
            }
            

            if (/\d/.test(this.currentChar)) {
                return Token.Create(TokenType.Number, this.Number(), currentLine, currentColumn);
            }

            if (/\"/.test(this.currentChar)) {
                return Token.Create(TokenType.String, this.String(), currentLine, currentColumn);
            }

            if (/'/.test(this.currentChar)) {
                return Token.Create(TokenType.String, this.RawString(), currentLine, currentColumn);
            }
            

            if (/[_a-zA-Z=@\+\-\*\/\$]/.test(this.currentChar)) {
                let wordStr = this.Word();
                if (wordStr === 'true' || wordStr === 'false') {
                    return Token.Create(TokenType.Boolean, wordStr, currentLine, currentColumn);
                }
                else if (wordStr === 'ukn') {
                    return Token.Create(TokenType.Ukn, wordStr, currentLine, currentColumn);
                }
                else if (wordStr === 'nil' || wordStr === 'null') {
                    return Token.Create(TokenType.Nil, wordStr, currentLine, currentColumn);
                }
                else if (wordStr === 'undefined') {
                    return Token.Create(TokenType.Undefined, wordStr, currentLine, currentColumn);
                }
                else {
                    return Token.Create(TokenType.Word, wordStr, currentLine, currentColumn);
                }
            }

            this.Error(currentLine, currentColumn);
        }

        return Token.Create(TokenType.Eof);
    }
}
