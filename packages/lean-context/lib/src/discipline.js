/**
 * Discipline layer — injects a compact Six-Mode decision table and behaviour
 * rules into the system prompt so the agent self-budgets context depth and
 * output length per turn.
 *
 * Derived from the ZeroToken skill (phoenixlucky/zerotoken-skill), compressed
 * to a ~1.9 KB prompt section that is host-agnostic and dependency-free.
 */
const SECTION_NAME = 'lean-context:discipline';
const SECTION_ORDER = 160; // after tool schemas (150) and before persona tail
// The discipline prompt is intentionally compact: it tells the model HOW to
// decide context depth and output length, without enumerating every tool.
const DISCIPLINE_PROMPT = `# Lean Context — Six-Mode Discipline

## Mode decision table
| Trigger | Mode | First-turn output | Tool strategy |
|---|---|---|---|
| Definition / translation / short advice | A simple Q&A | 1-5 sentences direct | No tools |
| Single-file fix / config tweak | B small code change | Change + verify | search -> read(local) -> edit |
| Cross-module feature / refactor / CI | C multi-file task | 3-5 step short plan | glob -> tree -> batched read |
| Long doc / log / PR summary | D large synthesis | Points + evidence location | read(head+tail) -> search |
| Recurring bug / architecture mismatch | E major refactor | Diagnosis + plan + migration roadmap | codegraph -> explore -> trace -> batched read (do NOT skimp on diagnosis) |
| Windows + CJK text | F env adaptation | Adjust per 13 pitfall rules | write_file(.py) -> python -> git config -> complete_step |
| User says "save tokens" | ZeroToken enforced | Shortest executable output | Skip non-essential exploration |
| User says "explain in detail" | Exit ZeroToken | Normal verbose mode | No limit |

## Core discipline
1. Classify before budgeting — never default to full-read; decide depth by mode.
2. Progressive reading — locate first (search/glob), then read locally; 70KB+ uses offset+limit paging.
3. Results first — conclusions/complete-state first; reasoning on demand.
4. No restatement — do not repeat the question, no filler preamble, no common-sense explanation.
5. Plan only top-level steps, no bullets — bullets register as independent todos; use complete_step to skip when blocked.
6. Set stop conditions — stop after locating target + verifying; do not re-read unchanged files.
7. Minimal change — only modify what is in scope; no opportunistic refactoring; one issue per commit.
8. Verify before finish — compile / test / boundary / regression all pass before declaring done.

## Prompt template
Goal: <what to solve> | Input: <data/location> | Constraint: <must/must-not> | Output: <format/acceptance>.
Ask only when missing input would make the result unusable, and ask one question at a time.

## Output format
Task: done / changes / verification / notes (omit when no risk).
Research: conclusion / evidence / uncertainty / next step.
Refactor (E): problem / plan / migration (Step->verify) / risk / status.

## Encoding discipline (Windows/CJK)
- Text files uniform UTF-8 (.ps1 exception: BOM); open() always encoding='utf-8'.
- Never errors='replace' silent corruption; never PowerShell Add-Content for CJK (use Python open('a',encoding='utf-8')).
- Never python -c inline CJK (use write_file + python two-step); never && chain (use ;).
- Garbled display != corrupted file; never blindly transcode.

## When NOT to save tokens
Legal / medical / financial / time-sensitive; user explicitly asks "explain in detail / teach".
Quality floor: never omit safety/accuracy, never skip tests, never present guesses as fact.`;
export function applyDiscipline(ctx, _config) {
    return ctx.systemPrompt.section({
        name: SECTION_NAME,
        order: SECTION_ORDER,
        text: DISCIPLINE_PROMPT,
    });
}
