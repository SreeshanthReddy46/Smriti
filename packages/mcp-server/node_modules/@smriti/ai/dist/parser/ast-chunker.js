import { parseTypeScript } from './ts-parser.js';
import { parsePython } from './py-parser.js';
export class AstChunker {
    static chunkFile(filePath, content) {
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
    static parseMarkdown(filePath, content) {
        const lines = content.split('\n');
        const chunks = [];
        let currentHeader = 'Introduction';
        let blockLines = [];
        let startLine = 1;
        for (let idx = 0; idx < lines.length; idx++) {
            const line = lines[idx];
            const match = line.match(/^#+\s+(.+)/);
            if (match) {
                if (blockLines.length > 0 && blockLines.join('\n').trim() !== '') {
                    chunks.push({
                        id: `${filePath}:markdown:${currentHeader}:${startLine}:${idx}`,
                        filePath,
                        type: 'general',
                        symbol: currentHeader,
                        content: blockLines.join('\n'),
                        startLine,
                        endLine: idx,
                        metadata: { language: 'markdown', symbol: currentHeader, hasDocstring: false }
                    });
                }
                currentHeader = match[1];
                blockLines = [line];
                startLine = idx + 1;
            }
            else {
                blockLines.push(line);
            }
        }
        if (blockLines.length > 0 && blockLines.join('\n').trim() !== '') {
            chunks.push({
                id: `${filePath}:markdown:${currentHeader}:${startLine}:${lines.length}`,
                filePath,
                type: 'general',
                symbol: currentHeader,
                content: blockLines.join('\n'),
                startLine,
                endLine: lines.length,
                metadata: { language: 'markdown', symbol: currentHeader, hasDocstring: false }
            });
        }
        return chunks;
    }
    static parseGeneralText(filePath, content) {
        const paragraphs = content.split('\n\n');
        const chunks = [];
        let currentLine = 1;
        for (let idx = 0; idx < paragraphs.length; idx++) {
            const p = paragraphs[idx].trim();
            if (!p)
                continue;
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
