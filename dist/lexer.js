export var TokenType;
(function (TokenType) {
    TokenType[TokenType["Identifier"] = 0] = "Identifier";
    TokenType[TokenType["String"] = 1] = "String";
    TokenType[TokenType["Number"] = 2] = "Number";
    TokenType[TokenType["Boolean"] = 3] = "Boolean";
    TokenType[TokenType["OpenBrace"] = 4] = "OpenBrace";
    TokenType[TokenType["CloseBrace"] = 5] = "CloseBrace";
    TokenType[TokenType["OpenBracket"] = 6] = "OpenBracket";
    TokenType[TokenType["CloseBracket"] = 7] = "CloseBracket";
    TokenType[TokenType["Equals"] = 8] = "Equals";
    TokenType[TokenType["Dot"] = 9] = "Dot";
    TokenType[TokenType["Comma"] = 10] = "Comma";
    TokenType[TokenType["EOF"] = 11] = "EOF";
})(TokenType || (TokenType = {}));
export class Lexer {
    constructor(input) {
        this.pos = 0;
        this.line = 1;
        this.col = 1;
        this.input = input;
    }
    tokenize() {
        const tokens = [];
        let token = this.nextToken();
        while (token.type !== TokenType.EOF) {
            tokens.push(token);
            token = this.nextToken();
        }
        tokens.push(token); // Push EOF
        return tokens;
    }
    nextToken() {
        this.skipWhitespace();
        if (this.pos >= this.input.length) {
            return this.token(TokenType.EOF, "");
        }
        const char = this.peek();
        if (/[a-zA-Z_]/.test(char)) {
            return this.readIdentifier();
        }
        if (/[0-9]/.test(char)) {
            return this.readNumber();
        }
        if (char === '"') {
            return this.readString();
        }
        switch (char) {
            case '{': return this.advanceToken(TokenType.OpenBrace, "{");
            case '}': return this.advanceToken(TokenType.CloseBrace, "}");
            case '[': return this.advanceToken(TokenType.OpenBracket, "[");
            case ']': return this.advanceToken(TokenType.CloseBracket, "]");
            case '=': return this.advanceToken(TokenType.Equals, "=");
            case '.': return this.advanceToken(TokenType.Dot, ".");
            case ',': return this.advanceToken(TokenType.Comma, ",");
        }
        throw new Error(`Unexpected character '${char}' at ${this.line}:${this.col}`);
    }
    skipWhitespace() {
        while (this.pos < this.input.length) {
            const char = this.peek();
            if (char === ' ' || char === '\t') {
                this.advance();
            }
            else if (char === '\n') {
                this.advance();
                this.line++;
                this.col = 1;
            }
            else if (char === '#') { // Comment
                while (this.pos < this.input.length && this.peek() !== '\n') {
                    this.advance();
                }
            }
            else {
                break;
            }
        }
    }
    readIdentifier() {
        const start = { line: this.line, col: this.col };
        let val = "";
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
            val += this.advance();
        }
        if (val === "true" || val === "false") {
            return { type: TokenType.Boolean, value: val, line: start.line, column: start.col };
        }
        return { type: TokenType.Identifier, value: val, line: start.line, column: start.col };
    }
    readNumber() {
        const start = { line: this.line, col: this.col };
        let val = "";
        while (this.pos < this.input.length && /[0-9.]/.test(this.peek())) {
            val += this.advance();
        }
        return { type: TokenType.Number, value: val, line: start.line, column: start.col };
    }
    readString() {
        const start = { line: this.line, col: this.col };
        this.advance(); // Skip opening quote
        let val = "";
        while (this.pos < this.input.length && this.peek() !== '"') {
            val += this.advance();
        }
        this.advance(); // Skip closing quote
        return { type: TokenType.String, value: val, line: start.line, column: start.col };
    }
    advanceToken(type, val) {
        const token = { type, value: val, line: this.line, column: this.col };
        this.advance();
        return token;
    }
    advance() {
        const char = this.input[this.pos];
        this.pos++;
        this.col++;
        return char;
    }
    peek() {
        return this.input[this.pos];
    }
    token(type, value) {
        return { type, value, line: this.line, column: this.col };
    }
}
