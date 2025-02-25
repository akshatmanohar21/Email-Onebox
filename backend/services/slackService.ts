import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const sendSlackNotification = async (email: any) => {
    await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: `New Interested email: ${email.subject}`
    });
};
