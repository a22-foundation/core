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
        // Optional Label implementation
        if (identifier !== "" && (this.check(TokenType.String) || this.check(TokenType.Identifier))) {
            if (this.match(TokenType.String)) {
                label = this.previous().value;
            }
            else {
                label = this.advance().value;
            }
        }
        this.consume(TokenType.OpenBrace, "Expect '{' after block header.");
        const attributes = [];
        const children = [];
        while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
            // Heuristic: If it looks like `key = val` it's an attribute.
            // If it looks like `type "name" {` it's a nested block.
            // Lookahead
            if (this.check(TokenType.Identifier) && (this.checkNext(TokenType.Equals) || this.checkNext(TokenType.Colon))) {
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
        if (this.match(TokenType.Colon)) {
            // consumed colon
        }
        else {
            this.consume(TokenType.Equals, "Expect '=' or ':' after attribute key.");
        }
        const value = this.parseExpression();
        return { kind: "Attribute", key, value };
    }
    parseExpression() {
        if (this.match(TokenType.String)) {
            const value = this.previous().value;
            // Security: Validate that strings don't contain literal credentials
            this.validateNotCredential(value);
            return { kind: "Literal", value, raw: `"${value}"` };
        }
        if (this.match(TokenType.Number))
            return { kind: "Literal", value: parseFloat(this.previous().value), raw: this.previous().value };
        if (this.match(TokenType.Boolean))
            return { kind: "Literal", value: this.previous().value === "true", raw: this.previous().value };
        if (this.match(TokenType.OpenBracket))
            return this.parseList();
        if (this.match(TokenType.OpenBrace))
            return this.parseMap();
        // References: tool.search
        // OR BlockExpression: tool "name" { ... }
        if (this.check(TokenType.Identifier)) {
            // Lookahead to distinguish Reference (dot) from BlockExpr (string or brace)
            if (this.checkNext(TokenType.Dot)) {
                return this.parseReference();
            }
            // It might be a BlockExpression (constructor)
            if (this.checkNext(TokenType.String) || this.checkNext(TokenType.OpenBrace)) {
                return this.parseBlockExpression();
            }
            // Simple identifier reference
            return this.parseReference(); // single identifier ref
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
            while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
                // In A22, maps can be simple `a = 1` or `a: 1`
                const key = this.consume(TokenType.Identifier, "Expect map key.").value;
                if (this.match(TokenType.Colon)) {
                    // ok
                }
                else {
                    this.consume(TokenType.Equals, "Expect '=' or ':'");
                }
                const value = this.parseExpression();
                properties.push({ key, value });
                this.match(TokenType.Comma);
            }
        }
        this.consume(TokenType.CloseBrace, "Expect '}' after map.");
        return { kind: "Map", properties };
    }
    parseBlockExpression() {
        // We already know it starts with Identifier
        const type = this.consume(TokenType.Identifier, "Expect block type").value;
        let identifier;
        if (this.match(TokenType.String)) {
            identifier = this.previous().value;
        }
        // Parse the body as a Block, but we need to return BlockExpression
        // Reuse parseBlock logic? parseBlock expects `type` to be current... 
        // Actually `parseBlock` consumes type.
        // Let's manually parse the body.
        this.consume(TokenType.OpenBrace, "Expect '{'");
        // Use a dummy block to reuse attribute parsing logic or allow standard block body?
        // Standard block body: attributes or nested blocks.
        const attributes = [];
        const children = [];
        while (!this.check(TokenType.CloseBrace) && !this.isAtEnd()) {
            if (this.check(TokenType.Identifier) && (this.checkNext(TokenType.Equals) || this.checkNext(TokenType.Colon))) {
                attributes.push(this.parseAttribute());
            }
            else if (this.check(TokenType.Identifier)) {
                children.push(this.parseBlock());
            }
            else {
                throw this.error(this.peek(), "Expect attribute or nested block.");
            }
        }
        this.consume(TokenType.CloseBrace, "Expect '}'");
        return {
            kind: "BlockExpression",
            type,
            identifier,
            body: {
                kind: "Block", type, identifier: identifier || "", attributes, children
            }
        };
    }
    parseReference() {
        const path = [];
        path.push(this.consume(TokenType.Identifier, "Expect identifier.").value);
        while (this.match(TokenType.Dot)) {
            path.push(this.consume(TokenType.Identifier, "Expect identifier after dot.").value);
        }
        return { kind: "Reference", path };
    }
    // Security validation
    validateNotCredential(value) {
        // Check for common credential patterns
        const credentialPatterns = [
            /^sk-/i, // OpenAI/Stripe style: sk-...
            /^api_/i, // Common API key prefix
            /^key_/i, // Common key prefix
            /^secret_/i, // Common secret prefix
            /^token_/i, // Common token prefix
            /^Bearer /i, // Bearer tokens
            /^[A-Za-z0-9_-]{32,}$/, // Long alphanumeric strings (likely keys)
        ];
        for (const pattern of credentialPatterns) {
            if (pattern.test(value)) {
                throw new Error(`Security Error: Literal credential detected. ` +
                    `Use environment references (env.VAR_NAME) or secrets references (secrets.KEY_NAME) instead. ` +
                    `Never include literal API keys or secrets in .a22 files.`);
            }
        }
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
