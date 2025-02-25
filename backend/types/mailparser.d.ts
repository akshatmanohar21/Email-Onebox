export interface ParsedMail {
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