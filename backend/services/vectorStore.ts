import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { OpenAI } from 'openai';

// setup openai
let openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// setup embeddings and store
let embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY,
});

let vectorStore = new MemoryVectorStore(embeddings);

// product docs for training
let docs = [
    new Document({
        pageContent: `
        Product: Email Management System
        Features:
        - AI-powered email categorization (Interested, Meeting Booked, Not Interested, Spam, Out of Office)
        - Real-time Slack notifications for important emails
        - Smart reply suggestions using RAG
        - Multiple email account support
        - Folder organization and search
        
        Use Cases:
        - Automatically categorize incoming emails
        - Get instant notifications for interested leads
        - Generate contextual replies
        - Manage multiple email accounts efficiently
        `,
        metadata: { type: 'product' }
    }),
    new Document({
        pageContent: `
        Response Guidelines:
        - For interview requests: Share calendar link (${process.env.MEETING_LINK})
        - For product inquiries: Highlight AI categorization and notification features
        - For technical questions: Mention multi-account support and folder organization
        - Always be professional and concise
        - Include relevant feature benefits based on the inquiry
        
        Common Scenarios:
        - Interview scheduling: Provide meeting link and availability
        - Technical questions: Focus on relevant features
        - General inquiries: Highlight key benefits
        `,
        metadata: { type: 'outreach' }
    })
];

// init store with docs
export const initVectorStore = async () => {
    await vectorStore.addDocuments(docs);
    console.log('Vector store ready');
};

// get relevant context for query
export async function getRelevantContext(query: string): Promise<string> {
    let results = await vectorStore.similaritySearch(query, 2);
    return results.map(doc => doc.pageContent).join('\n\n');
}

// suggest reply using RAG
export async function suggestReply(emailContent: string): Promise<string> {
    try {
        // get context
        let context = await getRelevantContext(emailContent);
        let meetingLink = process.env.MEETING_LINK;

        // build prompt
        let prompt = `
You are an AI assistant helping with email responses. Here's what you need to know:

Context about our system:
${context}

You just received this email:
${emailContent}

Please write a professional and friendly reply. Important guidelines:
1. If they're asking about an interview or meeting, include this calendar link: ${meetingLink}
2. Keep the tone warm but professional
3. Be concise - no more than 2-3 short paragraphs
4. If they ask about features, mention only the most relevant ones
5. End with a clear call to action

Write the reply now:`;

        // generate response
        let completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { 
                    role: "system", 
                    content: "You are a helpful and professional email assistant. Write clear, concise, and friendly responses." 
                },
                { role: "user", content: prompt }
            ],
            temperature: 0.7
        });

        return completion.choices[0].message.content || "Could not generate a reply.";
    } catch (err) {
        console.error('Reply gen failed:', err);
        throw err;
    }
} 