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
import { validateConfig } from "./config.js";
import { resolveConfig } from "./config.js";
import { HarnessRunner } from "./runner.js";
import { registerBrowserTools } from "./tools.js";
export const name = 'dsh-browser-harness';
export const inject = ['tools'];
export { validateConfig, resolveConfig } from "./config.js";
export { HarnessRunner } from "./runner.js";
export { registerBrowserTools } from "./tools.js";
/** Mount the browser tools; config errors fail the plugin load. */
export function apply(ctx, config = {}) {
    validateConfig(config);
    const resolved = resolveConfig(config);
    const runner = new HarnessRunner(resolved);
    registerBrowserTools(ctx, runner, resolved.screenshotDir);
}
//# sourceMappingURL=index.js.map