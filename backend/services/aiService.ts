import OpenAI from 'openai';
import dotenv from 'dotenv';
import { EmailCategory } from '../types/shared';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// quick delay helper
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// queue for rate limiting
let processing = false;
// define task type for queue
type QueueTask = () => Promise<void>;
const queue: QueueTask[] = [];

const processQueue = async () => {
    if (processing || !queue.length) return;
    processing = true;

    while (queue.length > 0) {
        let task = queue.shift();
        if (task) {
            await task();
            // wait a bit between calls
            await delay(100);
        }
    }

    processing = false;
};

export async function categorizeEmail(subject: string, body: string): Promise<EmailCategory> {
    try {
        console.log(`\nCategorizing email: "${subject.slice(0, 30)}..."`);
        
        let prompt = `
        Analyze this email and categorize it into one of these categories:
        - Interested (potential customer showing interest)
        - Meeting Booked (confirmed meeting/call)
        - Not Interested (clear rejection or not relevant)
        - Spam (promotional or spam content)
        - Out of Office (auto-reply or out of office)

        Subject: ${subject}
        Body: ${body}

        Reply with just the category name.
        `;

        let completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            max_tokens: 300
        });

        let category = completion.choices[0].message.content?.trim() as EmailCategory;
        
        console.log(`
Result:
- Subject: ${subject.slice(0, 50)}...
- Category: ${category}
- Status: ${completion.choices[0].finish_reason === 'stop' ? 'OK' : 'Warning'}
-------------------`);
        
        return category || EmailCategory.NotInterested;
    } catch (error) {
        console.error('Failed to categorize:', error);
        console.log('Using fallback category for:', subject);
        return EmailCategory.NotInterested;
    }
}
