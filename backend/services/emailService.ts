import { Client } from '@elastic/elasticsearch';
import { SearchParams, EmailDocument, EmailCategory } from '../types/shared';
import { suggestReply } from './vectorStore';
import dotenv from 'dotenv';

dotenv.config();

// setup ES client
const esClient = new Client({ 
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200'
});

// Add interface for ES response types
interface ESHit {
    _source: EmailDocument;
    _id: string;
}

interface ESBucket {
    key: string;
    doc_count: number;
}

// search emails with filters
export async function searchEmails(params: SearchParams): Promise<EmailDocument[]> {
    try {
        let { searchText, account, folder, category } = params;
        let must: any[] = [];

        if(searchText?.trim()) {
            must.push({
                multi_match: {
                    query: searchText,
                    fields: ['subject', 'body', 'from']
                }
            });
        }

        if(account) must.push({ match: { account } });
        if(folder) must.push({ match: { folder } });
        if(category) must.push({ match: { category } });

        let { body } = await esClient.search({
            index: 'emails',
            body: {
                sort: [{ date: 'desc' }],
                query: {
                    bool: { must: must.length ? must : [{ match_all: {} }] }
                },
                size: 1000
            }
        });

        return body.hits.hits.map((hit: ESHit) => ({
            ...hit._source,
            id: hit._id
        }));
    } catch(err) {
        console.error('Search failed:', err);
        throw new Error('Failed to search emails');
    }
}

// get all emails
export async function getAllEmails(limit = 1000): Promise<EmailDocument[]> {
    try {
        let { body } = await esClient.search({
            index: 'emails',
            body: {
                sort: [{ date: 'desc' }],
                query: { match_all: {} },
                size: limit
            }
        });

        return body.hits.hits.map((hit: ESHit) => ({
            ...hit._source,
            id: hit._id
        }));
    } catch(err) {
        console.error('Failed to fetch emails:', err);
        throw new Error('Failed to get emails');
    }
}

// get unique accounts
export async function getUniqueAccounts(): Promise<string[]> {
    try {
        // check env vars first
        let configuredAccounts = [
            process.env.IMAP_USER_1,
            process.env.IMAP_USER_2
        ].filter(Boolean) as string[];

        if(configuredAccounts.length) return configuredAccounts;

        // fallback to ES query
        let { body } = await esClient.search({
            index: 'emails',
            body: {
                size: 0,
                aggs: {
                    unique_accounts: {
                        terms: { field: 'account', size: 100 }
                    }
                }
            }
        });

        return body.aggregations?.unique_accounts?.buckets
            .map((bucket: ESBucket) => bucket.key) || [];
    } catch(err) {
        console.error('Failed to get accounts:', err);
        return [];
    }
}

// get unique folders
export async function getUniqueFolders(): Promise<string[]> {
    try {
        let { body } = await esClient.search({
            index: 'emails',
            body: {
                size: 0,
                aggs: {
                    unique_folders: {
                        terms: { field: 'folder', size: 100 }
                    }
                }
            }
        });

        return body.aggregations?.unique_folders?.buckets
            .map((bucket: ESBucket) => bucket.key) || [];
    } catch(err) {
        console.error('Failed to get folders:', err);
        throw new Error('Failed to get folders');
    }
}

// get email by id
export async function getEmailById(id: string): Promise<EmailDocument | null> {
    try {
        let result = await esClient.get({
            index: 'emails',
            id: id
        });

        return {
            ...result.body._source,
            id: result.body._id
        };
    } catch(err) {
        console.error('Failed to get email:', err);
        return null;
    }
}

export const getReplysuggestion = async (emailId: string): Promise<string> => {
    try {
        console.log('Looking for email with ID:', emailId);
        
        const email = await getEmailById(emailId);
        console.log('Found email:', email);
        
        if (!email) {
            throw new Error('Email not found');
        }

        // Add validation for required fields
        if (!email.subject || !email.from || !email.body) {
            console.error('Email missing required fields:', email);
            throw new Error('Email missing required fields');
        }

        try {
            const emailContent = `
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}`;

            const reply = await suggestReply(emailContent);
            if (!reply) {
                throw new Error('No reply generated');
            }
            return reply;
        } catch (aiError) {
            console.error('Error generating reply:', aiError);
            throw new Error('Failed to generate reply');
        }
    } catch (error) {
        console.error('Error in getReplysuggestion:', error);
        throw error;
    }
}; 