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
