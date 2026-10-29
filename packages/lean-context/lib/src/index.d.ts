/**
 * dsh-lean-context — Token-saving orchestration for DeepSeek Harness.
 *
 * Five orthogonally-layered capabilities, each independently toggled via the
 * `lean-context` config block:
 *
 *   1. discipline  (systemPrompt) — Six-mode decision table + behaviour rules
 *   2. convergence (tools/MCP)     — Collapse N MCP tools into 2 schema-stable interfaces
 *   3. routing     (model-selection) — Flash direct-answer for simple questions
 *   4. audit       (diagnostic)    — Read-only context cost audit
 *   5. rebuild     (agentLoop)     — Bounded slice instead of growing transcript
 *
 * Layers 1 and 4 are implemented in-tree (low risk, no external deps). Layers
 * 2, 3 and 5 delegate to their upstream community plugins when enabled; this
 * bundle only owns the unified config surface and the discipline/audit cores.
 */
import { type DisciplineConfig } from './discipline.ts';
import { type AuditConfig } from './audit.ts';
export declare const name = "lean-context";
export declare const inject: string[];
export interface ConvergenceConfig {
    enabled: boolean;
    servers: readonly unknown[];
    cachePath: string;
    searchLimitDefault: number;
    searchLimitMax: number;
    allowTools: readonly string[];
    denyTools: readonly string[];
}
export interface RoutingConfig {
    enabled: boolean;
    flashModel: string;
    flashCredential: string;
    fallbackOnFailure: boolean;
}
export interface RebuildConfig {
    enabled: boolean;
    maxSliceTokens: number;
}
export interface Config {
    discipline: {
        enabled: boolean;
    };
    convergence: ConvergenceConfig;
    routing: RoutingConfig;
    audit: AuditConfig;
    rebuild: RebuildConfig;
}
export interface LeanContext {
    logger: {
        warn(message: unknown, ...args: unknown[]): void;
        info(message: unknown, ...args: unknown[]): void;
    };
    systemPrompt: {
        section(section: {
            name: string;
            order: number;
            text: string | (() => string);
        }): () => void;
    };
    tools: {
        register(definition: Record<string, unknown>): () => void;
    };
    sessions: {
        read(sessionId: string): Promise<unknown>;
    };
    fs: {
        read(path: string, options?: {
            encoding?: string;
        }): Promise<string>;
        stat(path: string): Promise<{
            size: number;
        }>;
        list(path: string): Promise<readonly string[]>;
    };
    on(event: string, listener: (...args: unknown[]) => unknown): () => void;
    effect(register: () => (() => void | Promise<void>), label?: string): () => void;
}
export declare function apply(ctx: LeanContext, rawConfig: Partial<Config>): () => void;
export type { DisciplineConfig, AuditConfig };
