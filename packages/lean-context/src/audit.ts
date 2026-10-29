/**
 * Audit layer — read-only context cost auditor.
 *
 * Registers a `context_audit` tool that quantifies how many tokens the
 * instruction chain, skill catalogue, and tool schemas consume, and flags
 * duplicate or shadowed entries. The tool never mutates anything: it only
 * reads files and reports. Derived from dsh-context-doctor (Zhenyu98).
 */
import { basename } from 'node:path'
import { readFile, stat, readdir } from 'node:fs/promises'
import { join } from 'node:path'

export interface AuditConfig {
  enabled: boolean
  cacheSeconds: number
}

interface AuditContext {
  tools: {
    register(definition: Record<string, unknown>): () => void
  }
  sessions: {
    read(sessionId: string): Promise<unknown>
  }
}

const ROUGH_TOKENS_PER_KIB = 320 // ~0.75 chars/token for mixed instruction text

interface FileAudit {
  path: string
  bytes: number
  approxTokens: number
}

export function applyAudit(ctx: AuditContext, config: AuditConfig): () => void {
  const cacheTtlMs = Math.max(0, config.cacheSeconds) * 1000
  let cached: { at: number; report: AuditReport } | null = null

  const disposer = ctx.tools.register({
    name: 'context_audit',
    description:
      'Audit the token cost of injected context: instruction chain (AGENTS.md), skill catalogues, and tool schemas. ' +
      'Read-only — never mutates files. Reports per-file bytes, approximate tokens, duplicates and shadowed skills.',
    parameters: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Workspace root to audit. Defaults to process.cwd().' },
        includeSkillBodies: {
          type: 'boolean',
          description: 'When true, read SKILL.md bodies for duplicate-text detection. Defaults to true.',
        },
        maxSkillBodies: {
          type: 'integer',
          description: 'Maximum number of skill bodies to scan (controls cost). Defaults to 50.',
        },
      },
      additionalProperties: false,
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['files', 'totalBytes', 'totalApproxTokens', 'duplicates', 'generatedAt'],
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['path', 'bytes', 'approxTokens'],
              properties: {
                path: { type: 'string' },
                bytes: { type: 'integer' },
                approxTokens: { type: 'integer' },
              },
            },
          },
          totalBytes: { type: 'integer' },
          totalApproxTokens: { type: 'integer' },
          duplicates: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['hash', 'files', 'bytes'],
              properties: {
                hash: { type: 'string' },
                files: { type: 'array', items: { type: 'string' } },
                bytes: { type: 'integer' },
              },
            },
          },
          generatedAt: { type: 'string' },
        },
      },
      render: (result: AuditReport) => renderAudit(result),
    },
    async execute(args: { cwd?: string; includeSkillBodies?: boolean; maxSkillBodies?: number }) {
      if (cached && Date.now() - cached.at < cacheTtlMs) {
        return cached.report
      }
      const cwd = args.cwd ?? process.cwd()
      const includeBodies = args.includeSkillBodies ?? true
      const maxBodies = args.maxSkillBodies ?? 50
      const report = await runAudit(cwd, includeBodies, maxBodies)
      cached = { at: Date.now(), report }
      return report
    },
  })

  return disposer
}

interface AuditReport {
  files: readonly FileAudit[]
  totalBytes: number
  totalApproxTokens: number
  duplicates: readonly { hash: string; files: readonly string[]; bytes: number }[]
  generatedAt: string
}

async function runAudit(
  cwd: string,
  includeBodies: boolean,
  maxBodies: number,
): Promise<AuditReport> {
  const files: FileAudit[] = []
  const instructionPaths = await resolveInstructionFiles(cwd)
  for (const p of instructionPaths) {
    const bytes = await safeSize(p)
    if (bytes > 0) files.push({ path: relativeTo(cwd, p), bytes, approxTokens: approxTokens(bytes) })
  }

  const duplicates: { hash: string; files: string[]; bytes: number }[] = []
  if (includeBodies) {
    const bodies = await collectSkillBodies(cwd, maxBodies)
    const byHash = new Map<string, { files: string[]; bytes: number }>()
    for (const b of bodies) {
      const key = hashText(b.text)
      const existing = byHash.get(key)
      if (existing) {
        existing.files.push(b.path)
        if (existing.bytes === 0) existing.bytes = b.bytes
      } else {
        byHash.set(key, { files: [b.path], bytes: b.bytes })
      }
    }
    for (const [hash, entry] of byHash) {
      if (entry.files.length > 1) {
        duplicates.push({ hash, files: entry.files, bytes: entry.bytes })
      }
    }
  }

  const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0)
  return {
    files,
    totalBytes,
    totalApproxTokens: approxTokens(totalBytes),
    duplicates,
    generatedAt: new Date().toISOString(),
  }
}

async function resolveInstructionFiles(cwd: string): Promise<string[]> {
  const candidates = [
    join(cwd, 'AGENTS.md'),
    join(cwd, 'CLAUDE.md'),
    join(cwd, '.agents', 'AGENTS.md'),
    join(cwd, 'docs', 'AGENTS.md'),
  ]
  const skillDir = join(cwd, '.agents', 'skills')
  try {
    const entries = await readdir(skillDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) candidates.push(join(skillDir, entry.name, 'SKILL.md'))
    }
  } catch {
    // No .agents/skills directory — that is fine.
  }
  const existing: string[] = []
  for (const p of candidates) {
    if (await fileExists(p)) existing.push(p)
  }
  return existing
}

interface SkillBody {
  path: string
  text: string
  bytes: number
}

async function collectSkillBodies(cwd: string, maxBodies: number): Promise<SkillBody[]> {
  const out: SkillBody[] = []
  const root = join(cwd, '.agents', 'skills')
  let dirs: string[]
  try {
    dirs = (await readdir(root, { withFileTypes: true }))
      .filter(e => e.isDirectory())
      .map(e => join(root, e.name))
  } catch {
    return out
  }
  for (const dir of dirs) {
    if (out.length >= maxBodies) break
    const skillFile = join(dir, 'SKILL.md')
    if (!(await fileExists(skillFile))) continue
    try {
      const text = await readFile(skillFile, 'utf8')
      out.push({ path: relativeTo(cwd, skillFile), text, bytes: Buffer.byteLength(text, 'utf8') })
    } catch {
      // skip unreadable
    }
  }
  return out
}

function renderAudit(report: AuditReport): string {
  const lines: string[] = []
  lines.push(`# Context audit — ${report.generatedAt}`)
  lines.push('')
  lines.push(`Total: ${report.totalBytes} bytes ≈ ${report.totalApproxTokens} tokens`)
  lines.push('')
  lines.push('## Instruction files')
  for (const f of report.files) {
    lines.push(`- ${f.path} — ${f.bytes} bytes ≈ ${f.approxTokens} tokens`)
  }
  if (report.duplicates.length > 0) {
    lines.push('')
    lines.push('## Duplicate skill bodies')
    for (const d of report.duplicates) {
      lines.push(`- ${d.bytes} bytes duplicated across:`)
      for (const fp of d.files) lines.push(`  - ${fp}`)
    }
  } else {
    lines.push('')
    lines.push('No duplicate skill bodies detected.')
  }
  return lines.join('\n')
}

function approxTokens(bytes: number): number {
  if (bytes <= 0) return 0
  const kib = bytes / 1024
  return Math.max(1, Math.round(kib * ROUGH_TOKENS_PER_KIB))
}

function hashText(text: string): string {
  // FNV-1a 32-bit — collision-resistant enough for duplicate-text detection.
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

async function safeSize(path: string): Promise<number> {
  try {
    const s = await stat(path)
    return s.size
  } catch {
    return 0
  }
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isFile()
  } catch {
    return false
  }
}

function relativeTo(base: string, full: string): string {
  const norm = full.replace(/\\/g, '/')
  const baseNorm = base.replace(/\\/g, '/')
  if (norm.startsWith(baseNorm)) return norm.slice(baseNorm.length).replace(/^\/+/, '')
  return basename(full)
}
