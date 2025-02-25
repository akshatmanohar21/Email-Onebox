import { WebClient } from '@slack/web-api';
import axios from 'axios';
import dotenv from 'dotenv';
import { EmailDocument } from '../types/shared';
import { generateReplyForEmail } from './replyService';

dotenv.config();

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const SLACK_CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const WEBHOOK_URL = process.env.WEBHOOK_URL;

export async function sendNotifications(email: EmailDocument) {
    // Only send notifications for 'Interested' emails
    if (email.category !== 'Interested') return;

    try {
        // Send Slack notification
        await sendSlackNotification(email);
        
        // Trigger webhook
        await triggerWebhook(email);
    } catch (error) {
        console.error('Error sending notifications:', error);
    }
}

async function sendSlackNotification(email: EmailDocument) {
    try {
        const message = {
            channel: SLACK_CHANNEL_ID!,
            text: `🎯 New Interested Email!\n\n*From:* ${email.from}\n*Subject:* ${email.subject}\n*Account:* ${email.account}\n*Folder:* ${email.folder}`,
            blocks: [
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `🎯 *New Interested Email!*`
                    }
                },
                {
                    type: "section",
                    fields: [
                        {
                            type: "mrkdwn",
                            text: `*From:*\n${email.from}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Subject:*\n${email.subject}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Account:*\n${email.account}`
                        },
                        {
                            type: "mrkdwn",
                            text: `*Folder:*\n${email.folder}`
                        }
                    ]
                }
            ]
        };

        const result = await slack.chat.postMessage(message);
        console.log('✅ Slack notification sent:', result.ts);
    } catch (error) {
        console.error('Error sending Slack notification:', error);
    }
}

async function triggerWebhook(email: EmailDocument) {
    try {
        const payload = {
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

        const response = await axios.post(WEBHOOK_URL!, payload);
        console.log('✅ Webhook triggered:', response.status);
    } catch (error) {
        console.error('Error triggering webhook:', error);
    }
} 