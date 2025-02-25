import { client } from './elasticService';
import { SearchParams, EmailDocument as Email, EmailCategory } from '../types/shared';

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
        
        if (params.category && params.category !== 'All') {
            must.push({
                term: {
                    category: params.category as EmailCategory
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
        
        // Map the results and include the _id field
        const emails = result.hits.hits.map((hit: any) => ({
            ...hit._source,
            id: hit._id
        }));

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
    return result.aggregations.unique_accounts.buckets.map((b: any) => b.key);
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
    return result.aggregations.unique_folders.buckets.map((b: any) => b.key);
}; 