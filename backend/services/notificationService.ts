import { WebClient } from '@slack/web-api';
import axios from 'axios';
import dotenv from 'dotenv';
import { EmailDocument } from '../types/shared';

dotenv.config();

// quick slack setup
let slack = new WebClient(process.env.SLACK_BOT_TOKEN);
let slackChannel = process.env.SLACK_CHANNEL_ID;
let webhookUrl = process.env.WEBHOOK_URL;

// slack msg type
type SlackMsg = {
    channel: string;
    text: string;
    blocks?: {
        type: string;
        text?: {
            type: string;
            text: string
        };
        fields?: {
            type: string;
            text: string
        }[]
    }[]
};

export async function sendNotifications(email: EmailDocument) {
    if (email.category !== 'Interested') return;

    try {
        // send both at once
        await Promise.all([
            sendSlackMsg(email),
            sendWebhook(email)
        ]);
    } catch (err) {
        console.error('Notification failed:', err);
    }
}

async function sendSlackMsg(email: EmailDocument) {
    if (!slackChannel) {
        console.warn('No slack channel set');
        return;
    }

    try {
        let msg = makeSlackMsg(email);
        let sent = await slack.chat.postMessage(msg);
        console.log('Slack sent:', sent.ts);
    } catch (err) {
        console.error('Slack failed:', err);
    }
}

function makeSlackMsg(email: EmailDocument): SlackMsg {
    return {
        channel: slackChannel!,
        text: `New Interested email: ${email.subject}`,
        blocks: [
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: "New Interested Email!"
                }
            },
            {
                type: "section",
                fields: [
                    { type: "mrkdwn", text: `*From:*\n${email.from}` },
                    { type: "mrkdwn", text: `*Subject:*\n${email.subject}` },
                    { type: "mrkdwn", text: `*Account:*\n${email.account}` },
                    { type: "mrkdwn", text: `*Folder:*\n${email.folder}` }
                ]
            }
        ]
    };
}

async function sendWebhook(email: EmailDocument) {
    if (!webhookUrl) {
        console.warn('No webhook url set');
        return;
    }

    try {
        let data = {
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

        let res = await axios.post(webhookUrl, data);
        console.log('Webhook sent:', res.status);
    } catch (err) {
        console.error('Webhook failed:', err);
    }
} 