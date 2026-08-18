/**
 * dsh-browser-harness: drive Chrome through the browser-harness CDP harness.
 *
 * The plugin registers nine agent tools (`browser_navigate`, `browser_info`,
 * `browser_tabs`, `browser_find`, `browser_click`, `browser_type`,
 * `browser_extract`, `browser_screenshot`, `browser_wait`) that shell out to a
 * `browser-harness` binary. The harness daemon keeps the browser connection
 * alive between calls, so every tool call is one short-lived subprocess.
 *
 * Install into a profile:
 * ```sh
 * dsh plugin --profile <name> add ./plugins/dsh-browser-harness
 * ```
 * and point the plugin at a browser-harness checkout (or rely on PATH):
 * ```yaml
 * # in the profile's cordis.patch.yml (or a --patch overlay)
 * - update:
 *     - id: dsh-browser-harness
 *       config:
 *         binPath: /path/to/browser-harness/browser-harness
 * ```
 *
 * @module dsh-browser-harness
 */

import type { Context } from '@deepseek-ai/cordis'
import { validateConfig } from './config.ts'
import { resolveConfig } from './config.ts'
import type { Config } from './config.ts'
import { HarnessRunner } from './runner.ts'
import { registerBrowserTools } from './tools.ts'

export const name = 'dsh-browser-harness'
export const inject = ['tools']

export type { Config } from './config.ts'
export { validateConfig, resolveConfig } from './config.ts'
export { HarnessRunner } from './runner.ts'
export { registerBrowserTools } from './tools.ts'

/** Mount the browser tools; config errors fail the plugin load. */
export function apply(ctx: Context, config: Config = {}): void {
  validateConfig(config)
  const resolved = resolveConfig(config)
  const runner = new HarnessRunner(resolved)
  registerBrowserTools(ctx, runner, resolved.screenshotDir)
}
