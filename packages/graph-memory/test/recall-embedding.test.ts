import { beforeEach, describe, expect, it } from 'vitest'
import type { DatabaseSyncInstance } from '@photostructure/sqlite'

import { Recaller } from '../src/recaller/recall.ts'
import { DEFAULT_CONFIG } from '../src/types.ts'
import { createTestDb } from './helpers.ts'
import { getVectorHash, updateNode, upsertNode } from '../src/store/store.ts'

let db: DatabaseSyncInstance

beforeEach(() => {
  db = createTestDb()
})

describe('Recaller.syncEmbed', () => {
  it('re-embeds when the description changes', async () => {
    const calls: string[] = []
    const recaller = new Recaller(db, DEFAULT_CONFIG)
    recaller.setEmbedFn(async (text) => {
      calls.push(text)
      return [1, 0]
    })

    const { node } = upsertNode(db, {
      type: 'SKILL',
      name: 'docker-build',
      description: 'old description',
      content: 'same content',
    }, 's1')
    await recaller.syncEmbed(node)
    const firstHash = getVectorHash(db, node.id)

    const updated = updateNode(db, node.name, { description: 'new description' })!
    await recaller.syncEmbed(updated)

    expect(calls).toHaveLength(2)
    expect(calls[0]).toContain('old description')
    expect(calls[1]).toContain('new description')
    expect(getVectorHash(db, node.id)).not.toBe(firstHash)
  })
})
