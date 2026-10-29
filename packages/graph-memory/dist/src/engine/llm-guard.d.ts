export declare function extractLlmStatus(error: unknown): number | null;
export declare class LlmFailureGuard {
    private readonly cooldownMs;
    private readonly now;
    private pausedUntil;
    constructor(cooldownMs?: number, now?: () => number);
    canRun(): boolean;
    remainingMs(): number;
    reset(): void;
    tripIfNeeded(error: unknown): boolean;
}
