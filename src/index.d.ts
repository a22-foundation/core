import { Program } from './ast';
export declare class Validator {
    validate(program: Program): string[];
}
export declare class Transpiler {
    toIR(program: Program): any;
}
export declare function compile(filePath: string): void;
//# sourceMappingURL=index.d.ts.map