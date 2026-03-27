import { describe, expect, it } from 'bun:test'
import { withEvalTimeout } from '../src/utils/with-eval-timeout'

describe('withEvalTimeout', () => {
  it('records execution errors on the capture context', async () => {
    const recordedErrors: Array<{
      source: string
      message: string
      details?: Record<string, unknown>
    }> = []

    const capture = {
      addError: (
        source: string,
        message: string,
        details?: Record<string, unknown>,
      ) => {
        recordedErrors.push({ source, message, details })
      },
    }

    const result = await withEvalTimeout(
      1_000,
      capture as never,
      async () => {
        throw new Error('boom')
      },
    )

    expect(result.terminationReason).toBe('error')
    expect(recordedErrors).toHaveLength(1)
    expect(recordedErrors[0]?.source).toBe('agent_execution')
    expect(recordedErrors[0]?.message).toBe('boom')
  })

  it('records timeouts on the capture context', async () => {
    const recordedErrors: Array<{ source: string; message: string }> = []

    const capture = {
      addError: (source: string, message: string) => {
        recordedErrors.push({ source, message })
      },
    }

    const result = await withEvalTimeout(
      20,
      capture as never,
      (signal) =>
        new Promise<void>((_, reject) => {
          signal.addEventListener(
            'abort',
            () => reject(new Error('aborted by timeout')),
            { once: true },
          )
        }),
    )

    expect(result.terminationReason).toBe('timeout')
    expect(recordedErrors).toHaveLength(1)
    expect(recordedErrors[0]?.source).toBe('agent_execution')
    expect(recordedErrors[0]?.message).toContain('Task timed out')
  })
})
