import { Client } from '@elastic/elasticsearch';
import { EmailDocument, EmailCategory, SearchParams } from '../types/shared';
import dotenv from "dotenv";

dotenv.config();

export const client = new Client({ 
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    maxRetries: 5,
    requestTimeout: 60000
});

interface SearchResult {
    hits: {
        total: { value: number; relation: string };
        hits: Array<{
            _id: string;
            _source: EmailDocument;
        }>;
    };
    aggregations?: {
        [key: string]: {
            buckets: Array<{
                key: string;
                doc_count: number;
            }>;
        };
    };
}

interface ElasticsearchHit {
    _id: string;
    _source: EmailDocument;
}

interface ElasticsearchBucket {
    key: string;
    doc_count: number;
}

// Function to check and create index if it doesn't exist
export async function initializeElasticsearchIndex(): Promise<boolean> {
    try {
        // Try to delete the index if it exists, ignore 404 errors
        try {
            await client.indices.delete({ index: 'emails' });
            console.log('Deleted existing index');
        } catch (error: any) {
            if (error.meta?.body?.status !== 404) {
                throw error; // Re-throw if it's not a 404 error
            }
            console.log('No existing index to delete');
        }

        // Create new index with mappings
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
                        from: { 
                            type: 'text',
                            analyzer: 'email_analyzer'
                        },
                        subject: { 
                            type: 'text',
                            analyzer: 'email_analyzer'
                        },
                        body: { 
                            type: 'text',
                            analyzer: 'email_analyzer'
                        },
                        date: { type: 'date' },
                        category: { type: 'keyword' }
                    }
                }
            }
        });

        console.log('Created new index with mappings');
        return true;
    } catch (error) {
        console.error('Error initializing Elasticsearch:', error);
        return false;
    }
}

// Function to index an email
export async function indexEmail(email: EmailDocument): Promise<void> {
    try {
        console.log('Indexing email with ID:', email.id);
        await client.index({
            index: 'emails',
            id: email.id,
            body: {
                ...email,
                date: new Date(email.date).toISOString()
            },
            refresh: true
        });
        console.log(`📥 Indexed email: ${email.subject}`);
    } catch (error) {
        console.error('Error indexing email:', error);
    }
}

export async function getAllEmails(): Promise<EmailDocument[]> {
    try {
        const { body } = await client.search({
            index: 'emails',
            body: {
                sort: [{ date: 'desc' }],
                query: {
                    match_all: {}
                },
                size: 100 // Limit to 100 emails for performance
            }
        });

        return (body.hits?.hits || []).map((hit: ElasticsearchHit) => ({
            id: hit._id,
            messageId: hit._source.messageId,
            from: hit._source.from,
            subject: hit._source.subject,
            body: hit._source.body,
            date: hit._source.date,
            folder: hit._source.folder,
            account: hit._source.account,
            category: hit._source.category
        }));
    } catch (error) {
        console.error('Error fetching all emails:', error);
        throw error;
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

// Update searchEmails function with proper typing
export async function searchEmails(params: SearchParams): Promise<EmailDocument[]> {
    try {
        const { searchText, folder, account, category } = params;
        const must: any[] = [];
        
        if (searchText) {
            must.push({
                multi_match: {
                    query: searchText,
                    fields: ['subject^2', 'body', 'from']
                }
            });
        }

        if (folder) {
            must.push({ term: { folder: folder } });
        }

        if (account) {
            must.push({ term: { account: account } });
        }

        if (category) {
            must.push({ term: { category: category } });
        }

        const searchQuery = {
            index: 'emails',
            body: {
                sort: [{ date: 'desc' }],
                query: {
                    bool: {
                        must: must.length > 0 ? must : [{ match_all: {} }]
                    }
                }
            }
        };

        console.log('Search query:', JSON.stringify(searchQuery, null, 2));
        const { body } = await client.search(searchQuery);

        return (body.hits?.hits || []).map((hit: ElasticsearchHit) => ({
            ...hit._source,
            id: hit._id
        }));
    } catch (error) {
        console.error('Error searching emails:', error);
        throw error;
    }
}

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

// Update getUniqueAccounts function with proper typing
export async function getUniqueAccounts(): Promise<string[]> {
    try {
        const { body } = await client.search({
            index: 'emails',
            body: {
                size: 0,
                aggs: {
                    unique_accounts: {
                        terms: {
                            field: 'account',
                            size: 100
                        }
                    }
                }
            }
        });

        return (body.aggregations?.unique_accounts?.buckets || [])
            .map((bucket: ElasticsearchBucket) => bucket.key);
    } catch (error) {
        console.error('Error fetching unique accounts:', error);
        throw error;
    }
}

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

// Update getUniqueFolders function with proper typing
export async function getUniqueFolders(): Promise<string[]> {
    try {
        const { body } = await client.search({
            index: 'emails',
            body: {
                size: 0,
                aggs: {
                    unique_folders: {
                        terms: {
                            field: 'folder',
                            size: 100
                        }
                    }
                }
            }
        });

        return (body.aggregations?.unique_folders?.buckets || [])
            .map((bucket: ElasticsearchBucket) => bucket.key);
    } catch (error) {
        console.error('Error fetching unique folders:', error);
        throw error;
    }
}

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
            searchResult.body.hits.hits.map((hit: ElasticsearchHit) => ({
                id: hit._id,
                subject: hit._source.subject
            }))
        );
    } catch (error) {
        console.error('Debug error:', error);
    }
};
