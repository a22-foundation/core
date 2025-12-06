import { Token, TokenType, KEYWORDS } from './lexer.js';
import * as AST from './ast.js';

export class A22Parser {
    private tokens: Token[];
    private current = 0;

    constructor(tokens: Token[]) {
        // Filter out newlines that are not significant
        this.tokens = tokens;
    }

    parse(): AST.Program {
        const blocks: AST.Block[] = [];

        while (!this.isAtEnd()) {
            this.skipNewlines();
            if (!this.isAtEnd()) {
                blocks.push(this.parseBlock());
            }
        }

        return { kind: "Program", blocks };
    }

    private parseBlock(): AST.Block {
        // Expect keyword (agent, tool, workflow, etc.)
        const typeToken = this.consumeKeyword("Expect block type keyword");
        const type = typeToken.value;

        // Expect string identifier
        let identifier = "";
        if (this.match(TokenType.String)) {
            identifier = this.previous().value;
        }

        // Expect newline and indent
        this.consumeNewline();
        this.consume(TokenType.Indent, "Expect indented block body");

        const attributes: AST.Attribute[] = [];
        const children: AST.Block[] = [];

        // Parse block body
        while (!this.check(TokenType.Dedent) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(TokenType.Dedent)) break;

            // Check if it's a statement (starts with keyword)
            if (this.check(TokenType.Keyword)) {
                const keyword = this.peek().value;

                // Statement keywords
                if (['can', 'use', 'do', 'has', 'when', 'prompt', 'state', 'remembers',
                     'isolation', 'validates', 'sandbox', 'auth', 'steps', 'parallel',
                     'branch', 'loop', 'return', 'given', 'expect', 'show', 'ask',
                     'options', 'timeout', 'default', 'allow', 'deny', 'limits',
                     'every', 'run'].includes(keyword)) {
                    attributes.push(this.parseStatement());
                } else {
                    // Nested block declaration (agent, tool, workflow, etc.)
                    children.push(this.parseBlock());
                }
            } else if (this.check(TokenType.Identifier)) {
                // Attribute assignment (name = value or name: value)
                attributes.push(this.parseAttribute());
            } else {
                this.skipNewlines();
            }
        }

        this.consume(TokenType.Dedent, "Expect dedent after block body");

        return {
            kind: "Block",
            type,
            identifier,
            attributes,
            children
        };
    }

    private parseStatement(): AST.Attribute {
        const keyword = this.advance().value;

        switch (keyword) {
            case 'can':
                return this.parseCanStatement();
            case 'use':
                return this.parseUseStatement();
            case 'do':
                return this.parseDoStatement();
            case 'has':
                return this.parseHasStatement();
            case 'when':
                return this.parseWhenStatement();
            case 'prompt':
                return this.parsePromptStatement();
            case 'state':
                return this.parseStateStatement();
            case 'remembers':
                return this.parseRemembersStatement();
            default:
                // Generic statement - parse as attribute
                return this.parseGenericStatement(keyword);
        }
    }

    private parseCanStatement(): AST.Attribute {
        // can chat, remember, search
        const capabilities: string[] = [];

        do {
            capabilities.push(this.consume(TokenType.Identifier, "Expect capability name").value);
        } while (this.match(TokenType.Comma));

        this.skipNewlines();

        return {
            kind: "Attribute",
            key: "can",
            value: { kind: "List", elements: capabilities.map(c => ({ kind: "Literal", value: c, raw: c })) }
        };
    }

    private parseUseStatement(): AST.Attribute {
        // use model: :gpt4
        // use tool: :search
        // use gateway

        const uses: any[] = [];

        // Can be multiple uses on same line: use gateway, model: :gpt4
        do {
            if (this.check(TokenType.Identifier)) {
                const name = this.advance().value;

                if (this.match(TokenType.Colon)) {
                    // use model: :gpt4
                    const value = this.parseExpression();
                    uses.push({ kind: "Map", properties: [{ key: name, value }] });
                } else {
                    // use gateway
                    uses.push({ kind: "Literal", value: name, raw: name });
                }
            }
        } while (this.match(TokenType.Comma));

        this.skipNewlines();

        if (uses.length === 1) {
            return { kind: "Attribute", key: "use", value: uses[0] };
        } else {
            return { kind: "Attribute", key: "use", value: { kind: "List", elements: uses } };
        }
    }

    private parseDoStatement(): AST.Attribute {
        // do .content_creation
        const ref = this.consume(TokenType.Reference, "Expect reference after 'do'").value;
        this.skipNewlines();

        return {
            kind: "Attribute",
            key: "do",
            value: { kind: "Reference", path: [ref.substring(1)] }  // Remove leading dot
        };
    }

    private parseHasStatement(): AST.Attribute {
        // has resources, policies
        // OR has:
        //     resource: value
        //     policy: value

        if (this.check(TokenType.Newline)) {
            // Block form
            this.consumeNewline();
            this.consume(TokenType.Indent, "Expect indent after 'has'");

            const properties: { key: string; value: AST.Expression }[] = [];
            while (!this.check(TokenType.Dedent) && !this.isAtEnd()) {
                this.skipNewlines();
                if (this.check(TokenType.Dedent)) break;

                const key = this.consume(TokenType.Identifier, "Expect property name").value;
                this.consume(TokenType.Colon, "Expect ':' after property name");
                const value = this.parseExpression();
                properties.push({ key, value });
                this.skipNewlines();
            }

            this.consume(TokenType.Dedent, "Expect dedent after 'has' block");

            return {
                kind: "Attribute",
                key: "has",
                value: { kind: "Map", properties }
            };
        } else {
            // Inline form: has resources, policies
            const items: string[] = [];
            do {
                items.push(this.consume(TokenType.Identifier, "Expect item name").value);
            } while (this.match(TokenType.Comma));

            this.skipNewlines();

            return {
                kind: "Attribute",
                key: "has",
                value: { kind: "List", elements: items.map(i => ({ kind: "Literal", value: i, raw: i })) }
            };
        }
    }

    private parseWhenStatement(): AST.Attribute {
        // when condition -> action
        // OR when condition
        //     action

        const condition = this.parseExpression();

        if (this.match(TokenType.Arrow)) {
            // Inline form
            const action = this.parseExpression();
            this.skipNewlines();

            return {
                kind: "Attribute",
                key: "when",
                value: {
                    kind: "Map",
                    properties: [
                        { key: "condition", value: condition },
                        { key: "action", value: action }
                    ]
                }
            };
        } else {
            // Block form
            this.consumeNewline();
            this.consume(TokenType.Indent, "Expect indent after 'when'");

            // Parse action statements
            const actions: AST.Attribute[] = [];
            while (!this.check(TokenType.Dedent) && !this.isAtEnd()) {
                this.skipNewlines();
                if (this.check(TokenType.Dedent)) break;

                if (this.check(TokenType.Arrow)) {
                    this.advance(); // consume ->
                    actions.push({
                        kind: "Attribute",
                        key: "action",
                        value: this.parseExpression()
                    });
                } else {
                    actions.push(this.parseStatement());
                }
                this.skipNewlines();
            }

            this.consume(TokenType.Dedent, "Expect dedent after 'when' block");

            return {
                kind: "Attribute",
                key: "when",
                value: {
                    kind: "Map",
                    properties: [
                        { key: "condition", value: condition },
                        { key: "actions", value: { kind: "List", elements: actions.map(a => a.value) } }
                    ]
                }
            };
        }
    }

    private parsePromptStatement(): AST.Attribute {
        // prompt :system
        //     "You are..."
        // OR prompt :system "You are..."

        let symbol: string | undefined;
        if (this.match(TokenType.Symbol)) {
            symbol = this.previous().value;
        }

        if (this.check(TokenType.String)) {
            // Inline form
            const content = this.advance().value;
            this.skipNewlines();

            return {
                kind: "Attribute",
                key: "prompt",
                value: {
                    kind: "Map",
                    properties: [
                        { key: "type", value: { kind: "Literal", value: symbol || ":default", raw: symbol || ":default" } },
                        { key: "content", value: { kind: "Literal", value: content, raw: `"${content}"` } }
                    ]
                }
            };
        } else {
            // Block form
            this.consumeNewline();
            this.consume(TokenType.Indent, "Expect indent after 'prompt'");

            const content = this.consume(TokenType.String, "Expect prompt content string").value;
            this.skipNewlines();

            this.consume(TokenType.Dedent, "Expect dedent after prompt content");

            return {
                kind: "Attribute",
                key: "prompt",
                value: {
                    kind: "Map",
                    properties: [
                        { key: "type", value: { kind: "Literal", value: symbol || ":default", raw: symbol || ":default" } },
                        { key: "content", value: { kind: "Literal", value: content, raw: `"${content}"` } }
                    ]
                }
            };
        }
    }

    private parseStateStatement(): AST.Attribute {
        // state :persistent
        //     backend :redis
        //     ttl 24h

        const symbol = this.match(TokenType.Symbol) ? this.previous().value : ":default";

        this.consumeNewline();
        this.consume(TokenType.Indent, "Expect indent after 'state'");

        const properties: { key: string; value: AST.Expression }[] = [];
        properties.push({ key: "type", value: { kind: "Literal", value: symbol, raw: symbol } });

        while (!this.check(TokenType.Dedent) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(TokenType.Dedent)) break;

            const key = this.consume(TokenType.Identifier, "Expect property name").value;
            const value = this.parseExpression();
            properties.push({ key, value });
            this.skipNewlines();
        }

        this.consume(TokenType.Dedent, "Expect dedent after 'state' block");

        return {
            kind: "Attribute",
            key: "state",
            value: { kind: "Map", properties }
        };
    }

    private parseRemembersStatement(): AST.Attribute {
        // remembers
        //     conversation: last 50 messages
        //     preferences: always

        this.consumeNewline();
        this.consume(TokenType.Indent, "Expect indent after 'remembers'");

        const properties: { key: string; value: AST.Expression }[] = [];

        while (!this.check(TokenType.Dedent) && !this.isAtEnd()) {
            this.skipNewlines();
            if (this.check(TokenType.Dedent)) break;

            const key = this.consume(TokenType.Identifier, "Expect memory key").value;
            this.consume(TokenType.Colon, "Expect ':' after memory key");

            // Parse "last 50 messages" or "always" or "current_session"
            const value = this.parseExpression();
            properties.push({ key, value });
            this.skipNewlines();
        }

        this.consume(TokenType.Dedent, "Expect dedent after 'remembers' block");

        return {
            kind: "Attribute",
            key: "remembers",
            value: { kind: "Map", properties }
        };
    }

    private parseGenericStatement(keyword: string): AST.Attribute {
        // Generic statement - parse rest of line as expression
        const value = this.parseExpression();
        this.skipNewlines();

        return {
            kind: "Attribute",
            key: keyword,
            value
        };
    }

    private parseAttribute(): AST.Attribute {
        const key = this.consume(TokenType.Identifier, "Expect attribute key").value;

        if (this.match(TokenType.Colon) || this.match(TokenType.Equals)) {
            const value = this.parseExpression();
            this.skipNewlines();
            return { kind: "Attribute", key, value };
        }

        throw this.error(this.peek(), "Expect ':' or '=' after attribute key");
    }

    private parseExpression(): AST.Expression {
        // Symbol: :name
        if (this.match(TokenType.Symbol)) {
            const value = this.previous().value;
            return { kind: "Literal", value, raw: value };
        }

        // Reference: .name
        if (this.match(TokenType.Reference)) {
            const value = this.previous().value;
            return { kind: "Reference", path: [value.substring(1)] };  // Remove leading dot
        }

        // String
        if (this.match(TokenType.String)) {
            const value = this.previous().value;
            this.validateNotCredential(value);
            return { kind: "Literal", value, raw: `"${value}"` };
        }

        // Number
        if (this.match(TokenType.Number)) {
            return { kind: "Literal", value: parseFloat(this.previous().value), raw: this.previous().value };
        }

        // Boolean
        if (this.match(TokenType.Boolean)) {
            return { kind: "Literal", value: this.previous().value === "true", raw: this.previous().value };
        }

        // List: [...]
        if (this.match(TokenType.OpenBracket)) {
            return this.parseList();
        }

        // Identifier or dotted reference
        if (this.check(TokenType.Identifier)) {
            return this.parseReference();
        }

        throw this.error(this.peek(), "Expect expression");
    }

    private parseList(): AST.ListExpression {
        const elements: AST.Expression[] = [];

        if (!this.check(TokenType.CloseBracket)) {
            do {
                this.skipNewlines();
                if (this.check(TokenType.CloseBracket)) break;
                elements.push(this.parseExpression());
                this.skipNewlines();
            } while (this.match(TokenType.Comma));
        }

        this.consume(TokenType.CloseBracket, "Expect ']' after list");
        return { kind: "List", elements };
    }

    private parseReference(): AST.Reference {
        const path: string[] = [];
        path.push(this.consume(TokenType.Identifier, "Expect identifier").value);

        while (this.match(TokenType.Dot)) {
            if (this.check(TokenType.Identifier)) {
                path.push(this.consume(TokenType.Identifier, "Expect identifier after dot").value);
            } else {
                break;
            }
        }

        return { kind: "Reference", path };
    }

    // Security validation
    private validateNotCredential(value: string): void {
        const credentialPatterns = [
            /^sk-/i,
            /^api_/i,
            /^key_/i,
            /^secret_/i,
            /^token_/i,
            /^Bearer /i,
            /^[A-Za-z0-9_-]{32,}$/,
        ];

        for (const pattern of credentialPatterns) {
            if (pattern.test(value)) {
                throw new Error(
                    `Security Error: Literal credential detected. ` +
                    `Use environment references (env.VAR_NAME) or secrets references (secrets.KEY_NAME) instead. ` +
                    `Never include literal API keys or secrets in .a22 files.`
                );
            }
        }
    }

    // Helper methods
    private match(type: TokenType): boolean {
        if (this.check(type)) {
            this.advance();
            return true;
        }
        return false;
    }

    private check(type: TokenType): boolean {
        if (this.isAtEnd()) return false;
        return this.peek().type === type;
    }

    private advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    private isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    private peek(): Token {
        return this.tokens[this.current] || this.tokens[this.tokens.length - 1];
    }

    private previous(): Token {
        return this.tokens[this.current - 1] || this.tokens[0];
    }

    private consume(type: TokenType, message: string): Token {
        if (this.check(type)) return this.advance();
        throw this.error(this.peek(), message);
    }

    private consumeKeyword(message: string): Token {
        if (this.check(TokenType.Keyword)) return this.advance();
        throw this.error(this.peek(), message);
    }

    private consumeNewline(): void {
        while (this.match(TokenType.Newline)) {
            // Consume all consecutive newlines
        }
    }

    private skipNewlines(): void {
        while (this.match(TokenType.Newline)) {
            // Skip newlines
        }
    }

    private error(token: Token, message: string): Error {
        return new Error(`[line ${token.line}] Error at '${token.value}': ${message}`);
    }
}
