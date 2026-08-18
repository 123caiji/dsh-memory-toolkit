import { describe, expect, it } from 'vitest'

import { extractLlmStatus, LlmFailureGuard } from '../src/engine/llm-guard.ts'

describe('LlmFailureGuard', () => {
  it('pauses after permanent 4xx API errors', () => {
    let now = 1_000
    const guard = new LlmFailureGuard(60_000, () => now)

    expect(guard.canRun()).toBe(true)
    expect(
      guard.tripIfNeeded(new Error('[graph-memory] LLM API 403: {"error":"User not found or inactive"}')),
    ).toBe(true)
    expect(guard.canRun()).toBe(false)

    now += 59_000
    expect(guard.canRun()).toBe(false)

    now += 2_000
    expect(guard.canRun()).toBe(true)
  })

  it('ignores retryable errors', () => {
    const guard = new LlmFailureGuard(60_000, () => 1_000)

    expect(guard.tripIfNeeded(new Error('[graph-memory] LLM API 429: rate limited'))).toBe(false)
    expect(guard.canRun()).toBe(true)
  })

  it('recognizes both OpenAI-compatible and Anthropic status errors', () => {
    expect(extractLlmStatus(new Error('[graph-memory] LLM API 401: invalid key'))).toBe(401)
    expect(extractLlmStatus(new Error('[graph-memory] Anthropic API 403'))).toBe(403)
  })

  it('does not pause for request-specific 400 and 422 errors', () => {
    const guard = new LlmFailureGuard(60_000, () => 1_000)

    expect(guard.tripIfNeeded(new Error('[graph-memory] LLM API 400: prompt too long'))).toBe(false)
    expect(guard.tripIfNeeded(new Error('[graph-memory] LLM API 422: invalid message'))).toBe(false)
    expect(guard.canRun()).toBe(true)
  })

  it('pauses Anthropic authentication failures', () => {
    const guard = new LlmFailureGuard(60_000, () => 1_000)

    expect(guard.tripIfNeeded(new Error('[graph-memory] Anthropic API 403'))).toBe(true)
    expect(guard.canRun()).toBe(false)
  })
})
