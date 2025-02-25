export type EmailCategory = 
    | "All"
    | "Interested"
    | "Meeting Booked"
    | "Not Interested"
    | "Spam"
    | "Out of Office";

export interface SearchParams {
    searchText?: string;
    folder?: string;
    account?: string;
    category?: EmailCategory;
}

export interface EmailDocument {
    id: string;
    messageId: string;
    from: string;
    subject: string;
    body: string;
    date: string;
    folder: string;
    account: string;
    category: EmailCategory;
}

export type Email = EmailDocument; 