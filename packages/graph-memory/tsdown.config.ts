import { defineConfig } from 'tsdown'

/**
 * Graph Memory ships its DSH adapter as source (Cordis loads .ts directly),
 * so the build only emits the invariant helper bundle. The src/ tree and dsh.ts
 * are consumed from source via the package `exports` map.
 */
export default defineConfig({
  entry: ['dsh.ts', 'src/store/store.ts', 'src/store/db.ts', 'src/extractor/extract.ts', 'src/recaller/recall.ts', 'src/format/assemble.ts', 'src/engine/embed.ts', 'src/graph/pagerank.ts', 'src/graph/community.ts', 'src/graph/dedup.ts', 'src/graph/maintenance.ts', 'src/types.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
