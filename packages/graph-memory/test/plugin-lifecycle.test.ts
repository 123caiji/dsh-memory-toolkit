import { describe, expect, it } from 'vitest'

import graphMemoryPlugin, { missingIngestMessages } from '../index.ts'
import { closeDb } from '../src/store/db.ts'

describe('plugin lifecycle safeguards', () => {
  it('computes the missing suffix when a host skips part or all of ingest', () => {
    const messages = [{ id: 1 }, { id: 2 }, { id: 3 }]
    expect(missingIngestMessages(messages, 0)).toEqual(messages)
    expect(missingIngestMessages(messages, 1)).toEqual([{ id: 2 }, { id: 3 }])
    expect(missingIngestMessages(messages, 99)).toEqual([])
  })

  it('does not register hooks and tools twice', async () => {
    const hooks: string[] = []
    const tools: string[] = []
    const engines: Array<() => any> = []
    const api: any = {
      pluginConfig: { dbPath: ':memory:', llm: { model: 'test' } },
      config: {},
      logger: { info() {}, warn() {}, error() {} },
      on(name: string) { hooks.push(name) },
      registerTool(_factory: unknown, meta?: { name?: string }) { tools.push(meta?.name ?? '') },
      registerContextEngine(_name: string, factory: () => any) { engines.push(factory) },
    }

    graphMemoryPlugin.register(api)
    const firstHookCount = hooks.length
    const firstToolCount = tools.length
    graphMemoryPlugin.register(api)

    expect(hooks.length).toBe(firstHookCount)
    expect(tools.length).toBe(firstToolCount)
    expect(engines).toHaveLength(2)
    expect(engines[1]()).toBe(engines[0]())

    await engines[0]().dispose()
    closeDb()
  })
})
