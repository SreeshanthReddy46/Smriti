# AST Parser & Semantic Chunker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the AST Parser and Semantic Chunker in `@smriti/ai` to support symbol-aware structural code slicing for TypeScript and Python.

**Architecture:** Create modular parsers in `packages/ai/src/parser/`. Use TypeScript compiler API for JS/TS parse trees, write a custom indentation-tracking block assembler for Python, and implement markdown/heading fallbacks in the main chunker coordinator.

**Tech Stack:** Node.js v24 (built-in TS, readline, crypto, and test runner), TypeScript compiler API.

## Global Constraints
- **Zero-Dependency**: No external npm packages. Native TypeScript API and inline parsing logic.
- **Line Coordinate Mapping**: All chunks must accurately record 1-indexed start/end lines matching the original file source code.
- **Testing**: Run tests using native Node.js TS test execution (`node --experimental-strip-types --test`).

---

### Task 1: TypeScript AST Parser Implementation

**Files:**
- Create: `packages/ai/src/parser/ts-parser.ts`

**Interfaces:**
- Consumes: TS Source Content.
- Produces: `parseTypeScript(filePath: string, content: string): CodeChunk[]` function.

- [ ] **Step 1: Implement ts-parser.ts**

Create `packages/ai/src/parser/ts-parser.ts` utilizing `typescript` AST compiler APIs:

```typescript
import ts from 'typescript';
import { CodeChunk } from './ast-chunker.js';

export function parseTypeScript(filePath: string, content: string): CodeChunk[] {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const chunks: CodeChunk[] = [];

  function visit(node: ts.Node) {
    let shouldExtract = false;
    let type: CodeChunk['type'] = 'general';
    let symbol = '';

    if (ts.isClassDeclaration(node) && node.name) {
      shouldExtract = true;
      type = 'class';
      symbol = node.name.text;
    } else if ((ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) && node.name) {
      shouldExtract = true;
      type = 'function';
      symbol = node.name.text;
    } else if (ts.isInterfaceDeclaration(node) && node.name) {
      shouldExtract = true;
      type = 'interface';
      symbol = node.name.text;
    } else if (ts.isTypeAliasDeclaration(node) && node.name) {
      shouldExtract = true;
      type = 'interface';
      symbol = node.name.text;
    }

    if (shouldExtract) {
      const { line: startLine } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
      const { line: endLine } = sourceFile.getLineAndCharacterOfPosition(node.getEnd());
      
      const nodeText = content.substring(node.getStart(), node.getEnd());
      const id = `${filePath}:${type}:${symbol}:${startLine}:${endLine}`;

      // Search for JSDoc documentation
      const hasDoc = nodeText.includes('/**') || nodeText.includes('*/');

      chunks.push({
        id,
        filePath,
        type,
        symbol,
        content: nodeText,
        startLine: startLine + 1, // convert to 1-based
        endLine: endLine + 1,
        metadata: {
          language: filePath.endsWith('x') ? 'typescript' : 'typescript',
          symbol,
          hasDocstring: hasDoc
        }
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return chunks;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai/src/parser/ts-parser.ts
git commit -m "feat: implement typescript AST compiler code parser"
```

---

### Task 2: Python Indentation Block Parser Implementation

**Files:**
- Create: `packages/ai/src/parser/py-parser.ts`

**Interfaces:**
- Consumes: Python code strings.
- Produces: `parsePython(filePath: string, content: string): CodeChunk[]` function.

- [ ] **Step 1: Implement py-parser.ts**

Create `packages/ai/src/parser/py-parser.ts` parsing blocks based on indentation logic:

```typescript
import { CodeChunk } from './ast-chunker.js';

export function parsePython(filePath: string, content: string): CodeChunk[] {
  const lines = content.split('\n');
  const chunks: CodeChunk[] = [];

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    
    // Class Matcher
    const classMatch = line.match(/^(\s*)class\s+([a-zA-Z0-9_]+)/);
    // Function Matcher
    const funcMatch = line.match(/^(\s*)def\s+([a-zA-Z0-9_]+)/);

    const match = classMatch || funcMatch;
    if (match) {
      const indent = match[1].length;
      const symbol = match[2];
      const type = classMatch ? 'class' : 'function';
      const startLine = idx + 1;
      
      // Slices subsequent lines with greater indentation
      const blockLines = [line];
      let scanIdx = idx + 1;
      while (scanIdx < lines.length) {
        const nextLine = lines[scanIdx];
        if (nextLine.trim() === '') {
          blockLines.push(nextLine);
          scanIdx++;
          continue;
        }
        
        const nextIndent = nextLine.match(/^(\s*)/)![1].length;
        if (nextIndent <= indent) {
          break; // block ended
        }
        
        blockLines.push(nextLine);
        scanIdx++;
      }

      const blockContent = blockLines.join('\n');
      const endLine = scanIdx;
      
      // Docstring scanner checks for triple-quotes
      const hasDoc = /"""|'''/.test(blockContent);

      chunks.push({
        id: `${filePath}:${type}:${symbol}:${startLine}:${endLine}`,
        filePath,
        type,
        symbol,
        content: blockContent,
        startLine,
        endLine,
        metadata: {
          language: 'python',
          symbol,
          hasDocstring: hasDoc
        }
      });
      
      // Update line pointer so we don't duplicate nested triggers
      idx = scanIdx - 1;
    }
  }

  return chunks;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/ai/src/parser/py-parser.ts
git commit -m "feat: implement python indentation block parser"
```

---

### Task 3: Chunker Coordinator and General Text Fallbacks

**Files:**
- Create: `packages/ai/src/parser/ast-chunker.ts`
- Modify: `packages/ai/src/index.ts`

**Interfaces:**
- Consumes: file path and content.
- Produces: `AstChunker` class and exports.

- [ ] **Step 1: Implement Coordinator Chunker**

Create `packages/ai/src/parser/ast-chunker.ts` supporting markdown header splits and paragraph deciders:

```typescript
import { parseTypeScript } from './ts-parser.js';
import { parsePython } from './py-parser.js';

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
        return this.parseMarkdown(filePath, content);
      default:
        return this.parseGeneralText(filePath, content);
    }
  }

  private static parseMarkdown(filePath: string, content: string): CodeChunk[] {
    const lines = content.split('\n');
    const chunks: CodeChunk[] = [];
    let currentHeader = 'Introduction';
    let blockLines: string[] = [];
    let startLine = 1;

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];
      const match = line.match(/^#+\s+(.+)/);

      if (match) {
        if (blockLines.length > 0) {
          chunks.push({
            id: `${filePath}:markdown:${currentHeader}:${startLine}:${idx}`,
            filePath,
            type: 'general',
            content: blockLines.join('\n'),
            startLine,
            endLine: idx,
            metadata: { language: 'markdown', symbol: currentHeader, hasDocstring: false }
          });
        }
        currentHeader = match[1];
        blockLines = [line];
        startLine = idx + 1;
      } else {
        blockLines.push(line);
      }
    }

    if (blockLines.length > 0) {
      chunks.push({
        id: `${filePath}:markdown:${currentHeader}:${startLine}:${lines.length}`,
        filePath,
        type: 'general',
        content: blockLines.join('\n'),
        startLine,
        endLine: lines.length,
        metadata: { language: 'markdown', symbol: currentHeader, hasDocstring: false }
      });
    }

    return chunks;
  }

  private static parseGeneralText(filePath: string, content: string): CodeChunk[] {
    const paragraphs = content.split('\n\n');
    const chunks: CodeChunk[] = [];
    let currentLine = 1;

    for (let idx = 0; idx < paragraphs.length; idx++) {
      const p = paragraphs[idx].trim();
      if (!p) continue;

      const pLines = p.split('\n');
      const startLine = currentLine;
      const endLine = currentLine + pLines.length - 1;

      chunks.push({
        id: `${filePath}:general:p-${idx}:${startLine}:${endLine}`,
        filePath,
        type: 'general',
        content: p,
        startLine,
        endLine,
        metadata: { language: 'general', hasDocstring: false }
      });

      currentLine = endLine + 2; // +2 to account for double newlines
    }

    return chunks;
  }
}
```

- [ ] **Step 2: Update packages/ai entry exports**

Overwrite `packages/ai/src/index.ts` to export new parser symbols:

```typescript
export * from './intent/types.js';
export * from './intent/rule-classifier.js';
export * from './intent/llm-classifier.js';
export * from './intent/hybrid-classifier.js';
export * from './parser/ast-chunker.js';
```

- [ ] **Step 3: Commit**

```bash
git add packages/ai/src/parser/ast-chunker.ts packages/ai/src/index.ts
git commit -m "feat: implement main Chunker coordinator and text/markdown fallbacks"
```

---

### Task 4: Chunker Testing Suite

**Files:**
- Create: `packages/ai/tests/ast-chunker.test.ts`
- Modify: `packages/ai/package.json`

**Interfaces:**
- Consumes: `AstChunker` endpoints.
- Produces: Test metrics for chunk ranges, python declarations, and markdown nodes.

- [ ] **Step 1: Write test cases**

Create `packages/ai/tests/ast-chunker.test.ts`:

```typescript
import { test, describe } from 'node:test';
import assert from 'node:assert';
import { AstChunker } from '../dist/parser/ast-chunker.js';

describe('Smriti AI AST Chunker verification', () => {
  test('TypeScript parsing assertions', () => {
    const tsCode = `
      export interface Event { id: string; }
      export class TestBus {
        constructor() {}
        public publish(): void {
          console.log("publishing");
        }
      }
    `;

    const chunks = AstChunker.chunkFile('test-bus.ts', tsCode);
    
    // Interface + Class + Method publish
    assert.strictEqual(chunks.length, 3);
    
    const classChunk = chunks.find(c => c.type === 'class');
    assert.ok(classChunk);
    assert.strictEqual(classChunk.symbol, 'TestBus');
    assert.strictEqual(classChunk.startLine, 3);
  });

  test('Python block indentation parsing assertions', () => {
    const pyCode = `
class Scanner:
    """Class Scanner Docstring"""
    def __init__(self):
        self.files = []
        
    def scan(self):
        print("scanning")

def helper():
    return True
    `;

    const chunks = AstChunker.chunkFile('scanner.py', pyCode);
    
    assert.strictEqual(chunks.length, 4); // Class Scanner, def __init__, def scan, def helper
    
    const scanChunk = chunks.find(c => c.symbol === 'scan');
    assert.ok(scanChunk);
    assert.strictEqual(scanChunk.type, 'function');
    assert.strictEqual(scanChunk.startLine, 7);
    assert.strictEqual(scanChunk.endLine, 8);
    
    const helperChunk = chunks.find(c => c.symbol === 'helper');
    assert.ok(helperChunk);
    assert.strictEqual(helperChunk.startLine, 10);
  });

  test('Markdown header splits fallbacks', () => {
    const mdCode = `
# Title Overview
This is a general summary of the project.

## Details Table
Section details list.
    `;

    const chunks = AstChunker.chunkFile('readme.md', mdCode);
    assert.strictEqual(chunks.length, 2);
    assert.strictEqual(chunks[0].symbol, 'Title Overview');
    assert.strictEqual(chunks[1].symbol, 'Details Table');
  });
});
```

- [ ] **Step 2: Add test script in package.json**

Update `packages/ai/package.json` to run both test files:
```json
"test": "node --experimental-strip-types --test tests/intent-engine.test.ts tests/ast-chunker.test.ts"
```

- [ ] **Step 3: Run compiler build check**

Compile packages:
Run: `pnpm --filter @smriti/ai build`
Expected: Compile succeeds.

- [ ] **Step 4: Run test suite verification**

Run tests:
Run: `pnpm --filter @smriti/ai test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/ai/tests/ast-chunker.test.ts packages/ai/package.json
git commit -m "test: add test suite covering TS, Python, and MD AST chunker"
```
