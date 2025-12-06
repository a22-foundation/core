export declare enum TokenType {
    Keyword = 0,
    Identifier = 1,
    String = 2,
    Number = 3,
    Boolean = 4,
    Symbol = 5,// :name
    Reference = 6,// .name
    Arrow = 7,// ->
    Range = 8,// ..
    OpenBracket = 9,// [
    CloseBracket = 10,// ]
    Equals = 11,// =
    Dot = 12,// .
    Comma = 13,// ,
    Colon = 14,// :
    Indent = 15,
    Dedent = 16,
    Newline = 17,
    EOF = 18
}
export declare const KEYWORDS: Set<string>;
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
    private indentStack;
    private pendingTokens;
    private atLineStart;
    constructor(input: string);
    tokenize(): Token[];
    private nextToken;
    private measureIndent;
    private readSymbol;
    private readReference;
    private skipWhitespaceExceptNewline;
    private readIdentifier;
    private readNumber;
    private readString;
    private advanceToken;
    private advance;
    private peek;
    private token;
}
