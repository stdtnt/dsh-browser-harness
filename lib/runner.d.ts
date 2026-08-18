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
import type { JsonValue } from '@deepseek-ai/dsh-tools';
import type { ResolvedConfig } from './config.ts';
/** One line prefix marking the JSON result of a harness program. */
export declare const RESULT_MARKER = "__BH_RESULT__";
/** Successful outcome of one harness invocation. */
export interface RunnerResult {
    /** The canonical JSON value printed by the harness program. */
    value: JsonValue;
    /** Full stdout of the invocation (debug aid, includes daemon chatter). */
    stdout: string;
    /** Full stderr of the invocation (banner, tracebacks, doctor hints). */
    stderr: string;
}
/** Runner over one resolved plugin configuration. */
export declare class HarnessRunner {
    private readonly config;
    constructor(config: ResolvedConfig);
    /**
     * Run one Python program against the harness CLI.
     * @param script - Python program; helpers are pre-imported by the CLI.
     * @param signal - cancellation; an aborted signal also kills the child.
     * @returns The parsed marker value, or throws on harness failure.
     */
    run(script: string, signal: AbortSignal): Promise<RunnerResult>;
    /** Parse the marker line; any missing/duplicated result fails loud. */
    private parse;
}
//# sourceMappingURL=runner.d.ts.map