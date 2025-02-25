import { Client } from '@elastic/elasticsearch';
import { EmailDocument, EmailCategory, SearchParams } from '../types/shared';
import dotenv from "dotenv";

dotenv.config();

// basic client setup
const client = new Client({ 
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    maxRetries: 5,
    requestTimeout: 60000
});

// simple types for ES responses
interface ESHit {
    _id: string;
    _source: EmailDocument;
}

interface ESBucket {
    key: string;
    doc_count: number;
}

// basic type for search results
interface SearchResult {
    hits: {
        hits: ESHit[];
        total: {
            value: number;
        };
    };
}

// setup index with basic analyzer
export async function initializeElasticsearchIndex(): Promise<boolean> {
    try {
        // @ts-ignore - ES types are weird but this works
        await client.indices.create({
            index: 'emails',
            body: {
                settings: {
                    analysis: {
                        analyzer: {
                            email_analyzer: {
                                type: 'custom',
                                tokenizer: 'standard',
                                filter: ['lowercase', 'stop', 'trim']
                            }
                        }
                    }
                },
                mappings: {
                    properties: {
                        messageId: { type: 'keyword' },
                        account: { type: 'keyword' },
                        folder: { type: 'keyword' },
                        from: { type: 'text', analyzer: 'email_analyzer' },
                        subject: { type: 'text', analyzer: 'email_analyzer' },
                        body: { type: 'text', analyzer: 'email_analyzer' },
                        date: { type: 'date' },
                        category: { type: 'keyword' }
                    }
                }
            }
        });
        return true;
    } catch(err: any) {
        // index might already exist, that's fine
        if(err?.message?.includes('resource_already_exists')) return true;
        console.error('ES init failed:', err);
        return false;
    }
}

// store new email
export async function indexEmail(email: EmailDocument): Promise<void> {
    try {
        await client.index({
            index: 'emails',
            id: email.id,
            body: email,
            refresh: true
        });
    } catch(err) {
        console.error('Failed to index email:', err);
        throw err;
    }
}

// get all emails with optional limit
export async function getAllEmails(limit = 100): Promise<EmailDocument[]> {
    try {
        let { body } = await client.search({
            index: 'emails',
            body: {
                sort: [{ date: 'desc' }],
                query: { match_all: {} },
                size: limit
            }
        });

        // fix id handling
        return body.hits.hits.map((hit: ESHit) => {
            let doc = { ...hit._source };
            doc.id = hit._id;
            return doc;
        });
    } catch(err) {
        console.error('Failed to fetch emails:', err);
        throw err;
    }
}

// search with filters
export async function searchEmails(params: any): Promise<EmailDocument[]> {
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

    try {
        let { body } = await client.search({
            index: 'emails',
            body: {
                query: {
                    bool: { must: must.length ? must : [{ match_all: {} }] }
                },
                sort: [{ date: 'desc' }],
                size: 1000
            }
        });

        return body.hits.hits.map((hit: ESHit) => {
            let doc = { ...hit._source };
            doc.id = hit._id;
            return doc;
        });
    } catch(err) {
        console.error('Search failed:', err);
        throw err;
    }
}

// get unique accounts
export async function getUniqueAccounts(): Promise<string[]> {
    try {
        let { body } = await client.search({
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
        let { body } = await client.search({
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
        throw err;
    }
}

// Update storeEmail function
export const storeEmail = async (email: EmailDocument): Promise<void> => {
    try {
        console.log('Storing email with ID:', email.id);
        const result = await client.index({
            index: 'emails',
            id: email.id,
            body: email
        });
        console.log('Email stored with result:', result);
    } catch (error) {
        console.error('Error storing email:', error);
        throw error;
    }
};

// Update the getEmailById function
export const getEmailById = async (id: string) => {
    try {
        if (!id) {
            console.error('No ID provided to getEmailById');
            return null;
        }

        // Try to get by messageId first
        const searchResult = await client.search({
            index: 'emails',
            body: {
                query: {
                    match: {
                        messageId: id
                    }
                }
            }
        });

        if (searchResult.body.hits.hits.length > 0) {
            const hit = searchResult.body.hits.hits[0];
            return {
                ...hit._source,
                id: hit._id
            };
        }

        // If not found by messageId, try direct _id lookup
        const result = await client.get({
            index: 'emails',
            id: id
        });

        return {
            ...result.body._source,
            id: result.body._id
        };
    } catch (error) {
        console.error('Error fetching email:', error);
        return null;
    }
};

// Add this function to help debug
export const debugIndex = async () => {
    try {
        const result = await client.search({
            index: 'emails',
            body: {
                query: { match_all: {} },
                size: 1,
                _source: true
            }
        });
        
        const response = result.body as SearchResult;
        console.log('Sample document:', JSON.stringify(response.hits.hits[0], null, 2));
        console.log('Total documents:', response.hits.total.value);
    } catch (error) {
        console.error('Debug error:', error);
    }
};

// Add this to your existing code
export const debugEmailById = async (id: string) => {
    try {
        console.log('Debugging email ID:', id);
        // Try direct ID lookup
        const directResult = await client.get({
            index: 'emails',
            id: id
        }).catch(e => console.log('Direct lookup failed:', e.message));
        console.log('Direct lookup result:', directResult);

        // Try search with explicit type
        const searchResult = await client.search({
            index: 'emails',
            body: {
                query: {
                    match_all: {}
                },
                size: 10
            }
        });
        console.log('First 10 emails in index:', 
            searchResult.body.hits.hits.map((hit: ESHit) => ({
                id: hit._id,
                subject: hit._source.subject
            }))
        );
    } catch (error) {
        console.error('Debug error:', error);
    }
};

export const debugAllEmails = async () => {
    try {
        const result = await client.search({
            index: 'emails',
            body: {
                query: { match_all: {} },
                size: 1000,
                sort: [{ date: 'desc' }]
            }
        });
        
        console.log('Total emails in index:', result.body.hits.total);
        console.log('Sample of emails:', 
            result.body.hits.hits.map((hit: any) => ({
                id: hit._id,
                subject: hit._source.subject,
                account: hit._source.account,
                date: hit._source.date
            }))
        );
    } catch (error) {
        console.error('Debug error:', error);
    }
};

// Add a function to check for specific email
export async function debugFindEmail(subject: string): Promise<void> {
    try {
        const result = await client.search({
            index: 'emails',
            body: {
                query: {
                    match_phrase: {
                        subject: subject
                    }
                }
            }
        });
        console.log('Search for email:', subject);
        console.log('Results:', result.body.hits.hits);
    } catch (error) {
        console.error('Error searching for email:', error);
    }
}

// Add this function to clear the index
export async function clearEmailIndex(): Promise<void> {
    try {
        // Delete the index
        await client.indices.delete({
            index: 'emails',
            ignore_unavailable: true
        });
        console.log('Email index cleared successfully');
        
        // Recreate the index with proper mappings
        await initializeElasticsearchIndex();
        console.log('Email index reinitialized');
    } catch (error) {
        console.error('Error clearing email index:', error);
        throw error;
    }
}
