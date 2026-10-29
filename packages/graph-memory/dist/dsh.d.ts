export declare const name = "graph-memory-dsh";
export declare const inject: string[];
interface DshEmbeddingConfig {
    apiKeyEnv?: string;
    baseURL?: string;
    baseUrl?: string;
    model?: string;
    dimensions?: number;
}
export interface Config {
    dbPath?: string;
    extractionEnabled?: boolean;
    recallEnabled?: boolean;
    recallMaxNodes?: number;
    recallMaxDepth?: number;
    maintenanceInterval?: number;
    llmProvider?: string;
    llmModel?: string;
    llmMaxTokens?: number;
    embedding?: DshEmbeddingConfig;
}
interface DshContext {
    logger: {
        info(message: unknown, ...args: unknown[]): void;
        warn(message: unknown, ...args: unknown[]): void;
        error(message: unknown, ...args: unknown[]): void;
    };
    llm: {
        stream(options: Record<string, unknown>): AsyncIterable<any>;
    };
    tools: {
        register(definition: Record<string, unknown>): () => void;
    };
    credentials: {
        resolve(ref: string): Promise<{
            value: string;
            source: string;
        } | undefined>;
    };
    on(event: string, listener: (...args: any[]) => any, options?: Record<string, unknown>): () => void;
    effect(register: () => (() => void | Promise<void>), label?: string): () => void;
}
export declare function apply(ctx: DshContext, input?: Config): void;
export {};
