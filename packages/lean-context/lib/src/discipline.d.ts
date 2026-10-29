/**
 * Discipline layer — injects a compact Six-Mode decision table and behaviour
 * rules into the system prompt so the agent self-budgets context depth and
 * output length per turn.
 *
 * Derived from the ZeroToken skill (phoenixlucky/zerotoken-skill), compressed
 * to a ~1.9 KB prompt section that is host-agnostic and dependency-free.
 */
export interface DisciplineConfig {
    enabled: boolean;
}
export declare function applyDiscipline(ctx: {
    systemPrompt: {
        section(section: {
            name: string;
            order: number;
            text: string | (() => string);
        }): () => void;
    };
}, _config: DisciplineConfig): () => void;
