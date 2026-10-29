export interface AuditConfig {
    enabled: boolean;
    cacheSeconds: number;
}
interface AuditContext {
    tools: {
        register(definition: Record<string, unknown>): () => void;
    };
    sessions: {
        read(sessionId: string): Promise<unknown>;
    };
}
export declare function applyAudit(ctx: AuditContext, config: AuditConfig): () => void;
export {};
