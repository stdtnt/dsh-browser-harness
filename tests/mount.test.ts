/**
 * Mount the plugin in a real Cordis context and verify the nine browser tools
 * register on `ctx.tools` and that config errors fail the mount.
 * @module tests/mount
 */

import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import AgentRegistry from '@deepseek-ai/dsh-agent'
import * as Plugin from '../src/index.ts'

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'fake-browser-harness.mjs')

const TOOL_NAMES = [
  'browser_navigate',
  'browser_info',
  'browser_tabs',
  'browser_find',
  'browser_click',
  'browser_type',
  'browser_extract',
  'browser_screenshot',
  'browser_wait',
]

describe('plugin mount', () => {
  it('registers every browser tool on ctx.tools', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(AgentRegistry)
    const fiber = await ctx.plugin(Plugin, { binPath: FIXTURE, timeoutMs: 10_000 })
    try {
      for (const name of TOOL_NAMES) {
        const tool = ctx.tools.get(name)
        expect(tool, `expected tool ${name}`).toBeDefined()
        expect(tool!.description.length).toBeGreaterThan(0)
      }
    } finally {
      await fiber.dispose()
    }
  })

  it('fails the mount on invalid config', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt)
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(AgentRegistry)
    await expect(ctx.plugin(Plugin, { bogus: 1 } as never)).rejects.toThrow('unknown key "bogus"')
  })
})
