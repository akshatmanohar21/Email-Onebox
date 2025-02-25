export enum EmailCategory {
    All = 'All',
    Interested = 'Interested',
    NotInterested = 'Not Interested',
    MeetingBooked = 'Meeting Booked',
    Spam = 'Spam'
}

export interface EmailDocument {
    id: string;
    messageId: string;
    account: string;
    folder: string;
    from: string;
    subject: string;
    body: string;
    date: string;
    category: EmailCategory;
}

export interface SearchParams {
    searchText?: string;
    folder?: string;
    account?: string;
    category?: EmailCategory;
}

export interface Email {
    id: string;
    subject: string;
    from: string;
    body: string;
    date: string;
    category: EmailCategory;
    folder: string;
    account: string;
} 