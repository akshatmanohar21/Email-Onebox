import Imap = require("node-imap");
import { simpleParser, ParsedMail } from "mailparser";
import { storeEmail } from "./elasticService";
import { EmailDocument, EmailCategory } from '../types/shared';
import dotenv from "dotenv";
import { categorizeEmail } from './aiService';
import { sendNotifications } from './notificationService';

dotenv.config();

interface ImapAccount {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

// Configure IMAP accounts
const accounts: ImapAccount[] = [
    {
        user: process.env.IMAP_USER_1!,
        password: process.env.IMAP_PASS_1!,
        host: process.env.IMAP_HOST_1 || 'imap.gmail.com',
        port: 993,
        tls: true
    },
    {
        user: process.env.IMAP_USER_2!,
        password: process.env.IMAP_PASS_2!,
        host: process.env.IMAP_HOST_2 || 'imap.gmail.com',
        port: 993,
        tls: true
    }
];

const connectImap = (account: ImapAccount): Promise<Imap> => {
    return new Promise((resolve, reject) => {
        const imap = new Imap({
            user: account.user,
            password: account.password,
            host: account.host,
            port: account.port,
            tls: account.tls,
            tlsOptions: { rejectUnauthorized: false }
        });

        imap.once('ready', () => {
            console.log(`Connected to ${account.user}`);
            resolve(imap);
        });

        imap.once('error', (err) => {
            console.error(`Connection error for ${account.user}:`, err);
            reject(err);
        });

        imap.connect();
    });
};

const getFolders = async (imap: Imap): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        imap.getBoxes((err, boxes) => {
            if (err) {
                console.error('Error getting folders:', err);
                reject(err);
                return;
            }

            // Extract all folder names including Gmail special folders
            const folders: string[] = [];
            const processBoxes = (prefix: string, boxList: any) => {
                Object.keys(boxList).forEach(boxName => {
                    const fullName = prefix + boxName;
                    const attrs = boxList[boxName].attribs;
                    
                    // Skip folders with \Noselect attribute
                    if (!attrs.includes('\\Noselect')) {
                        console.log(`Found selectable folder: ${fullName}`);
                        folders.push(fullName);
                    } else {
                        console.log(`Skipping non-selectable folder: ${fullName}`);
                    }
                    
                    // Process subfolders
                    if (boxList[boxName].children) {
                        console.log(`Processing subfolders of: ${fullName}`);
                        processBoxes(fullName + '/', boxList[boxName].children);
                    }

                    // Log folder attributes
                    if (attrs && attrs.length > 0) {
                        console.log(`Folder ${fullName} attributes:`, attrs);
                    }
                });
            };

            console.log('Starting folder discovery...');
            processBoxes('', boxes);
            console.log('Folder discovery complete. Found folders:', folders);
            resolve(folders);
        });
    });
};

const fetchLastMonth = async (imap: Imap, account: ImapAccount, folder: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        const lastMonth = new Date();
        lastMonth.setDate(lastMonth.getDate() - 30);

        imap.openBox(folder, false, (err, box) => {
            if (err) {
                console.error(`Error opening folder ${folder}:`, err);
                resolve(); // Skip this folder but continue with others
                return;
            }

            const searchCriteria = [['SINCE', lastMonth]];
            imap.search(searchCriteria, (err, results) => {
                if (err) {
                    console.error(`Error searching in folder ${folder}:`, err);
                    resolve();
                    return;
                }

                if (results.length === 0) {
                    resolve();
                    return;
                }

                const fetch = imap.fetch(results, { bodies: '' });
                
                fetch.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        simpleParser(stream, async (err, parsed: ParsedMail) => {
                            if (err) {
                                console.error('Error parsing email:', err);
                                return;
                            }

                            // Generate a unique ID
                            const uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                            // Get AI categorization
                            const category = await categorizeEmail(
                                parsed.subject || 'No Subject',
                                parsed.text || ''
                            );

                            const emailData: EmailDocument = {
                                messageId: uniqueId,
                                account: account.user,
                                folder: folder,
                                from: parsed.from?.text || 'Unknown',
                                subject: parsed.subject || 'No Subject',
                                body: parsed.text || '',
                                date: parsed.date || new Date(),
                                category: category
                            };

                            try {
                                await storeEmail(emailData);
                                console.log(`📬 Email Processed: ${emailData.subject} (${category})`);
                                
                                // Send notifications if needed
                                await sendNotifications(emailData);
                            } catch (error) {
                                console.error('Error storing email:', error);
                            }
                        });
                    });
                });

                fetch.once('error', (err) => {
                    console.error(`Error fetching from folder ${folder}:`, err);
                    resolve();
                });
                fetch.once('end', () => resolve());
            });
        });
    });
};

export async function fetchEmails() {
    for (const account of accounts) {
        try {
            console.log(`Processing account: ${account.user}`);
            const imap = await connectImap(account);
            
            // Get all folders including Gmail special folders
            const folders = await getFolders(imap);
            console.log(`Found folders for ${account.user}:`, folders);

            // Process each folder
            for (const folder of folders) {
                try {
                    await fetchLastMonth(imap, account, folder);
                } catch (error) {
                    console.error(`Error processing folder ${folder}:`, error);
                    // Continue with other folders even if one fails
                }
            }

            // Set up IDLE mode for real-time updates
            imap.on('mail', async () => {
                console.log(`New email received for ${account.user}`);
                for (const folder of folders) {
                    await fetchLastMonth(imap, account, folder);
                }
            });

        } catch (error) {
            console.error(`Error processing account ${account.user}:`, error);
        }
    }
}