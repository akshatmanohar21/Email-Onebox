import OpenAI from 'openai';
import dotenv from 'dotenv';
import { EmailCategory } from '../types/shared';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Add delay function with exponential backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Add rate limiting queue
const queue: Array<() => Promise<void>> = [];
let processing = false;

const processQueue = async () => {
    if (processing || queue.length === 0) return;
    processing = true;

    while (queue.length > 0) {
        const task = queue.shift();
        if (task) {
            await task();
            // Add a small delay between requests
            await delay(100);
        }
    }

    processing = false;
};

export async function categorizeEmail(subject: string, body: string): Promise<EmailCategory> {
    try {
        console.log('\n🔍 Starting AI categorization for email:', subject);
        
        const prompt = `
        Analyze this email and categorize it into one of these categories:
        - Interested: Shows interest in a job/opportunity
        - Meeting Booked: Confirms a meeting or interview
        - Not Interested: Rejection or lack of interest
        - Spam: Promotional or spam content
        - Out of Office: Auto-reply or out of office message

        Email Subject: ${subject}
        Email Body: ${body}

        Respond with ONLY ONE of the exact category names listed above.
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            temperature: 0,
            max_tokens: 10
        });

        const category = completion.choices[0].message.content?.trim() as EmailCategory;
        
        // Enhanced logging
        console.log(`
📧 Email Categorization Results:
Subject: ${subject}
Category: ${category}
Confidence: ${completion.choices[0].finish_reason === 'stop' ? 'High' : 'Low'}
----------------------------------------`);
        
        return category || EmailCategory.NotInterested;
    } catch (error) {
        console.error('❌ Error categorizing email:', error);
        console.log('⚠️ Defaulting to "Not Interested" category for:', subject);
        return EmailCategory.NotInterested;
    }
}
