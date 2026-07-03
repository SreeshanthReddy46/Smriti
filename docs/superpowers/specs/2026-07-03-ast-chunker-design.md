# Smriti AST Parser & Semantic Chunker Design Spec

This document details the architectural specification for the **Smriti AST Code Parser & Semantic Chunker** (v1.0) under the `@smriti/ai` package. It enables logical, symbol-aware code chunking (functions, classes, components) instead of generic character-based sliding windows.

---

## 🎯 1. Design Goals

1. **Symbol-Aware Code Slicing**: Divide source files by syntax structures (methods, classes, hooks, properties) to capture clean context units.
2. **Zero Native Build Dependencies**: Utilize the pre-loaded TypeScript Compiler API for TS/JS files, and custom indentation trackers for Python files, preventing Windows node-gyp or python compile errors.
3. **Pristine Metadata Logging**: Associate each chunk with start/end lines, symbol names, language types, and docstring flags.
4. **Resilient Markdown/Text Fallbacks**: Provide logical paragraph or heading-based splits for text files (`.md`, `.json`, `.yaml`).

---

## 🏗️ 2. Core Interfaces

All parsed code fragments conform to the `CodeChunk` interface defined in `packages/ai/src/parser/ast-chunker.ts`:

```typescript
export interface CodeChunk {
  id: string;
  filePath: string;
  type: 'class' | 'function' | 'interface' | 'general';
  symbol?: string;
  content: string;
  startLine: number;
  endLine: number;
  metadata: {
    language: 'typescript' | 'javascript' | 'python' | 'markdown' | 'general';
    symbol?: string;
    hasDocstring: boolean;
    [key: string]: any;
  };
}
```

---

## 🧩 3. Parser Components

### 3.1 TypeScript AST Parser (`packages/ai/src/parser/ts-parser.ts`)
Uses the standard `typescript` library to build a virtual AST source file.

**Traversal Targets:**
- `ts.SyntaxKind.ClassDeclaration` -> `type: "class"`
- `ts.SyntaxKind.InterfaceDeclaration` / `ts.SyntaxKind.TypeAliasDeclaration` -> `type: "interface"`
- `ts.SyntaxKind.FunctionDeclaration` / `ts.SyntaxKind.ArrowFunction` -> `type: "function"`
- `ts.SyntaxKind.MethodDeclaration` -> `type: "function"` (within classes)

Line coordinates are calculated via character offsets:
```typescript
const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
```

### 3.2 Python Indentation Block Parser (`packages/ai/src/parser/py-parser.ts`)
A line-by-line block extractor that groups Python constructs:

**Regex Triggers:**
- Class matches: `/^\s*class\s+([a-zA-Z0-9_]+)/`
- Function matches: `/^\s*def\s+([a-zA-Z0-9_]+)/`

**Block Accumulation Logic:**
1. When a definition line matches, record its indentation level (e.g. 4 spaces).
2. Accumulate subsequent lines as part of the block until a non-empty line with less than or equal indentation is encountered.
3. Search the first few lines of the block for `"""` or `'''` strings to flag `hasDocstring: true`.

---

## 🕒 4. Coordinator & Fallback Router (`packages/ai/src/parser/ast-chunker.ts`)

The primary chunking handler evaluates file extensions:

```typescript
export class AstChunker {
  public static chunkFile(filePath: string, content: string): CodeChunk[] {
    const ext = filePath.split('.').pop()?.toLowerCase();
    
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
        return parseTypeScript(filePath, content);
      case 'py':
        return parsePython(filePath, content);
      case 'md':
        return parseMarkdown(filePath, content);
      default:
        return parseGeneralText(filePath, content);
    }
  }
}
```

### 4.1 General / Markdown Fallback
- **Markdown**: Splits by headers (`^#+ `) or double newlines.
- **Text**: Splits by double newlines (`\n\n`) ensuring chunks stay between 200 and 1000 characters.

---

## 🧪 5. Testing & Verification

We will configure `packages/ai/tests/ast-chunker.test.ts` to assert:
1. **TypeScript Slicing**: Verify that a test TS file with one class containing two methods outputs exactly three chunks (the class scope and both nested method scopes) with correct line numbers.
2. **Python Blocks**: Assert that a Python class with def blocks is correctly extracted, docstrings are parsed, and helper functions are isolated.
3. **Markdown Slicing**: Verify that markdown headings yield distinct chunks.
4. **Immutability and IDs**: Confirm that each chunk contains a deterministic UUID hash based on its content and file path.
