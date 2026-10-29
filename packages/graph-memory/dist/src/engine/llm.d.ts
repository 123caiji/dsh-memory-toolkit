/**
 * graph-memory
 *
 */
export interface LlmConfig {
    apiKey?: string;
    baseURL?: string;
    baseUrl?: string;
    model?: string;
}
export type CompleteFn = (system: string, user: string) => Promise<string>;
export declare function createCompleteFn(provider: string, model: string, llmConfig?: LlmConfig, anthropicApiKey?: string): CompleteFn;
