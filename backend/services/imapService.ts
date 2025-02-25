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

let imapConnections: Imap[] = [];

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

const fetchLatestEmail = async (imap: Imap, account: ImapAccount, folder: string): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
        imap.openBox(folder, false, (err, box) => {
            if (err) {
                console.error(`Error opening folder ${folder}:`, err);
                resolve();
                return;
            }

            // Search for the most recent email
            const searchCriteria = ['ALL'];
            imap.search(searchCriteria, (err, results) => {
                if (err || !results.length) {
                    resolve();
                    return;
                }

                // Get only the latest email (highest UID)
                const latestUID = Math.max(...results);
                const fetch = imap.fetch([latestUID], {
                    bodies: '',
                    // @ts-ignore - struct is a valid option but not in type definitions
                    struct: true
                });

                fetch.on('message', (msg) => {
                    processMessage(msg, account, folder);
                });

                fetch.once('error', (err) => {
                    console.error(`Error fetching latest email from ${folder}:`, err);
                    resolve();
                });
                fetch.once('end', () => resolve());
            });
        });
    });
};

const processMessage = async (msg: any, account: ImapAccount, folder: string) => {
    msg.on('body', (stream: NodeJS.ReadableStream) => {
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
};

const maintainConnection = async (account: ImapAccount) => {
    while (true) {
        try {
            console.log(`Establishing persistent connection for ${account.user}`);
            const imap = await connectImap(account);
            imapConnections.push(imap);
            
            const folders = await getFolders(imap);
            
            // Initial fetch
            for (const folder of folders) {
                await fetchLatestEmail(imap, account, folder);
            }

            // Keep INBOX open and watch for new emails
            await new Promise((resolve) => {
                imap.openBox('INBOX', false, (err) => {
                    if (err) {
                        console.error('Error opening INBOX:', err);
                        resolve(null);
                        return;
                    }

                    console.log(`INBOX opened for watching - ${account.user}`);
                    
                    // Listen for new emails without closing connection
                    imap.on('mail', async () => {
                        try {
                            console.log(`New email received for ${account.user}`);
                            await fetchLatestEmail(imap, account, 'INBOX');
                        } catch (error) {
                            console.error('Error processing new email:', error);
                            // Don't crash on email processing error
                        }
                    });
                });
            });

            // Keep connection alive and handle disconnects gracefully
            await new Promise((resolve) => {
                imap.on('end', () => {
                    console.log(`Connection ended for ${account.user}, will reconnect...`);
                    resolve(null);
                });
                
                imap.on('error', (err) => {
                    console.error(`Connection error for ${account.user}:`, err);
                    resolve(null);
                });
            });

        } catch (error) {
            console.error(`Connection error for ${account.user}:`, error);
        }
        // Wait before reconnecting
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
};

export async function fetchEmails() {
    // Start persistent connections for all accounts
    accounts.forEach(account => {
        maintainConnection(account).catch(error => {
            console.error(`Error in maintainConnection for ${account.user}:`, error);
        });
    });
}