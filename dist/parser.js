import { TokenType } from './lexer.js';
export class A22Parser {
    constructor(tokens) {
        this.current = 0;
        this.tokens = tokens;
    }
    parse() {
        const blocks = [];
        while (!this.isAtEnd()) {
            blocks.push(this.parseBlock());
        }
        return { kind: "Program", blocks };
    }
    parseBlock() {
        const typeToken = this.consume(TokenType.Identifier, "Expect block type."); // e.g. agent
        let identifier = "";
        if (this.match(TokenType.String)) {
            identifier = this.previous().value;
        }
        else if (this.match(TokenType.Identifier)) {
            identifier = this.previous().value;
        }
        // If neither, identifier is empty (anonymous block like 'inputs')
        let label;
        // Check for optional second label if needed
        this.consume(TokenType.OpenBrace, "Expect '{' after block header.");
        const attributes = [];
        const children = [];
        while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
            // Heuristic: If it looks like `key = val` it's an attribute.
            // If it looks like `type "name" {` it's a nested block.
            // Lookahead
            if (this.check(TokenType.Identifier) && this.checkNext(TokenType.Equals)) {
                attributes.push(this.parseAttribute());
            }
            else if (this.check(TokenType.Identifier)) {
                children.push(this.parseBlock());
            }
            else {
                // Error or comments
                throw this.error(this.peek(), "Expect attribute or nested block.");
            }
        }
        this.consume(TokenType.CloseBrace, "Expect '}' after block body.");
        return {
            kind: "Block",
            type: typeToken.value,
            identifier,
            label: label || undefined,
            attributes,
            children
        };
    }
    parseAttribute() {
        const key = this.consume(TokenType.Identifier, "Expect attribute key.").value;
        this.consume(TokenType.Equals, "Expect '=' after attribute key.");
        const value = this.parseExpression();
        return { kind: "Attribute", key, value };
    }
    parseExpression() {
        if (this.match(TokenType.String))
            return { kind: "Literal", value: this.previous().value, raw: `"${this.previous().value}"` };
        if (this.match(TokenType.Number))
            return { kind: "Literal", value: parseFloat(this.previous().value), raw: this.previous().value };
        if (this.match(TokenType.Boolean))
            return { kind: "Literal", value: this.previous().value === "true", raw: this.previous().value };
        if (this.match(TokenType.OpenBracket))
            return this.parseList();
        if (this.match(TokenType.OpenBrace))
            return this.parseMap();
        // References: tool.search or agent.name.attr
        if (this.check(TokenType.Identifier)) {
            return this.parseReference();
        }
        throw this.error(this.peek(), "Expect expression.");
    }
    parseList() {
        const elements = [];
        if (!this.check(TokenType.CloseBracket)) {
            do {
                elements.push(this.parseExpression());
            } while (this.match(TokenType.Comma));
        }
        this.consume(TokenType.CloseBracket, "Expect ']' after list.");
        return { kind: "List", elements };
    }
    parseMap() {
        const properties = [];
        if (!this.check(TokenType.CloseBrace)) {
            // In HCL map: key = value. Newlines are separators usually but we treat comma or just repeated pairs
            // For simplicity, let's assume comma or just loop
            while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
                const key = this.consume(TokenType.Identifier, "Expect map key.").value;
                this.consume(TokenType.Equals, "Expect '='.");
                const value = this.parseExpression();
                properties.push({ key, value });
                // Optional comma
                this.match(TokenType.Comma);
            }
        }
        this.consume(TokenType.CloseBrace, "Expect '}' after map.");
        return { kind: "Map", properties };
    }
    parseReference() {
        const path = [];
        path.push(this.consume(TokenType.Identifier, "Expect identifier.").value);
        while (this.match(TokenType.Dot)) {
            path.push(this.consume(TokenType.Identifier, "Expect identifier after dot.").value);
        }
        return { kind: "Reference", path };
    }
    // Helpers
    match(type) {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }
    check(type) {
        if (this.isAtEnd())
            return false;
        return this.peek().type === type;
    }
    checkNext(type) {
        if (this.current + 1 >= this.tokens.length)
            return false;
        return this.tokens[this.current + 1].type === type;
    }
    advance() {
        if (!this.isAtEnd())
            this.current++;
        return this.previous();
    }
    isAtEnd() {
        return this.peek().type === TokenType.EOF;
    }
    peek() {
        return this.tokens[this.current] || this.tokens[this.tokens.length - 1]; // Ensure we return EOF token if OoB
    }
    previous() {
        return this.tokens[this.current - 1] || this.tokens[0];
    }
    consume(type, message) {
        if (this.check(type))
            return this.advance();
        throw this.error(this.peek(), message);
    }
    error(token, message) {
        return new Error(`[line ${token.line}] Error at '${token.value}': ${message}`);
    }
}
