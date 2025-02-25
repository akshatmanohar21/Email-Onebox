import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const triggerWebhook = async (email: any) => {
    await axios.post(process.env.WEBHOOK_URL, email);
};
