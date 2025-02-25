import express, { Request, Response as ExpressResponse } from "express";
import dotenv from "dotenv";
import { fetchEmails } from "./services/imapService";
import { initializeElasticsearchIndex, searchEmails, getUniqueAccounts, getUniqueFolders, getAllEmails, debugAllEmails, debugFindEmail, clearEmailIndex } from "./services/elasticService";
import { SearchParams } from "./types/shared";
import cors from 'cors';
import { EmailCategory } from "./types/shared";
import { initVectorStore } from './services/vectorStore';
import { getReplysuggestion } from "./services/emailService";
import { emailEventEmitter } from "./services/imapService";

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
        console.log('Sending accounts:', accounts);  // Debug log
        res.json(accounts);  // Send array directly
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.json([]);  // Send empty array on error
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

// Add SSE endpoint
app.get('/api/email-updates', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const listener = () => {
        res.write('event: refresh\ndata: update\n\n');
    };

    emailEventEmitter.on('newEmail', listener);

    req.on('close', () => {
        emailEventEmitter.off('newEmail', listener);
    });
});

const startServer = async () => {
    try {
        console.log('Starting server initialization...');
        
        // Clear and reinitialize Elasticsearch
        await clearEmailIndex();
        console.log('Elasticsearch index reset');

        // Initialize Vector Store
        await initVectorStore();
        console.log('Vector store initialized');

        // Start the server
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
            console.log('Starting fresh email fetch...');
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
