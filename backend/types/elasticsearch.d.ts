declare module '@elastic/elasticsearch' {
    export class Client {
        constructor(config: any);
        index(params: any): Promise<any>;
        search(params: any): Promise<any>;
        get(params: any): Promise<any>;
        indices: {
            create(params: any): Promise<any>;
            delete(params: any): Promise<any>;
        };
    }
} 