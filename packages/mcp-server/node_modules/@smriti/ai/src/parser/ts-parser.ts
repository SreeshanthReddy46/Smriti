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
      symbol = ts.isIdentifier(node.name) ? node.name.text : node.name.getText(sourceFile);
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
