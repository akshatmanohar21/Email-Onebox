import * as Imap from 'node-imap';

declare module 'node-imap' {
    import { EventEmitter } from 'events';

    namespace Imap {
        interface Config {
            user: string;
            password?: string;
            host: string;
            port: number;
            tls: boolean;
            tlsOptions?: {
                rejectUnauthorized: boolean;
                servername?: string;
            };
            authTimeout?: number;
            auth?: {
                type: string;
                user: string;
                pass?: string;
            };
        }

        interface Box {
            children?: { [key: string]: Box };
            delimiter?: string;
            flags?: string[];
            name: string;
            readOnly: boolean;
            uidvalidity?: number;
            uidnext?: number;
            permFlags?: string[];
            persistentUIDs?: boolean;
            messages?: {
                total: number;
                new: number;
                unseen: number;
            };
        }

        interface MessageFetch extends EventEmitter {
            on(event: 'message', listener: (msg: Message) => void): this;
            once(event: 'error' | 'end', listener: (err?: Error) => void): this;
        }

        interface Message extends EventEmitter {
            on(event: 'body', listener: (stream: NodeJS.ReadableStream) => void): this;
        }
    }

    class Imap extends EventEmitter {
        constructor(config: Imap.Config);
        connect(): void;
        end(): void;
        openBox(name: string, readOnly: boolean, cb: (err: Error | null, box: Imap.Box) => void): void;
        search(criteria: any[], cb: (err: Error | null, uids: number[]) => void): void;
        fetch(source: number[], options: { bodies: string }): Imap.MessageFetch;
        getBoxes(cb: (err: Error | null, boxes: { [key: string]: Imap.Box }) => void): void;
        idle(): void;
        idle(callback: (err: Error) => void): void;
        idle(useQueue: boolean, callback?: (err: Error) => void): void;
    }

    export = Imap;
} 