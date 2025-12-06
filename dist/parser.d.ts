import { Token } from './lexer.js';
import * as AST from './ast.js';
export declare class A22Parser {
    private tokens;
    private current;
    constructor(tokens: Token[]);
    parse(): AST.Program;
    private parseBlock;
    private parseAttribute;
    private parseExpression;
    private parseList;
    private parseMap;
    private parseBlockExpression;
    private parseReference;
    private validateNotCredential;
    private match;
    private check;
    private checkNext;
    private advance;
    private isAtEnd;
    private peek;
    private previous;
    private consume;
    private error;
}
