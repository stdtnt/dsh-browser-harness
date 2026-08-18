/**
 * HarnessRunner subprocess protocol: marker parsing, env/cwd passthrough,
 * error surfacing, timeout and cancellation.
 * @module tests/runner
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { realpathSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { HarnessRunner } from '../src/runner.ts'

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-browser-harness.mjs')

function runner(overrides: Record<string, unknown> = {}): HarnessRunner {
  return new HarnessRunner({
    binPath: FIXTURE,
    timeoutMs: 120_000,
    screenshotDir: process.cwd(),
    env: {},
    ...overrides,
  } as never)
}

const never = new AbortController().signal

describe('HarnessRunner', () => {
  it('runs a script and parses the marker JSON', async () => {
    const result = await runner().run('print(page_info())\n', never)
    expect(result.value).toEqual({
      page: { url: 'https://example.com', title: 'Example' },
      current: { url: 'https://example.com', title: 'Example' },
    })
  })

  it('passes config env and cwd to the child', async () => {
    // macOS resolves /tmp to /private/tmp inside the child, so compare realpaths.
    const result = await runner({ env: { BH_TEST_VAR: 'hello' }, cwd: '/tmp' }).run('SHOW_ENV\n', never)
    expect(result.value).toEqual({ env: 'hello', cwd: realpathSync('/tmp') })
  })

  it('surfaces nonzero exit with the stderr tail', async () => {
    await expect(runner().run('RAISE_ERROR\n', never)).rejects.toThrow(
      /exit code 1[\s\S]*RuntimeError: boom/,
    )
  })

  it('fails loud when the marker line is missing', async () => {
    await expect(runner().run('NO_MARKER\n', never)).rejects.toThrow(
      /browser-harness call failed[\s\S]*--doctor/,
    )
  })

  it('times out and attributes the timeout', async () => {
    await expect(
      runner({ timeoutMs: 500 }).run('SLOW_DOWN\n', never),
    ).rejects.toThrow(/timed out after 500ms/)
  })

  it('rejects immediately when the signal is already aborted', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(runner().run('print(page_info())\n', controller.signal)).rejects.toThrow(
      /tool call aborted/,
    )
  })

  it('kills the child and reports abort when the signal fires mid-run', async () => {
    const controller = new AbortController()
    const promise = runner({ timeoutMs: 10_000 }).run('SLOW_DOWN\n', controller.signal)
    setTimeout(() => controller.abort(), 150)
    await expect(promise).rejects.toThrow(/tool call aborted/)
  })

  it('reports a missing binary with setup hints', async () => {
    const broken = new HarnessRunner({
      binPath: '/nonexistent/browser-harness',
      timeoutMs: 10_000,
      screenshotDir: process.cwd(),
      env: {},
    })
    await expect(broken.run('print(page_info())\n', never)).rejects.toThrow(
      /cannot run browser-harness[\s\S]*binPath/,
    )
  })
})
