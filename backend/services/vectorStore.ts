import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from "langchain/vectorstores/memory";

// Initialize embeddings and vector store
const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
});

const vectorStore = new MemoryVectorStore(embeddings);

// Sample product/outreach data
const productDocs = [
    new Document({
        pageContent: `
        Product: Email Classification System
        Features:
        - Automatic email categorization
        - Slack notifications for interested leads
        - Smart reply suggestions
        - Integration with calendar for booking meetings
        
        Pricing:
        - Basic: $49/month
        - Pro: $99/month
        - Enterprise: Custom pricing
        
        Target audience: Sales teams and recruiters
        `,
        metadata: { type: 'product' }
    }),
    new Document({
        pageContent: `
        Outreach Strategy:
        - Initial contact through personalized emails
        - Follow up within 48 hours
        - Offer product demo calls
        - Share case studies of successful implementations
        
        Key selling points:
        - Save 5+ hours per week on email management
        - Increase response rate by 35%
        - Never miss an interested lead
        `,
        metadata: { type: 'outreach' }
    })
];

// Initialize vector store
export const initVectorStore = async () => {
    await vectorStore.addDocuments(productDocs);
    console.log('Vector store initialized with product docs');
};

export async function getRelevantContext(query: string): Promise<string> {
    const results = await vectorStore.similaritySearch(query, 2);
    return results.map((doc: Document) => doc.pageContent).join('\n\n');
} 