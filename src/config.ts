/**
 * Runtime configuration of the browser-harness plugin: how the plugin locates
 * and invokes the `browser-harness` binary, and per-call limits.
 *
 * Every key is optional; `resolveConfig` applies the code defaults, so a
 * bare `- insert: { id: dsh-browser-harness, name: 'dsh-browser-harness' }`
 * row already works when `browser-harness` is on PATH.
 *
 * @module config
 */

/** Plugin configuration, validated at load; unknown keys fail loud. */
export interface Config {
  /**
   * The `browser-harness` binary to invoke. Defaults to `browser-harness`
   * resolved from PATH. Point it at a checkout launcher to run an uninstalled
   * checkout, e.g. `/path/to/browser-harness/browser-harness`.
   */
  binPath?: string
  /** Working directory for harness invocations; set it to the checkout root
   * when `binPath` is a relative launcher like `./browser-harness`. */
  cwd?: string
  /** Per-call wall-clock cap in milliseconds. Defaults to 120000. */
  timeoutMs?: number
  /** Directory for screenshot files. Defaults to the process working
   * directory. */
  screenshotDir?: string
  /** Extra environment variables passed to every harness invocation, e.g.
   * `BU_NAME`, `BU_CDP_URL`, `BH_DOMAIN_SKILLS`, `BH_RECORD`. */
  env?: Record<string, string>
}

/** Reject stale or misspelled config keys before defaults can hide them. */
export function validateConfig(config: Config): void {
  const unknown = Object.keys(config).find(
    key => key !== 'binPath' && key !== 'cwd' && key !== 'timeoutMs' && key !== 'screenshotDir' && key !== 'env',
  )
  if (unknown !== undefined) {
    throw new Error(`BrowserHarnessConfig: unknown key "${unknown}"`)
  }
  for (const [key, value] of Object.entries({
    binPath: config.binPath,
    cwd: config.cwd,
    screenshotDir: config.screenshotDir,
  })) {
    if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
      throw new Error(`BrowserHarnessConfig: "${key}" must be a non-empty string`)
    }
  }
  if (config.timeoutMs !== undefined && (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0)) {
    throw new Error(`BrowserHarnessConfig: "timeoutMs" must be a positive number, got ${JSON.stringify(config.timeoutMs)}`)
  }
  if (config.env !== undefined) {
    for (const [key, value] of Object.entries(config.env)) {
      if (typeof value !== 'string') {
        throw new Error(`BrowserHarnessConfig: env["${key}"] must be a string, got ${JSON.stringify(value)}`)
      }
    }
  }
}

/** Effective options after applying code defaults. */
export interface ResolvedConfig {
  binPath: string
  cwd?: string
  timeoutMs: number
  screenshotDir: string
  env: Record<string, string>
}

/** Apply code defaults to validated user configuration. */
export function resolveConfig(config: Config): ResolvedConfig {
  return {
    binPath: config.binPath ?? 'browser-harness',
    ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
    timeoutMs: config.timeoutMs ?? 120_000,
    screenshotDir: config.screenshotDir ?? process.cwd(),
    env: config.env ?? {},
  }
}
