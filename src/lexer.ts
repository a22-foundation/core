export enum TokenType {
    Identifier,
    String,
    Number,
    Boolean,
    OpenBrace,    // {
    CloseBrace,   // }
    OpenBracket,  // [
    CloseBracket, // ]
    Equals,       // =
    Dot,          // .
    Comma,        // ,
    EOF
}

export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}

export class Lexer {
    private input: string;
    private pos = 0;
    private line = 1;
    private col = 1;

    constructor(input: string) {
        this.input = input;
    }

    tokenize(): Token[] {
        const tokens: Token[] = [];
        let token = this.nextToken();
        while (token.type !== TokenType.EOF) {
            tokens.push(token);
            token = this.nextToken();
        }
        tokens.push(token); // Push EOF
        return tokens;
    }

    private nextToken(): Token {
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

    private skipWhitespace() {
        while (this.pos < this.input.length) {
            const char = this.peek();
            if (char === ' ' || char === '\t') {
                this.advance();
            } else if (char === '\n') {
                this.advance();
                this.line++;
                this.col = 1;
            } else if (char === '#') { // Comment
                while (this.pos < this.input.length && this.peek() !== '\n') {
                    this.advance();
                }
            } else {
                break;
            }
        }
    }

    private readIdentifier(): Token {
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

    private readNumber(): Token {
        const start = { line: this.line, col: this.col };
        let val = "";
        while (this.pos < this.input.length && /[0-9.]/.test(this.peek())) {
            val += this.advance();
        }
        return { type: TokenType.Number, value: val, line: start.line, column: start.col };
    }

    private readString(): Token {
        const start = { line: this.line, col: this.col };
        this.advance(); // Skip opening quote
        let val = "";
        while (this.pos < this.input.length && this.peek() !== '"') {
            val += this.advance();
        }
        this.advance(); // Skip closing quote
        return { type: TokenType.String, value: val, line: start.line, column: start.col };
    }

    private advanceToken(type: TokenType, val: string): Token {
        const token = { type, value: val, line: this.line, column: this.col };
        this.advance();
        return token;
    }

    private advance(): string {
        const char = this.input[this.pos];
        this.pos++;
        this.col++;
        return char;
    }

    private peek(): string {
        return this.input[this.pos];
    }

    private token(type: TokenType, value: string): Token {
        return { type, value, line: this.line, column: this.col };
    }
}
