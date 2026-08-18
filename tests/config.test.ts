/**
 * Config validation and default resolution.
 * @module tests/config
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig, validateConfig } from '../src/config.ts'

describe('validateConfig', () => {
  it('accepts an empty config', () => {
    expect(() => validateConfig({})).not.toThrow()
  })

  it('accepts every known key with valid values', () => {
    expect(() =>
      validateConfig({
        binPath: '/opt/browser-harness/bin',
        cwd: '/opt/browser-harness',
        timeoutMs: 60_000,
        screenshotDir: '/tmp/shots',
        env: { BU_NAME: 'r7k2', BH_RECORD: '0' },
      }),
    ).not.toThrow()
  })

  it('rejects unknown keys', () => {
    expect(() => validateConfig({ binary: 'x' } as never)).toThrow('unknown key "binary"')
  })

  it('rejects empty and non-string path keys', () => {
    expect(() => validateConfig({ binPath: '' })).toThrow('"binPath" must be a non-empty string')
    expect(() => validateConfig({ cwd: 42 } as never)).toThrow('"cwd" must be a non-empty string')
    expect(() => validateConfig({ screenshotDir: '' })).toThrow('"screenshotDir" must be a non-empty string')
  })

  it('rejects non-positive timeouts', () => {
    expect(() => validateConfig({ timeoutMs: 0 })).toThrow('"timeoutMs" must be a positive number')
    expect(() => validateConfig({ timeoutMs: -5 })).toThrow('"timeoutMs" must be a positive number')
    expect(() => validateConfig({ timeoutMs: Number.NaN })).toThrow('"timeoutMs" must be a positive number')
  })

  it('rejects non-string env values', () => {
    expect(() => validateConfig({ env: { BU_NAME: 3 } } as never)).toThrow('env["BU_NAME"] must be a string')
  })
})

describe('resolveConfig', () => {
  it('applies defaults for an empty config', () => {
    expect(resolveConfig({})).toEqual({
      binPath: 'browser-harness',
      timeoutMs: 120_000,
      screenshotDir: process.cwd(),
      env: {},
    })
  })

  it('keeps explicit values and drops undefined cwd', () => {
    const resolved = resolveConfig({ binPath: './bh', cwd: '/opt', timeoutMs: 1000, screenshotDir: '/s', env: { A: '1' } })
    expect(resolved).toEqual({ binPath: './bh', cwd: '/opt', timeoutMs: 1000, screenshotDir: '/s', env: { A: '1' } })
    expect('cwd' in resolveConfig({})).toBe(false)
  })
})
