import express, { Request, Response as ExpressResponse } from "express";
import dotenv from "dotenv";
import { fetchEmails } from "./services/imapService";
import { initializeElasticsearchIndex, searchEmails, getUniqueAccounts, getUniqueFolders, getAllEmails } from "./services/elasticService";
import { SearchParams } from "./types/shared";
import cors from 'cors';
import { EmailCategory } from "./types/shared";
import { initVectorStore } from './services/vectorStore';
import { getReplysuggestion } from "./services/emailService";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: ExpressResponse) => {
    res.json({ status: 'ok' });
});

// Get all emails
app.get('/api/emails', async (_req: Request, res: ExpressResponse) => {
    try {
        const emails = await getAllEmails();
        res.json({ emails });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// Search emails
app.get('/api/emails/search', async (req: Request, res: ExpressResponse) => {
    try {
        const searchParams: SearchParams = {
            searchText: req.query.searchText as string,
            folder: req.query.folder as string,
            account: req.query.account as string,
            category: req.query.category as EmailCategory
        };
        const emails = await searchEmails(searchParams);
        res.json({ emails });
    } catch (error) {
        console.error('Error searching emails:', error);
        res.status(500).json({ error: 'Failed to search emails' });
    }
});

// Get unique folders
app.get('/api/folders', async (_req: Request, res: ExpressResponse) => {
    try {
        const folders = await getUniqueFolders();
        res.json({ folders });
    } catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

// Get unique accounts
app.get('/api/accounts', async (_req: Request, res: ExpressResponse) => {
    try {
        const accounts = await getUniqueAccounts();
        res.json({ accounts });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

// Get reply suggestion
app.get('/api/emails/:id/suggest-reply', async (req: Request, res: ExpressResponse) => {
    try {
        const emailId = req.params.id;
        const suggestedReply = await getReplysuggestion(emailId);
        res.json({ suggestedReply });
    } catch (error) {
        console.error('Error getting reply suggestion:', error);
        res.status(500).json({ error: 'Failed to get reply suggestion' });
    }
});

const startServer = async () => {
    try {
        console.log('Starting server initialization...');
        
        // Initialize Elasticsearch
        await initializeElasticsearchIndex();
        console.log('Elasticsearch index initialized');

        // Initialize Vector Store
        await initVectorStore();
        console.log('Vector store initialized');

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('Starting email fetch...');
            fetchEmails().catch(error => {
                console.error('Error in fetchEmails:', error);
            });
        });

    } catch (error) {
        console.error('Server initialization failed:', error);
        process.exit(1);
    }
};

startServer();
