import { defineConfig } from 'tsdown'

/**
 * Lean Context ships as source (Cordis loads .ts directly). The build emits the
 * entry bundle so tsdown's workspace sweep finds a valid entry point.
 */
export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: ['esm'],
  platform: 'node',
  target: 'es2024',
  fixedExtension: false,
  dts: false,
  clean: false,
})
