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
