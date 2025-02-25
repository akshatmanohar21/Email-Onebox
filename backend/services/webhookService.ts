import axios from 'axios';
import dotenv from 'dotenv';
import { EmailDocument } from '../types/shared';

dotenv.config();

// webhook config
let webhookUrl = process.env.WEBHOOK_URL;
let TIMEOUT = 5000;

// webhook payload type
type WebhookData = {
    type: 'interested_email',
    data: {
        from: string,
        subject: string,
        account: string,
        folder: string,
        date: string,
        category: string
    }
}

/**
 * Send email data to webhook endpoint
 */
export async function triggerWebhook(email: EmailDocument): Promise<void> {
    if (!webhookUrl) {
        console.warn('No webhook url set');
        return;
    }

    try {
        let data = makePayload(email);
        await sendRequest(data);
        console.log('Webhook sent:', email.subject);
    } catch (err) {
        console.error('Webhook failed:', err);
        throw err;
    }
}

/**
 * Create formatted webhook payload
 */
function makePayload(email: EmailDocument): WebhookData {
    return {
        type: 'interested_email',
        data: {
            from: email.from,
            subject: email.subject,
            account: email.account,
            folder: email.folder,
            date: email.date,
            category: email.category
        }
    };
}

/**
 * Send request to webhook endpoint
 */
async function sendRequest(data: WebhookData): Promise<void> {
    await axios.post(webhookUrl!, data, {
        timeout: TIMEOUT,
        headers: {
            'Content-Type': 'application/json'
        }
    });
}
