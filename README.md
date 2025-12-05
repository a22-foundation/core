# A22 Core Implementation

The `core` package provides the foundational referencing implementation for the **A22 Language**, a functional, declarative language for building deterministic agentic systems.

## Features
- **Lexer**: Tokenizes A22 source code.
- **Parser**: Generates a strongly-typed Abstract Syntax Tree (AST).
- **Validator**: Semantic analysis and validation of key language rules.
- **Transpiler**: Converts AST to a standard JSON Intermediate Representation (IR).
- **CLI**: A command-line tool `a22` for compiling and checking files.

## Installation
```bash
npm install
npm run build
```

## Usage (CLI)
```bash
node dist/index.js compile <file.a22>
```

## Directory Structure
- `src/lexer.ts`: Token definitions and tokenizer.
- `src/parser.ts`: Recursive descent parser.
- `src/ast.ts`: TypeScript interfaces for the AST.
- `src/validator.ts`: Semantic validation logic.
- `src/index.ts`: CLI entry point.
