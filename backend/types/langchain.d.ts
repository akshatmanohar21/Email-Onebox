declare module '@langchain/openai' {
    export class OpenAIEmbeddings {
        constructor(config: any);
    }
}

declare module '@langchain/core/documents' {
    export class Document {
        pageContent: string;
        metadata: Record<string, any>;
        constructor(fields: { pageContent: string; metadata?: Record<string, any> });
    }
}

declare module 'langchain/vectorstores/memory' {
    export class MemoryVectorStore {
        constructor(embeddings: any);
        addDocuments(documents: any[]): Promise<void>;
        similaritySearch(query: string, k?: number): Promise<any[]>;
    }
} 