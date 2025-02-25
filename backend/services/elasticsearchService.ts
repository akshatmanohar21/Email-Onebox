import { Client } from '@elastic/elasticsearch';
import dotenv from 'dotenv';

dotenv.config();

const client = new Client({ node: process.env.ELASTICSEARCH_URL });

export const storeEmail = async (email: any) => {
    await client.index({
        index: 'emails',
        body: email
    });
};
