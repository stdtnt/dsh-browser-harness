/**
 * Subprocess bridge to the `browser-harness` CLI.
 *
 * browser-harness executes a Python program from stdin with its helpers
 * pre-imported (`new_tab`, `goto_url`, `page_info`, `js`, ...) and the daemon
 * auto-started. Each tool call builds one such program, prints a single marker
 * line carrying the JSON result, and the runner parses it back. The daemon
 * keeps the browser connection alive between calls, so a fresh subprocess per
 * call is cheap.
 *
 * @module runner
 */

import { spawn } from 'node:child_process'
import { HarnessError } from '@deepseek-ai/dsh-llm'
import { TOOL_ABORTED } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-tools'
import type { ResolvedConfig } from './config.ts'

/** One line prefix marking the JSON result of a harness program. */
export const RESULT_MARKER = '__BH_RESULT__'

/** Successful outcome of one harness invocation. */
export interface RunnerResult {
  /** The canonical JSON value printed by the harness program. */
  value: JsonValue
  /** Full stdout of the invocation (debug aid, includes daemon chatter). */
  stdout: string
  /** Full stderr of the invocation (banner, tracebacks, doctor hints). */
  stderr: string
}

const MAX_TAIL = 4000

function tail(text: string, limit = MAX_TAIL): string {
  if (text.length <= limit) return text
  return `…${text.slice(-limit)}`
}

/** Build the tool-abort error the registry recognizes as a clean cancellation. */
function aborted(): HarnessError {
  const error = new HarnessError('tool call aborted', TOOL_ABORTED)
  error.name = 'AbortError'
  return error
}

/** Runner over one resolved plugin configuration. */
export class HarnessRunner {
  constructor(private readonly config: ResolvedConfig) {}

  /**
   * Run one Python program against the harness CLI.
   * @param script - Python program; helpers are pre-imported by the CLI.
   * @param signal - cancellation; an aborted signal also kills the child.
   * @returns The parsed marker value, or throws on harness failure.
   */
  async run(script: string, signal: AbortSignal): Promise<RunnerResult> {
    if (signal.aborted) {
      throw aborted()
    }

    // Attribute timeout vs caller cancellation ourselves so the error message
    // tells the model which one happened.
    const controller = new AbortController()
    let timedOut = false
    const onAbort = (): void => controller.abort()
    signal.addEventListener('abort', onAbort, { once: true })
    const timer = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, this.config.timeoutMs)

    let stdout = ''
    let stderr = ''
    let spawnError: Error | undefined
    let code: number | null = null

    try {
      const child = spawn(this.config.binPath, [], {
        cwd: this.config.cwd,
        env: { ...process.env, PYTHONUNBUFFERED: '1', ...this.config.env },
        stdio: ['pipe', 'pipe', 'pipe'],
        signal: controller.signal,
      })
      child.stdout.on('data', (chunk: Buffer) => {
        stdout += chunk.toString('utf8')
      })
      child.stderr.on('data', (chunk: Buffer) => {
        stderr += chunk.toString('utf8')
      })
      child.on('error', (error: Error) => {
        spawnError = error
      })
      child.stdin.end(script)
      code = await new Promise<number | null>(resolve => child.on('close', resolve))
    } finally {
      clearTimeout(timer)
      signal.removeEventListener('abort', onAbort)
    }

    if (signal.aborted) {
      throw aborted()
    }
    if (timedOut) {
      throw new Error(
        `browser-harness call timed out after ${this.config.timeoutMs}ms`
        + (stderr.trim() !== '' ? `\nstderr tail:\n${tail(stderr)}` : ''),
      )
    }
    if (spawnError !== undefined) {
      throw new Error(
        `cannot run browser-harness (${this.config.binPath}): ${spawnError.message}`
        + ' — install browser-harness or set the plugin config `binPath`/`cwd`'
        + ' (e.g. binPath: /path/to/browser-harness/browser-harness)',
      )
    }

    const result = this.parse(stdout, stderr, code)
    return { value: result, stdout, stderr }
  }

  /** Parse the marker line; any missing/duplicated result fails loud. */
  private parse(stdout: string, stderr: string, code: number | null): JsonValue {
    const lines = stdout.split('\n')
    const markerLines = lines
      .map((line, index) => ({ line, index }))
      .filter(entry => entry.line.startsWith(RESULT_MARKER))
    let parseFailed = false
    if (markerLines.length > 0) {
      const payload = markerLines[markerLines.length - 1]!.line.slice(RESULT_MARKER.length)
      try {
        const parsed: unknown = JSON.parse(payload)
        return parsed as JsonValue
      } catch {
        parseFailed = true
      }
    }
    const details = [
      stderr.trim() !== '' ? `stderr:\n${tail(stderr)}` : undefined,
      stdout.trim() !== '' ? `stdout:\n${tail(stdout)}` : undefined,
      parseFailed ? 'marker payload was not valid JSON' : undefined,
    ].filter((part): part is string => part !== undefined)
    throw new Error(
      `browser-harness call failed${code !== null ? ` (exit code ${code})` : ''}`
      + (details.length > 0 ? `\n${details.join('\n')}` : '')
      + '\nrun `browser-harness --doctor` for install/connection diagnostics',
    )
  }
}
