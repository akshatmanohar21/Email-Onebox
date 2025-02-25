export interface Email {
    messageId: string;
    from: string;
    subject: string;
    body: string;
    date: string;
    folder: string;
    account: string;
    category: 'Interested' | 'Meeting Booked' | 'Not Interested' | 'Spam' | 'Out of Office';
}

export interface SearchParams {
    searchText?: string;
    folder?: string;
    account?: string;
    category?: string;
} 