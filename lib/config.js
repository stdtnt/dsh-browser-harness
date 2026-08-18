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
/** Reject stale or misspelled config keys before defaults can hide them. */
export function validateConfig(config) {
    const unknown = Object.keys(config).find(key => key !== 'binPath' && key !== 'cwd' && key !== 'timeoutMs' && key !== 'screenshotDir' && key !== 'env');
    if (unknown !== undefined) {
        throw new Error(`BrowserHarnessConfig: unknown key "${unknown}"`);
    }
    for (const [key, value] of Object.entries({
        binPath: config.binPath,
        cwd: config.cwd,
        screenshotDir: config.screenshotDir,
    })) {
        if (value !== undefined && (typeof value !== 'string' || value.length === 0)) {
            throw new Error(`BrowserHarnessConfig: "${key}" must be a non-empty string`);
        }
    }
    if (config.timeoutMs !== undefined && (!Number.isFinite(config.timeoutMs) || config.timeoutMs <= 0)) {
        throw new Error(`BrowserHarnessConfig: "timeoutMs" must be a positive number, got ${JSON.stringify(config.timeoutMs)}`);
    }
    if (config.env !== undefined) {
        for (const [key, value] of Object.entries(config.env)) {
            if (typeof value !== 'string') {
                throw new Error(`BrowserHarnessConfig: env["${key}"] must be a string, got ${JSON.stringify(value)}`);
            }
        }
    }
}
/** Apply code defaults to validated user configuration. */
export function resolveConfig(config) {
    return {
        binPath: config.binPath ?? 'browser-harness',
        ...(config.cwd !== undefined ? { cwd: config.cwd } : {}),
        timeoutMs: config.timeoutMs ?? 120_000,
        screenshotDir: config.screenshotDir ?? process.cwd(),
        env: config.env ?? {},
    };
}
//# sourceMappingURL=config.js.map