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
import { applyDiscipline, type DisciplineConfig } from './discipline.ts'
import { applyAudit, type AuditConfig } from './audit.ts'

export const name = 'lean-context'
export const inject = ['systemPrompt', 'tools', 'sessions', 'fs']

export interface ConvergenceConfig {
  enabled: boolean
  servers: readonly unknown[]
  cachePath: string
  searchLimitDefault: number
  searchLimitMax: number
  allowTools: readonly string[]
  denyTools: readonly string[]
}

export interface RoutingConfig {
  enabled: boolean
  flashModel: string
  flashCredential: string
  fallbackOnFailure: boolean
}

export interface RebuildConfig {
  enabled: boolean
  maxSliceTokens: number
}

export interface Config {
  discipline: { enabled: boolean }
  convergence: ConvergenceConfig
  routing: RoutingConfig
  audit: AuditConfig
  rebuild: RebuildConfig
}

export interface LeanContext {
  logger: { warn(message: unknown, ...args: unknown[]): void; info(message: unknown, ...args: unknown[]): void }
  systemPrompt: {
    section(section: { name: string; order: number; text: string | (() => string) }): () => void
  }
  tools: {
    register(definition: Record<string, unknown>): () => void
  }
  sessions: {
    read(sessionId: string): Promise<unknown>
  }
  fs: {
    read(path: string, options?: { encoding?: string }): Promise<string>
    stat(path: string): Promise<{ size: number }>
    list(path: string): Promise<readonly string[]>
  }
  on(event: string, listener: (...args: unknown[]) => unknown): () => void
  effect(register: () => (() => void | Promise<void>), label?: string): () => void
}

export function apply(ctx: LeanContext, rawConfig: Partial<Config>): () => void {
  const config = resolveConfig(rawConfig)
  const disposers: Array<() => void> = []

  if (config.discipline.enabled) {
    disposers.push(applyDiscipline(ctx, config.discipline))
  }
  if (config.audit.enabled) {
    disposers.push(applyAudit(ctx, config.audit))
  }
  if (config.convergence.enabled) {
    ctx.logger.info(
      'lean-context: convergence layer is enabled but the in-tree MCP convergence adapter is not wired yet. ' +
        'Install `dsh-mcp-lens` and reference it from your profile, or await the bundled adapter.',
    )
  }
  if (config.routing.enabled) {
    ctx.logger.info(
      'lean-context: routing layer is enabled but the in-tree flash router is not wired yet. ' +
        'Install `dsh-model-router` or await the bundled router.',
    )
  }
  if (config.rebuild.enabled) {
    ctx.logger.warn(
      'lean-context: rebuild layer replaces the agent loop and is high-risk; ' +
        'install `dsh-slice-agent-loop` and verify event compatibility before enabling.',
    )
  }

  return () => {
    for (let i = disposers.length - 1; i >= 0; i--) disposers[i]?.()
  }
}

function resolveConfig(raw: Partial<Config> | undefined): Config {
  const base = raw ?? {}
  return {
    discipline: { enabled: base.discipline?.enabled ?? true },
    convergence: {
      enabled: base.convergence?.enabled ?? false,
      servers: base.convergence?.servers ?? [],
      cachePath: base.convergence?.cachePath ?? '',
      searchLimitDefault: base.convergence?.searchLimitDefault ?? 5,
      searchLimitMax: base.convergence?.searchLimitMax ?? 10,
      allowTools: base.convergence?.allowTools ?? [],
      denyTools: base.convergence?.denyTools ?? [],
    },
    routing: {
      enabled: base.routing?.enabled ?? false,
      flashModel: base.routing?.flashModel ?? '',
      flashCredential: base.routing?.flashCredential ?? '',
      fallbackOnFailure: base.routing?.fallbackOnFailure ?? true,
    },
    audit: {
      enabled: base.audit?.enabled ?? true,
      cacheSeconds: base.audit?.cacheSeconds ?? 60,
    },
    rebuild: {
      enabled: base.rebuild?.enabled ?? false,
      maxSliceTokens: base.rebuild?.maxSliceTokens ?? 32000,
    },
  }
}

export type { DisciplineConfig, AuditConfig }
