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
exports.Transpiler = exports.Validator = void 0;
exports.compile = compile;
const ast_1 = require("./ast");
const lexer_1 = require("./lexer");
const parser_1 = require("./parser");
const fs = __importStar(require("fs"));
// Validator
class Validator {
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
exports.Validator = Validator;
// Transpiler
class Transpiler {
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
exports.Transpiler = Transpiler;
// Main CLI
function compile(filePath) {
    console.log(`Compiling ${filePath}...`);
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lexer = new lexer_1.Lexer(content);
        const tokens = lexer.tokenize();
        const parser = new parser_1.A22Parser(tokens);
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
if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log("Usage: node index.js <file>");
        process.exit(1);
    }
    compile(args[0]);
}
//# sourceMappingURL=index.js.map