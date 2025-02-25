export type EmailCategory = 'Interested' | 'Meeting Booked' | 'Not Interested' | 'Spam' | 'Out of Office';

export interface SearchParams {
    searchText?: string;
    folder?: string;
    account?: string;
    category?: EmailCategory;
}

export interface EmailDocument {
    messageId: string;
    from: string;
    subject: string;
    body: string;
    date: Date;
    folder: string;
    account: string;
    category: EmailCategory;
}

export type Email = EmailDocument; 