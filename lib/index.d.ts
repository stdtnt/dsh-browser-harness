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
import type { Context } from '@deepseek-ai/cordis';
import type { Config } from './config.ts';
export declare const name = "dsh-browser-harness";
export declare const inject: string[];
export type { Config } from './config.ts';
export { validateConfig, resolveConfig } from './config.ts';
export { HarnessRunner } from './runner.ts';
export { registerBrowserTools } from './tools.ts';
/** Mount the browser tools; config errors fail the plugin load. */
export declare function apply(ctx: Context, config?: Config): void;
//# sourceMappingURL=index.d.ts.map