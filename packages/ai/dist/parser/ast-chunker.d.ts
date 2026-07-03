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
export declare class AstChunker {
    static chunkFile(filePath: string, content: string): CodeChunk[];
    private static parseMarkdown;
    private static parseGeneralText;
}
