export enum TokenType {
    // Keywords
    Keyword,

    // Identifiers and literals
    Identifier,
    String,
    Number,
    Boolean,
    Symbol,       // :name
    Reference,    // .name

    // Operators
    Arrow,        // ->
    Range,        // ..

    // Delimiters
    OpenBracket,  // [
    CloseBracket, // ]
    Equals,       // =
    Dot,          // .
    Comma,        // ,
    Colon,        // :

    // Indentation
    Indent,
    Dedent,
    Newline,

    EOF
}

// A22 Keywords
export const KEYWORDS = new Set([
    'agent', 'tool', 'workflow', 'policy', 'provider', 'capability',
    'can', 'use', 'do', 'has', 'is', 'when', 'needs',
    'steps', 'parallel', 'branch', 'loop', 'break', 'continue', 'return',
    'import', 'from', 'test', 'given', 'expect',
    'schedule', 'every', 'at', 'in', 'run',
    'human_in_loop', 'show', 'ask', 'options',
    'state', 'prompt', 'remembers', 'isolation',
    'validates', 'sandbox', 'auth', 'config', 'limits',
    'allow', 'deny', 'primary', 'fallback', 'strategy'
]);

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
    private indentStack: number[] = [0];
    private pendingTokens: Token[] = [];
    private atLineStart = true;

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

        // Emit remaining DEDENT tokens
        while (this.indentStack.length > 1) {
            this.indentStack.pop();
            tokens.push(this.token(TokenType.Dedent, ''));
        }

        tokens.push(token); // Push EOF
        return tokens;
    }

    private nextToken(): Token {
        // Return pending tokens first (for INDENT/DEDENT)
        if (this.pendingTokens.length > 0) {
            return this.pendingTokens.shift()!;
        }

        // Handle indentation at line start
        if (this.atLineStart) {
            this.atLineStart = false;
            const indentLevel = this.measureIndent();
            const currentIndent = this.indentStack[this.indentStack.length - 1];

            if (indentLevel > currentIndent) {
                this.indentStack.push(indentLevel);
                return this.token(TokenType.Indent, '');
            } else if (indentLevel < currentIndent) {
                // Emit DEDENTs for all levels we're closing
                while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indentLevel) {
                    this.indentStack.pop();
                    this.pendingTokens.push(this.token(TokenType.Dedent, ''));
                }
                return this.pendingTokens.shift()!;
            }
        }

        this.skipWhitespaceExceptNewline();

        if (this.pos >= this.input.length) {
            return this.token(TokenType.EOF, "");
        }

        const char = this.peek();

        // Handle newlines
        if (char === '\n') {
            this.advance();
            this.line++;
            this.col = 1;
            this.atLineStart = true;
            return this.token(TokenType.Newline, '\n');
        }

        // Handle comments
        if (char === '#') {
            while (this.pos < this.input.length && this.peek() !== '\n') {
                this.advance();
            }
            return this.nextToken();
        }

        // Symbol: :name
        if (char === ':' && this.pos + 1 < this.input.length && /[a-zA-Z_]/.test(this.input[this.pos + 1])) {
            return this.readSymbol();
        }

        // Reference: .name
        if (char === '.' && this.pos + 1 < this.input.length && /[a-zA-Z_]/.test(this.input[this.pos + 1])) {
            return this.readReference();
        }

        // Arrow: ->
        if (char === '-' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '>') {
            const token = { type: TokenType.Arrow, value: '->', line: this.line, column: this.col };
            this.advance();
            this.advance();
            return token;
        }

        // Range: ..
        if (char === '.' && this.pos + 1 < this.input.length && this.input[this.pos + 1] === '.') {
            const token = { type: TokenType.Range, value: '..', line: this.line, column: this.col };
            this.advance();
            this.advance();
            return token;
        }

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
            case '[': return this.advanceToken(TokenType.OpenBracket, "[");
            case ']': return this.advanceToken(TokenType.CloseBracket, "]");
            case '=': return this.advanceToken(TokenType.Equals, "=");
            case '.': return this.advanceToken(TokenType.Dot, ".");
            case ',': return this.advanceToken(TokenType.Comma, ",");
            case ':': return this.advanceToken(TokenType.Colon, ":");
        }

        throw new Error(`Unexpected character '${char}' at ${this.line}:${this.col}`);
    }

    private measureIndent(): number {
        let indent = 0;
        while (this.pos < this.input.length) {
            const char = this.input[this.pos];
            if (char === ' ') {
                indent++;
                this.advance();
            } else if (char === '\t') {
                indent += 4; // Treat tab as 4 spaces
                this.advance();
            } else {
                break;
            }
        }
        return indent;
    }

    private readSymbol(): Token {
        const start = { line: this.line, col: this.col };
        this.advance(); // Skip ':'
        let val = ":";
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
            val += this.advance();
        }
        return { type: TokenType.Symbol, value: val, line: start.line, column: start.col };
    }

    private readReference(): Token {
        const start = { line: this.line, col: this.col };
        this.advance(); // Skip '.'
        let val = ".";
        while (this.pos < this.input.length && /[a-zA-Z0-9_]/.test(this.peek())) {
            val += this.advance();
        }
        return { type: TokenType.Reference, value: val, line: start.line, column: start.col };
    }

    private skipWhitespaceExceptNewline() {
        while (this.pos < this.input.length) {
            const char = this.peek();
            if (char === ' ' || char === '\t') {
                this.advance();
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

        if (KEYWORDS.has(val)) {
            return { type: TokenType.Keyword, value: val, line: start.line, column: start.col };
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
