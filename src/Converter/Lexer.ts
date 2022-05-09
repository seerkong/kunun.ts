
import { Token, TokenType } from "./Token";



export class Lexer {
    private text : string;
    private pos : number;
    private currentChar;

    constructor(text) {
        this.text = text;
        this.pos = 0;
        this.currentChar = this.text[this.pos];
    }

    static create(text) {
        return new this(text);
    }

    error() {
        throw new Error('Lexical error');
    }

    advance() {
        if (this.pos > this.text.length - 1) {
            this.error();
        }

        this.pos++;
        this.currentChar = this.text[this.pos];
    }

    skipWhitespaces() {
        while (this.currentChar && /\s/.test(this.currentChar)) {
            this.advance();
        }
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
            this.advance();
        }
        return matchResult[0];
    }

    Word() {
        // let re = /^[_a-zA-Z=><@\+\-\*\/\.:][_a-zA-Z0-9=><@\+\-\*\/\.:]*/ig; 
        // let re = /^[_a-zA-Z=><@\+\-\*\/][_a-zA-Z0-9=><@\+\-\*\/]*/ig;
        let re = /^[_a-zA-Z=@\+\-\*\/][_a-zA-Z0-9=@\+\-\*\/]*/ig; 
        let restText = this.text.slice(this.pos);
        let matchResult = restText.match(re);
        if (matchResult.length <= 0) {
            throw new Error("word syntax error");
        }
        let matchLen = matchResult[0].length;
        for (let i = 0; i < matchLen; i++) {
            this.advance();
        }
        return matchResult[0];
    }

    Number() {
        let result = '';
        while (/[\d\.]/.test(this.currentChar)) {
            result += this.currentChar;
            this.advance();
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
            this.error();
        }

        for (let i = 0; i < expectedStr.length; i++) {
            if (this.currentChar !== expectedStr[i]) {
                this.error();
            }
            this.advance();
        }

        return expectedStr === 'true';
    }

    getNextToken() {
        while (this.currentChar) {
            if (/\s/.test(this.currentChar)) {
                this.skipWhitespaces();
                continue;
            }

            if (this.currentChar === '{') {
                this.advance();
                return Token.Create(TokenType.BeginCurlyBracket, '{')
            }

            if (this.currentChar === '}') {
                this.advance();
                return Token.Create(TokenType.EndCurlyBracket, '}')
            }

            if (this.currentChar === '[') {
                this.advance();
                return Token.Create(TokenType.BeginBracket, '[');
            }

            if (this.currentChar === ']') {
                this.advance();
                return Token.Create(TokenType.EndBracket, ']');
            }

            if (this.currentChar === '(') {
                this.advance();
                return Token.Create(TokenType.BeginParenthese, '(');
            }

            if (this.currentChar === ')') {
                this.advance();
                return Token.Create(TokenType.EndParenthese, ')');
            }
            if (this.currentChar === '~') {
                this.advance();
                return Token.Create(TokenType.Tilde, '~');
            }
            if (this.currentChar === '?') {
                this.advance();
                return Token.Create(TokenType.QuestionMark, '?');
            }
            if (this.currentChar === '!') {
                this.advance();
                return Token.Create(TokenType.ExclamationMark, '?');
            }
            if (this.currentChar === '%') {
                this.advance();
                return Token.Create(TokenType.Percent, '%');
            }
            if (this.currentChar === '$') {
                this.advance();
                return Token.Create(TokenType.Dollar, '$');
            }
            if (this.currentChar === ':') {
                this.advance();
                return Token.Create(TokenType.Colon, ':');
            }
            if (this.currentChar === ';') {
                this.advance();
                return Token.Create(TokenType.Semicolon, ';');
            }

            if (this.currentChar === ',') {
                this.advance();
                return Token.Create(TokenType.Comma, ',');
            }
            if (this.currentChar === '`') {
                this.advance();
                return Token.Create(TokenType.QuasiQuote, '`');
            }
            if (this.currentChar === '.') {
                this.advance();
                if (this.currentChar === ':') {
                    this.advance();
                    return Token.Create(TokenType.Subscript, '.:');
                }
                if (this.currentChar === '.') {
                    this.advance();
                    if (this.currentChar === '.') {
                        this.advance();
                        return Token.Create(TokenType.Word, '...');
                    }
                    else {
                        return Token.Create(TokenType.UnquoteSplicing, '..');
                    }
                }
                else {
                    return Token.Create(TokenType.Property, '.');
                }
            }
            if (this.currentChar === '@') {
                this.advance();
                return Token.Create(TokenType.At, '@');
            }
            if (this.currentChar === '=') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return Token.Create(TokenType.Word, '==');
                }
                else {
                    return Token.Create(TokenType.Equal, '=');
                }
            }
            if (this.currentChar === '&') {
                this.advance();
                return Token.Create(TokenType.Ampersand, '&');
            }
            if (this.currentChar === '<') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return Token.Create(TokenType.Word, '<=');
                }
                return Token.Create(TokenType.LowerThan, '<');
            }
            if (this.currentChar === '>') {
                this.advance();
                if (this.currentChar === '=') {
                    this.advance();
                    return Token.Create(TokenType.Word, '>=');
                }
                return Token.Create(TokenType.BiggerThan, '>');
            }
            

            if (/\d/.test(this.currentChar)) {
                return Token.Create(TokenType.Number, this.Number());
            }

            if (/\"/.test(this.currentChar)) {
                return Token.Create(TokenType.String, this.String());
            }
            

            if (/[_a-zA-Z=@\+\-\*\/\$]/.test(this.currentChar)) {
                let wordStr = this.Word();
                if (wordStr === 'true' || wordStr === 'false') {
                    return Token.Create(TokenType.Boolean, wordStr);
                }
                else if (wordStr === 'ukn') {
                    return Token.Create(TokenType.Ukn, wordStr);
                }
                else if (wordStr === 'nil' || wordStr === 'null') {
                    return Token.Create(TokenType.Nil, wordStr);
                }
                else if (wordStr === 'undefined') {
                    return Token.Create(TokenType.Undefined, wordStr);
                }
                else {
                    return Token.Create(TokenType.Word, wordStr);
                }
            }

            this.error();
        }

        return Token.Create(TokenType.Eof);
    }
}
