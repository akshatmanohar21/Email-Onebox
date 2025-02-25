import OpenAI from 'openai';
import dotenv from 'dotenv';
import { EmailDocument } from '../types/shared';
import { getRelevantContext } from './vectorStore';

dotenv.config();

// quick openai setup
let openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// meeting link from env
let meetingLink = process.env.MEETING_LINK || 'https://cal.com/example';

export async function generateReplyForEmail(email: EmailDocument): Promise<string | null> {
    // only reply to interested emails
    if (email.category !== 'Interested') return null;

    try {
        // get context for email
        let context = await getRelevantContext(email.body);

        let prompt = `
        Context: You are an AI assistant helping with email replies. Use the following context about our product and outreach strategy to craft a relevant response:

        ${context}

        Meeting booking link: ${meetingLink}

        Training examples:
        1. Received: "I am interested in your services. Can we schedule a call?"
           Reply: "Thank you for your interest! Our email classification system helps sales teams save 5+ hours per week. I'd love to show you a demo - you can book a call here: ${meetingLink}"
        2. Received: "Your resume has been shortlisted. When can we schedule an interview?"
           Reply: "Thank you for considering my profile! Please schedule the interview at your convenience: ${meetingLink}"

        Now generate a professional and friendly reply for this email:
        From: ${email.from}
        Subject: ${email.subject}
        Body: ${email.body}

        Reply with just the message text. Include relevant product details from the context when appropriate.
        `;

        let completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: "gpt-3.5-turbo",
            temperature: 0.7,
            max_tokens: 300
        });

        return completion.choices[0].message.content?.trim() || null;
    } catch (err) {
        console.error('Reply gen failed:', err);
        return null;
    }
} 