export type EmailCategory = 'Interested' | 'Meeting Booked' | 'Not Interested' | 'Spam' | 'Out of Office';

export interface EmailDocument {
    messageId: string;
    account: string;
    folder: string;
    from: string;
    subject: string;
    body: string;
    date: Date;
    category: EmailCategory;
}

export interface SearchParams {
    searchText?: string;
    folder?: string;
    account?: string;
    category?: EmailCategory;
} 