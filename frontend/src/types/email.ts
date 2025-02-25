import { EmailCategory } from './emailCategory';

export interface Email {
    id: string;
    messageId: string;
    from: string;
    subject: string;
    body: string;
    date: Date;
    folder: string;
    account: string;
    category: EmailCategory;
} 