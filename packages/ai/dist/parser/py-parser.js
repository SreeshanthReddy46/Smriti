export function parsePython(filePath, content) {
    const lines = content.split('\n');
    const chunks = [];
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
                const nextIndent = nextLine.match(/^(\s*)/)[1].length;
                if (nextIndent <= indent) {
                    break; // block ended
                }
                blockLines.push(nextLine);
                scanIdx++;
            }
            // Trim trailing empty lines
            while (blockLines.length > 1 && blockLines[blockLines.length - 1].trim() === '') {
                blockLines.pop();
                scanIdx--;
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
        }
    }
    return chunks;
}
