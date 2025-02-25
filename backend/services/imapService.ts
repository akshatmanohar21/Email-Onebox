import Imap from "node-imap";
import { simpleParser } from "mailparser";
import { indexEmail } from "./elasticService";
import { EmailDocument } from '../types/shared';
import { categorizeEmail } from './aiService';
import { sendNotifications } from './notificationService';
import { EventEmitter } from 'events';
import dotenv from "dotenv";

dotenv.config();

// basic type for imap config
interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
    tlsOptions?: {
        rejectUnauthorized: boolean;
    };
}

// extend Imap types to fix type errors
interface ImapMessage {
    on(event: 'body', callback: (stream: any) => void): void;
}

interface ImapFetch {
    on(event: 'message', callback: (msg: ImapMessage) => void): void;
    on(event: 'error' | 'end', callback: () => void): void;
}

interface ImapBox {
    attribs: string[];
    children?: { [key: string]: ImapBox };
}

// basic types
interface ImapAccount {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

// event emitter for real-time updates
export const emailEventEmitter = new EventEmitter();

// basic imap settings
const IMAP_CONFIG = {
    PORT: 993,
    HOST: 'imap.gmail.com',
    TLS: true
};

// setup email accounts from env
const accounts: ImapAccount[] = [
    {
        user: process.env.IMAP_USER_1 || '',
        password: process.env.IMAP_PASS_1 || '',
        host: process.env.IMAP_HOST_1 || IMAP_CONFIG.HOST,
        port: IMAP_CONFIG.PORT,
        tls: IMAP_CONFIG.TLS
    },
    {
        user: process.env.IMAP_USER_2 || '',
        password: process.env.IMAP_PASS_2 || '',
        host: process.env.IMAP_HOST_2 || IMAP_CONFIG.HOST,
        port: IMAP_CONFIG.PORT,
        tls: IMAP_CONFIG.TLS
    }
].filter(account => account.user && account.password);

// imap events
interface ImapEvents {
    once(event: 'ready', listener: () => void): void;
    once(event: 'error', listener: (err: Error) => void): void;
}

// connect to imap
const connectImap = (account: ImapAccount): Promise<Imap> => {
    return new Promise((resolve, reject) => {
        let imap = new Imap({
            user: account.user,
            password: account.password,
            host: account.host,
            port: account.port,
            tls: account.tls,
            // @ts-ignore - node-imap accepts this but it's not in types
            tlsOptions: { rejectUnauthorized: false }
        }) as Imap & ImapEvents;

        imap.once('ready', () => resolve(imap));
        imap.once('error', (err: Error) => reject(err));
        imap.connect();
    });
};

// get folders from imap
const getFolders = async (imap: any): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        // @ts-ignore - imap types are incomplete
        imap.getBoxes((err: Error | null, boxes: { [key: string]: ImapBox }) => {
            if (err) {
                reject(err);
                return;
            }

            let folders: string[] = [];
            let processBoxes = (prefix: string, boxList: { [key: string]: ImapBox }) => {
                Object.keys(boxList).forEach(boxName => {
                    let fullName = prefix + boxName;
                    if (!boxList[boxName].attribs.includes('\\Noselect')) {
                        folders.push(fullName);
                    }
                    if (boxList[boxName].children) {
                        processBoxes(fullName + '/', boxList[boxName].children);
                    }
                });
            };

            processBoxes('', boxes);
            resolve(folders);
        });
    });
};

// process a single email
const processMessage = async (msg: any, account: ImapAccount, folder: string): Promise<void> => {
    return new Promise((resolve) => {
        msg.on('body', (stream: any) => {
            simpleParser(stream, async (err: Error | null, parsed: any) => {
                if (err) {
                    console.error('Error parsing email:', err);
                    resolve();
                    return;
                }

                try {
                    let emailData = await createEmailDocument(parsed, account, folder);
                    await indexEmail(emailData);
                    emailEventEmitter.emit('newEmail', emailData);
                    await sendNotifications(emailData);
                } catch (error) {
                    console.error('Error processing email:', error);
                }
                resolve();
            });
        });
    });
};

// create email doc from parsed message
const createEmailDocument = async (
    parsed: any, 
    account: ImapAccount, 
    folder: string
): Promise<EmailDocument> => {
    let uniqueId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let category = await categorizeEmail(
        parsed.subject || 'No Subject',
        parsed.text || ''
    );

    return {
        id: uniqueId,
        messageId: uniqueId,
        account: account.user,
        folder: folder,
        from: parsed.from?.text || 'Unknown',
        subject: parsed.subject || 'No Subject',
        body: parsed.text || '',
        date: (parsed.date || new Date()).toISOString(),
        category: category
    };
};

// fetch latest emails from folder
const fetchLatestEmails = async (
    imap: any, 
    account: ImapAccount, 
    folder: string
): Promise<void> => {
    return new Promise((resolve) => {
        imap.openBox(folder, false, async (err: Error | null) => {
            if (err) {
                console.error(`Error opening ${folder}:`, err);
                resolve();
                return;
            }

            try {
                // @ts-ignore - imap types are incomplete
                imap.search(['ALL', ['SINCE', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)]], 
                    async (err: Error | null, results: number[]) => {
                        if (err || !results.length) {
                            resolve();
                            return;
                        }

                        // @ts-ignore - imap types are incomplete
                        let fetch = imap.fetch(results, {
                            bodies: '',
                            struct: true
                        });

                        fetch.on('message', (msg: ImapMessage) => processMessage(msg, account, folder));
                        fetch.on('error', () => resolve());
                        fetch.on('end', () => resolve());
                    }
                );
            } catch (error) {
                console.error(`Error fetching from ${folder}:`, error);
                resolve();
            }
        });
    });
};

// keep connection alive and fetch emails
const maintainConnection = async (account: ImapAccount): Promise<void> => {
    while (true) {
        try {
            let imap = await connectImap(account);
            let folders = await getFolders(imap);

            for (let folder of folders) {
                await fetchLatestEmails(imap, account, folder);
            }

            // watch inbox for new emails
            await new Promise<void>((resolve) => {
                imap.openBox('INBOX', false, () => {
                    imap.on('mail', async () => {
                        try {
                            await fetchLatestEmails(imap, account, 'INBOX');
                        } catch (error) {
                            console.error('Error processing new email:', error);
                        }
                    });
                });
            });
        } catch (error) {
            console.error(`Connection error for ${account.user}:`, error);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
};

// start email fetching
export async function fetchEmails(): Promise<void> {
    accounts.forEach(account => {
        maintainConnection(account).catch(error => {
            console.error(`Error in maintainConnection for ${account.user}:`, error);
        });
    });
}