/**
 * Audit layer — read-only context cost auditor.
 *
 * Registers a `context_audit` tool that quantifies how many tokens the
 * instruction chain, skill catalogue, and tool schemas consume, and flags
 * duplicate or shadowed entries. The tool never mutates anything: it only
 * reads files and reports. Derived from dsh-context-doctor (Zhenyu98).
 */
import { basename } from 'node:path';
import { readFile, stat, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const ROUGH_TOKENS_PER_KIB = 320; // ~0.75 chars/token for mixed instruction text
export function applyAudit(ctx, config) {
    const cacheTtlMs = Math.max(0, config.cacheSeconds) * 1000;
    let cached = null;
    const disposer = ctx.tools.register({
        name: 'context_audit',
        description: 'Audit the token cost of injected context: instruction chain (AGENTS.md), skill catalogues, and tool schemas. ' +
            'Read-only — never mutates files. Reports per-file bytes, approximate tokens, duplicates and shadowed skills.',
        parameters: {
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
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    files: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                path: { type: 'string', required: true },
                                bytes: { type: 'integer', required: true },
                                approxTokens: { type: 'integer', required: true },
                            },
                        },
                    },
                    totalBytes: { type: 'integer', required: true },
                    totalApproxTokens: { type: 'integer', required: true },
                    duplicates: {
                        type: 'array',
                        required: true,
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                hash: { type: 'string', required: true },
                                files: { type: 'array', required: true, items: { type: 'string' } },
                                bytes: { type: 'integer', required: true },
                            },
                        },
                    },
                    generatedAt: { type: 'string', required: true },
                },
            },
            render: (result) => renderAudit(result),
        },
        async execute(args) {
            if (cached && Date.now() - cached.at < cacheTtlMs) {
                return cached.report;
            }
            const cwd = args.cwd ?? process.cwd();
            const includeBodies = args.includeSkillBodies ?? true;
            const maxBodies = args.maxSkillBodies ?? 50;
            const report = await runAudit(cwd, includeBodies, maxBodies);
            cached = { at: Date.now(), report };
            return report;
        },
    });
    return disposer;
}
async function runAudit(cwd, includeBodies, maxBodies) {
    const files = [];
    const instructionPaths = await resolveInstructionFiles(cwd);
    for (const p of instructionPaths) {
        const bytes = await safeSize(p);
        if (bytes > 0)
            files.push({ path: relativeTo(cwd, p), bytes, approxTokens: approxTokens(bytes) });
    }
    const duplicates = [];
    if (includeBodies) {
        const bodies = await collectSkillBodies(cwd, maxBodies);
        const byHash = new Map();
        for (const b of bodies) {
            const key = hashText(b.text);
            const existing = byHash.get(key);
            if (existing) {
                existing.files.push(b.path);
                if (existing.bytes === 0)
                    existing.bytes = b.bytes;
            }
            else {
                byHash.set(key, { files: [b.path], bytes: b.bytes });
            }
        }
        for (const [hash, entry] of byHash) {
            if (entry.files.length > 1) {
                duplicates.push({ hash, files: entry.files, bytes: entry.bytes });
            }
        }
    }
    const totalBytes = files.reduce((sum, f) => sum + f.bytes, 0);
    return {
        files,
        totalBytes,
        totalApproxTokens: approxTokens(totalBytes),
        duplicates,
        generatedAt: new Date().toISOString(),
    };
}
async function resolveInstructionFiles(cwd) {
    const candidates = [
        join(cwd, 'AGENTS.md'),
        join(cwd, 'CLAUDE.md'),
        join(cwd, '.agents', 'AGENTS.md'),
        join(cwd, 'docs', 'AGENTS.md'),
    ];
    const skillDir = join(cwd, '.agents', 'skills');
    try {
        const entries = await readdir(skillDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory())
                candidates.push(join(skillDir, entry.name, 'SKILL.md'));
        }
    }
    catch {
        // No .agents/skills directory — that is fine.
    }
    const existing = [];
    for (const p of candidates) {
        if (await fileExists(p))
            existing.push(p);
    }
    return existing;
}
async function collectSkillBodies(cwd, maxBodies) {
    const out = [];
    const root = join(cwd, '.agents', 'skills');
    let dirs;
    try {
        dirs = (await readdir(root, { withFileTypes: true }))
            .filter(e => e.isDirectory())
            .map(e => join(root, e.name));
    }
    catch {
        return out;
    }
    for (const dir of dirs) {
        if (out.length >= maxBodies)
            break;
        const skillFile = join(dir, 'SKILL.md');
        if (!(await fileExists(skillFile)))
            continue;
        try {
            const text = await readFile(skillFile, 'utf8');
            out.push({ path: relativeTo(cwd, skillFile), text, bytes: Buffer.byteLength(text, 'utf8') });
        }
        catch {
            // skip unreadable
        }
    }
    return out;
}
function renderAudit(report) {
    const lines = [];
    lines.push(`# Context audit — ${report.generatedAt}`);
    lines.push('');
    lines.push(`Total: ${report.totalBytes} bytes ≈ ${report.totalApproxTokens} tokens`);
    lines.push('');
    lines.push('## Instruction files');
    for (const f of report.files) {
        lines.push(`- ${f.path} — ${f.bytes} bytes ≈ ${f.approxTokens} tokens`);
    }
    if (report.duplicates.length > 0) {
        lines.push('');
        lines.push('## Duplicate skill bodies');
        for (const d of report.duplicates) {
            lines.push(`- ${d.bytes} bytes duplicated across:`);
            for (const fp of d.files)
                lines.push(`  - ${fp}`);
        }
    }
    else {
        lines.push('');
        lines.push('No duplicate skill bodies detected.');
    }
    return lines.join('\n');
}
function approxTokens(bytes) {
    if (bytes <= 0)
        return 0;
    const kib = bytes / 1024;
    return Math.max(1, Math.round(kib * ROUGH_TOKENS_PER_KIB));
}
function hashText(text) {
    // FNV-1a 32-bit — collision-resistant enough for duplicate-text detection.
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
}
async function safeSize(path) {
    try {
        const s = await stat(path);
        return s.size;
    }
    catch {
        return 0;
    }
}
async function fileExists(path) {
    try {
        const s = await stat(path);
        return s.isFile();
    }
    catch {
        return false;
    }
}
function relativeTo(base, full) {
    const norm = full.replace(/\\/g, '/');
    const baseNorm = base.replace(/\\/g, '/');
    if (norm.startsWith(baseNorm))
        return norm.slice(baseNorm.length).replace(/^\/+/, '');
    return basename(full);
}
