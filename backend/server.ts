import express from "express";
import dotenv from "dotenv";
import { fetchEmails } from "./services/imapService";
import { initializeElasticsearchIndex, searchEmails, getUniqueAccounts, getUniqueFolders, getAllEmails } from "./services/elasticService";
import cors from 'cors';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Get all emails
app.get('/api/emails', async (req, res) => {
    try {
        const emails = await getAllEmails();
        res.json({ emails });
    } catch (error) {
        console.error('Error fetching emails:', error);
        res.status(500).json({ error: 'Failed to fetch emails' });
    }
});

// Search emails
app.get('/api/emails/search', async (req, res) => {
    try {
        const { searchText, folder, account } = req.query;
        const emails = await searchEmails({
            searchText: searchText as string,
            folder: folder as string,
            account: account as string
        });
        res.json({ emails });
    } catch (error) {
        console.error('Error searching emails:', error);
        res.status(500).json({ error: 'Failed to search emails' });
    }
});

// Get unique folders
app.get('/api/folders', async (req, res) => {
    try {
        const folders = await getUniqueFolders();
        res.json({ folders });
    } catch (error) {
        console.error('Error fetching folders:', error);
        res.status(500).json({ error: 'Failed to fetch folders' });
    }
});

// Get unique accounts
app.get('/api/accounts', async (req, res) => {
    try {
        const accounts = await getUniqueAccounts();
        res.json({ accounts });
    } catch (error) {
        console.error('Error fetching accounts:', error);
        res.status(500).json({ error: 'Failed to fetch accounts' });
    }
});

const startServer = async () => {
    try {
        console.log('Starting server initialization...');
        
        // Initialize Elasticsearch
        const indexCreated = await initializeElasticsearchIndex();
        if (!indexCreated) {
            throw new Error('Failed to initialize Elasticsearch index');
        }
        console.log('Elasticsearch index initialized');

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
