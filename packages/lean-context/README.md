# dsh-lean-context

> 中文摘要：DeepSeek Harness 的省 token 编排插件。五层正交能力（纪律 / 收敛 / 路由 / 审计 / 重建），每层独立开关。纪律层与审计层为内置实现，开箱即用；收敛 / 路由 / 重建层委托上游社区插件。详见下文。

Token-saving orchestration for DeepSeek Harness. Five orthogonally-layered capabilities, each independently toggled via a single `lean-context` config block.

## Why

A DSH session pays tokens for three things every turn: the instruction chain, tool/MCP schemas, and the conversation transcript. Community plugins already exist for each surface, but they live in separate packages with separate configs. `dsh-lean-context` gives them one config surface and ships the two dependency-free layers (discipline + audit) in-tree so a fresh profile saves tokens before any extra plugin is installed.

## Architecture

| Layer | Seam | Source | Risk | Default |
|---|---|---|---|---|
| **discipline** | systemPrompt | in-tree (from ZeroToken skill) | low | **on** |
| **convergence** | tools / MCP | delegates to `dsh-mcp-lens` | low | off |
| **routing** | model-selection | delegates to `dsh-model-router` | medium | off |
| **audit** | diagnostic (read-only) | in-tree (from dsh-context-doctor) | low | **on** |
| **rebuild** | agentLoop | delegates to `dsh-slice-agent-loop` | **high** | off |

Layers never overlap: discipline writes one `systemPrompt.section`; audit registers one read-only tool; convergence/routing/rebuild act on disjoint seams when their upstream plugins are installed.

## Install

`dsh-lean-context` is a workspace package of this repo. It is already registered in the `web` profile bundle, so a normal `pnpm run build && pnpm dsh web` picks it up.

To enable the delegate layers, install their upstream plugins:

```sh
dsh plugin --profile web add dsh-mcp-lens        # convergence
dsh plugin --profile web add dsh-model-router     # routing
dsh plugin --profile web add dsh-slice-agent-loop # rebuild (high-risk, verify first)
```

## Config

Override the defaults in the web profile's `cordis.patch.yml` at `packages/bundle/web-app/cordis.patch.yml` (add an `- id: lean-context` block under the profile's `insert` list), or in your user profile at `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- id: lean-context
  config:
    discipline:
      enabled: true
    convergence:
      enabled: true                 # requires dsh-mcp-lens installed
      servers: []                   # your MCP server configs
      searchLimitDefault: 5
      searchLimitMax: 10
      allowTools: ["server/tool"]   # fail-closed glob allow-list
      denyTools: []
    routing:
      enabled: false
      flashModel: ''                # cheap fast model for simple Q&A
      flashCredential: ''            # DSH credential ref
    audit:
      enabled: true
      cacheSeconds: 60
    rebuild:
      enabled: false                # replaces the agent loop
      maxSliceTokens: 32000
```

## Usage

### discipline (auto)

No action needed. The Six-Mode decision table is injected into the system prompt at order 160 (after tool schemas). The agent self-budgets context depth and output length per turn.

Tell the agent `"省 token"` to enforce ZeroToken mode (shortest executable output, skip non-essential exploration); say `"详细解释"` to exit.

### audit (tool)

Call the `context_audit` tool in any session:

```
context_audit(cwd=".", includeSkillBodies=true, maxSkillBodies=50)
```

Returns per-file byte/token cost of `AGENTS.md` / `CLAUDE.md` / `.agents/skills/*/SKILL.md`, plus duplicate-body detection across skills. Read-only; safe to run anytime.

### convergence / routing / rebuild

When enabled and their upstream plugin is installed, these layers take effect automatically. See each plugin's README for tool-level usage. `dsh-lean-context` only owns the unified config toggle.

## Verification

After `pnpm run build && pnpm dsh web`, confirm the plugin is active:

1. Open http://127.0.0.1:3080 and go to **Settings → Plugins → Plugin inventory**. `lean-context` should show status **active**.
2. The discipline layer is working if a new session's system prompt contains the `# Lean Context — Six-Mode Discipline` section (visible in the prompt preview under Settings → Models, or via `--dump-config`).
3. The audit layer is working if the `context_audit` tool appears in the session's tool list. Invoke it with `context_audit(cwd=".")` to get a token-cost report of your `AGENTS.md` / `CLAUDE.md` / `.agents/skills/*/SKILL.md`.

If a delegate layer (convergence / routing / rebuild) is enabled but its upstream plugin is not installed, the DSH log prints an `lean-context: ... is enabled but ... is not wired yet` info/warn line and the layer is skipped — the in-tree layers still work.

## Environment

No environment variables required for the in-tree layers. Delegate layers follow their upstream plugins' requirements (e.g. `dsh-model-router` needs a flash model credential).

## Files

```
src/
├── index.ts       # unified entry; resolves config, wires layers
├── discipline.ts  # Six-Mode decision table systemPrompt section
└── audit.ts       # context_audit read-only tool
```

## Credits

- Discipline layer derived from [phoenixlucky/zerotoken-skill](https://github.com/phoenixlucky/zerotoken-skill) (GPL-3.0) — compressed to a host-agnostic prompt section.
- Audit layer inspired by [Zhenyu98/dsh-context-doctor](https://github.com/Zhenyu98/dsh-context-doctor).
- Convergence/routing/rebuild layer designs reference [dsh-mcp-lens](https://github.com/labmimors/dsh-mcp-lens), [dsh-model-router](https://github.com/tianji-qingtian/dsh-model-router), [dsh-slice-agent-loop](https://github.com/TT-Wang/dsh-slice-agent-loop).

## License

MIT
