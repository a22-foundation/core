"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.A22Parser = exports.Parser = void 0;
const lexer_1 = require("./lexer");
const AST = __importStar(require("./ast"));
class Parser {
    tokens;
    current = 0;
    constructor(tokens) {
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
        const typeToken = this.consume(lexer_1.TokenType.Identifier, "Expect block type.");
        const type = typeToken.value;
        const nameToken = this.consume(lexer_1.TokenType.Identifier, "Expect block identifier.");
        const identifier = nameToken.value;
        let label;
        if (this.check(lexer_1.TokenType.String)) { // Optional Secondary Label for things like "resource" type="pinecone" if we wanted, but spec says identifier
            // Actually spec says: block = type identifier [ label ] "{" body "}"
            // But identifier is typically a string in HCL ("resouce_name"), but our lexer tokenizes quoted strings as String.
            // Let's adjust: A22 identifiers seem to be quoted strings in some examples (agent "name") but unquoted in others?
            // Spec: agent "researcher" -> type=agent, identifier="researcher" (String token)
            // Wait, lexer `readIdentifier` handles unquoted. `readString` handles quoted.
            // Let's support both for robustness or adhere to spec.
            // Spec: agent "researcher" { ... }
            // Lexer: Identifier(agent), String("researcher"), OpenBrace
        }
        // Correction: In HCL `resource "type" "name"`. In A22 spec: `agent "name"`.
        // So `type` is Identifier("agent"), `identifier` is String("name") OR Identifier(name).
        // Let's allow String or Identifier for the name.
        // Retrying parseBlock logic based on `agent "name" {`
        // We already consumed `type` (agent).
        // Now we expect the name. 
        // Use `identifier` variable for the name.
        // Ideally, `agent` is an keyword-like identifier. `researcher` is the name string.
        // Wait, previous `consume` was Identifier. If user wrote `agent "researcher"`, the second token is String.
        // Let's rollback and fix.
        // Actually the `consume` above got `agent`. Next is "researcher" (String).
        // But `identifier` var name is confusing. Let's call it `blockType`.
    }
}
exports.Parser = Parser;
// Re-implementing correctly
class A22Parser {
    tokens;
    current = 0;
    constructor(tokens) {
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
        const typeToken = this.consume(lexer_1.TokenType.Identifier, "Expect block type."); // e.g. agent
        let identifier = "";
        if (this.match(lexer_1.TokenType.String)) {
            identifier = this.previous().value;
        }
        else if (this.match(lexer_1.TokenType.Identifier)) {
            identifier = this.previous().value;
        }
        else {
            throw this.error(this.peek(), "Expect block name (string or identifier).");
        }
        let label;
        // Check for optional second label if needed, not common in A22 samples yet, mostly `agent "name"`
        this.consume(lexer_1.TokenType.OpenBrace, "Expect '{' after block header.");
        const attributes = [];
        const children = [];
        while (!this.check(lexer_1.TokenType.CloseBrace) && !this.isAtEnd()) {
            // Heuristic: If it looks like `key = val` it's an attribute.
            // If it looks like `type "name" {` it's a nested block.
            // Lookahead
            if (this.check(lexer_1.TokenType.Identifier) && this.checkNext(lexer_1.TokenType.Equals)) {
                attributes.push(this.parseAttribute());
            }
            else if (this.check(lexer_1.TokenType.Identifier)) {
                children.push(this.parseBlock());
            }
            else {
                // Error or comments
                throw this.error(this.peek(), "Expect attribute or nested block.");
            }
        }
        this.consume(lexer_1.TokenType.CloseBrace, "Expect '}' after block body.");
        return {
            kind: "Block",
            type: typeToken.value,
            identifier,
            label,
            attributes,
            children
        };
    }
    parseAttribute() {
        const key = this.consume(lexer_1.TokenType.Identifier, "Expect attribute key.").value;
        this.consume(lexer_1.TokenType.Equals, "Expect '=' after attribute key.");
        const value = this.parseExpression();
        return { kind: "Attribute", key, value };
    }
    parseExpression() {
        if (this.match(lexer_1.TokenType.String))
            return { kind: "Literal", value: this.previous().value, raw: `"${this.previous().value}"` };
        if (this.match(lexer_1.TokenType.Number))
            return { kind: "Literal", value: parseFloat(this.previous().value), raw: this.previous().value };
        if (this.match(lexer_1.TokenType.Boolean))
            return { kind: "Literal", value: this.previous().value === "true", raw: this.previous().value };
        if (this.match(lexer_1.TokenType.OpenBracket))
            return this.parseList();
        if (this.match(lexer_1.TokenType.OpenBrace))
            return this.parseMap();
        // References: tool.search or agent.name.attr
        if (this.check(lexer_1.TokenType.Identifier)) {
            return this.parseReference();
        }
        throw this.error(this.peek(), "Expect expression.");
    }
    parseList() {
        const elements = [];
        if (!this.check(lexer_1.TokenType.CloseBracket)) {
            do {
                elements.push(this.parseExpression());
            } while (this.match(lexer_1.TokenType.Comma));
        }
        this.consume(lexer_1.TokenType.CloseBracket, "Expect ']' after list.");
        return { kind: "List", elements };
    }
    parseMap() {
        const properties = [];
        if (!this.check(lexer_1.TokenType.CloseBrace)) {
            // In HCL map: key = value. Newlines are separators usually but we treat comma or just repeated pairs
            // For simplicity, let's assume comma or just loop
            while (!this.check(lexer_1.TokenType.CloseBrace) && !this.isAtEnd()) {
                const key = this.consume(lexer_1.TokenType.Identifier, "Expect map key.").value;
                this.consume(lexer_1.TokenType.Equals, "Expect '='.");
                const value = this.parseExpression();
                properties.push({ key, value });
                // Optional comma
                this.match(lexer_1.TokenType.Comma);
            }
        }
        this.consume(lexer_1.TokenType.CloseBrace, "Expect '}' after map.");
        return { kind: "Map", properties };
    }
    parseReference() {
        const path = [];
        path.push(this.consume(lexer_1.TokenType.Identifier, "Expect identifier.").value);
        while (this.match(lexer_1.TokenType.Dot)) {
            path.push(this.consume(lexer_1.TokenType.Identifier, "Expect identifier after dot.").value);
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
        return this.peek().type === lexer_1.TokenType.EOF;
    }
    peek() {
        return this.tokens[this.current];
    }
    previous() {
        return this.tokens[this.current - 1];
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
exports.A22Parser = A22Parser;
//# sourceMappingURL=parser.js.map