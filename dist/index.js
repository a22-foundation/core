import { Lexer } from './lexer.js';
import { A22Parser } from './parser.js';
import * as fs from 'fs';
// Validator
export class Validator {
    validate(program) {
        const errors = [];
        // Basic check: Ensure no duplicate identifiers for same type
        const seen = new Set();
        for (const block of program.blocks) {
            const id = `${block.type}.${block.identifier}`;
            if (seen.has(id)) {
                errors.push(`Duplicate definition: ${id}`);
            }
            seen.add(id);
        }
        return errors;
    }
}
// Transpiler
export class Transpiler {
    toIR(program) {
        const graph = { nodes: {}, edges: [] };
        for (const block of program.blocks) {
            const id = `${block.type}.${block.identifier}`;
            const node = { type: block.type };
            for (const textAttr of block.attributes) {
                // Simplify values for demo
                const val = textAttr.value.value ?? textAttr.value;
                node[textAttr.key] = val;
            }
            // Handling nested?
            graph.nodes[id] = node;
        }
        return { version: "0.1", graph };
    }
}
// Main CLI
export function compile(filePath) {
    console.log(`Compiling ${filePath}...`);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lexer = new Lexer(content);
        const tokens = lexer.tokenize();
        const parser = new A22Parser(tokens);
        const ast = parser.parse();
        const validator = new Validator();
        const errors = validator.validate(ast);
        if (errors.length > 0) {
            console.error("Validation failed:");
            errors.forEach(e => console.error(`- ${e}`));
            process.exit(1);
        }
        const transpiler = new Transpiler();
        const ir = transpiler.toIR(ast);
        console.log(JSON.stringify(ir, null, 2));
    }
    catch (e) {
        console.error(e.message);
        process.exit(1);
    }
}
// Simple CLI entry
// In ESM, we can check if the file is being run directly by comparing import.meta.url with the script path,
// or just rely on the fact that we are invoking it from CLI.
// For now, let's just run it if arguments are provided.
// Simple check if running from CLI
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: node index.js <file>");
        process.exit(1);
    }
    compile(args[0]);
}
