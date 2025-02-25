import { EventEmitter } from "events";

export interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

export interface ImapMessage {
    on(event: 'body', callback: (stream: NodeJS.ReadableStream) => void): void;
}

export interface ImapFetch {
    on(event: 'message', callback: (msg: ImapMessage) => void): void;
}

declare module "node-imap" {
    class Imap extends EventEmitter {
        constructor(config: ImapConfig);
        connect(): void;
        openBox(mailboxName: string, readOnly: boolean, callback: (err: Error | null, mailbox: any) => void): void;
        end(): void;
        on(event: 'mail', callback: () => void): void;
        once(event: 'ready', callback: () => void): void;
        seq: {
            fetch(source: string, options: { bodies: string }): ImapFetch;
        };
    }

    export default Imap;
}

declare module "mailparser" {
    interface ParsedMail {
        from?: {
            text: string;
        };
        subject?: string;
        text?: string;
        date?: Date;
    }

    export function simpleParser(
        stream: NodeJS.ReadableStream,
        callback: (err: Error | null, parsed: ParsedMail) => void
    ): void;

    export type { ParsedMail };
} 