#!/usr/bin/env node
// Fake browser-harness CLI used by unit tests. It does not execute Python:
// it responds to the script text on stdin, which is enough to exercise the
// runner's spawn/stdin/marker/error/timeout/abort contract.
import { readFileSync } from 'node:fs'

const script = readFileSync(0, 'utf8')

if (script.includes('RAISE_ERROR')) {
  process.stderr.write(
    'Traceback (most recent call last):\n  File "<stdin>", line 1, in <module>\nRuntimeError: boom\n',
  )
  process.exit(1)
}

if (script.includes('NO_MARKER')) {
  process.stdout.write('some banner text\n')
  process.exit(0)
}

if (script.includes('SLOW_DOWN')) {
  await new Promise(resolve => setTimeout(resolve, 3000))
}

const result = script.includes('SHOW_ENV')
  ? { env: process.env.BH_TEST_VAR ?? null, cwd: process.cwd() }
  : script.includes('page_info')
    ? { page: { url: 'https://example.com', title: 'Example' }, current: { url: 'https://example.com', title: 'Example' } }
    : { ok: true }

process.stdout.write(`__BH_RESULT__${JSON.stringify(result)}\n`)
process.exit(0)
