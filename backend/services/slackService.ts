import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import { EmailDocument } from '../types/shared';

dotenv.config();

// quick setup
let slack = new WebClient(process.env.SLACK_BOT_TOKEN);
let channel = process.env.SLACK_CHANNEL_ID || 'general';

// basic msg type
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

/**
 * Send notification to Slack about new email
 */
export async function sendSlackNotification(email: EmailDocument): Promise<void> {
    if (!channel) {
        console.warn('No slack channel set');
        return;
    }

    try {
        let msg = makeMessage(email);
        await slack.chat.postMessage(msg);
        console.log('Slack sent for:', email.subject);
    } catch (err) {
        console.error('Slack failed:', err);
        throw err;
    }
}

function makeMessage(email: EmailDocument): SlackMsg {
    return {
        channel: channel,
        text: `New email: ${email.subject}`,
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
