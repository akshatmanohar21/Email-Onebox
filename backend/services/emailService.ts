import { client } from './elasticService';
import { SearchParams, EmailDocument as Email, EmailCategory } from '../types/shared';
import { suggestReply } from './vectorStore';

export const searchEmails = async (params: SearchParams): Promise<Email[]> => {
    try {
        // Create the base query structure
        const must: any[] = [];
        
        // Add text search
        if (params.searchText) {
            must.push({
                multi_match: {
                    query: params.searchText,
                    fields: ['subject', 'body', 'from']
                }
            });
        }

        // Add filters
        if (params.account) {
            must.push({
                term: {
                    account: params.account
                }
            });
        }
        
        if (params.folder) {
            must.push({
                term: {
                    folder: params.folder
                }
            });
        }
        
        if (params.category && params.category !== ('All' as string)) {
            must.push({
                term: {
                    category: params.category
                }
            });
        }

        // Construct the final query
        const esQuery = {
            index: 'emails',
            body: {
                sort: [{ date: 'desc' }],
                query: {
                    bool: {
                        must: must.length > 0 ? must : [{ match_all: {} }]
                    }
                },
                size: 100
            }
        };

        console.log('Search query:', JSON.stringify(esQuery, null, 2));

        // Execute the search
        const result = await client.search(esQuery);
        const searchResponse = result as any;  // Type assertion for Elasticsearch response
        
        const emails = searchResponse.hits.hits.map((hit: any) => {
            console.log('Hit from ES:', hit);
            return {
                ...hit._source,
                id: hit._id,
                date: new Date(hit._source.date).toISOString()
            };
        });

        return emails;
    } catch (error) {
        console.error('Error searching emails:', error);
        throw error;
    }
};

export const getAllEmails = async (): Promise<Email[]> => {
    return searchEmails({});
};

export const getUniqueAccounts = async (): Promise<string[]> => {
    const result = await client.search({
        index: 'emails',
        body: {
            aggs: {
                unique_accounts: {
                    terms: { field: 'account' }
                }
            },
            size: 0
        }
    });
    const response = result as any;
    return response.aggregations.unique_accounts.buckets.map((b: any) => b.key);
};

export const getUniqueFolders = async (): Promise<string[]> => {
    const result = await client.search({
        index: 'emails',
        body: {
            aggs: {
                unique_folders: {
                    terms: { field: 'folder' }
                }
            },
            size: 0
        }
    });
    const response = result as any;
    return response.aggregations.unique_folders.buckets.map((b: any) => b.key);
};

const getEmailById = async (emailId: string): Promise<Email | null> => {
    try {
        console.log('Attempting to get email with ID:', emailId);
        const result = await client.get({
            index: 'emails',
            id: emailId
        });
        console.log('Raw Elasticsearch response:', result);
        
        // The _source is in result.body._source
        if (!result.body?._source) {
            console.log('No _source found in response');
            return null;
        }

        const email = {
            ...result.body._source,
            id: result.body._id
        };
        console.log('Returning email:', email);
        return email;
    } catch (error) {
        console.error('Error getting email by ID:', error);
        return null;
    }
};

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