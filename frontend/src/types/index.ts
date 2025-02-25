export interface Email {
    id: string;
    messageId: string;
    account: string;
    folder: string;
    from: string;
    subject: string;
    body: string;
    date: string;
    category: string;
}

export interface SearchParams {
    searchText?: string;
    folder?: string;
    account?: string;
    category?: string;
} 