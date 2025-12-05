import { Token } from './lexer';
import * as AST from './ast';
export declare class Parser {
    private tokens;
    private current;
    constructor(tokens: Token[]);
    parse(): AST.Program;
    private parseBlock;
}
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
    private parseReference;
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
//# sourceMappingURL=parser.d.ts.map