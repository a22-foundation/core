export declare enum TokenType {
    Identifier = 0,
    String = 1,
    Number = 2,
    Boolean = 3,
    OpenBrace = 4,// {
    CloseBrace = 5,// }
    OpenBracket = 6,// [
    CloseBracket = 7,// ]
    Equals = 8,// =
    Dot = 9,// .
    Comma = 10,// ,
    EOF = 11
}
export interface Token {
    type: TokenType;
    value: string;
    line: number;
    column: number;
}
export declare class Lexer {
    private input;
    private pos;
    private line;
    private col;
    constructor(input: string);
    tokenize(): Token[];
    private nextToken;
    private skipWhitespace;
    private readIdentifier;
    private readNumber;
    private readString;
    private advanceToken;
    private advance;
    private peek;
    private token;
}
//# sourceMappingURL=lexer.d.ts.map