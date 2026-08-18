/**
 * Agent-facing tools of the browser-harness plugin.
 *
 * Every tool builds one Python program (see `scripts.ts`), runs it through the
 * harness CLI, and returns the canonical JSON value the program printed.
 * UI render intent is decided up front: all tools present as `generic` cards
 * whose title names the action; nothing here is terminal- or diff-shaped.
 *
 * @module tools
 */
import type { Context } from '@deepseek-ai/cordis';
import type { HarnessRunner } from './runner.ts';
/** Register every browser tool on `ctx.tools`; disposal is effect-based. */
export declare function registerBrowserTools(ctx: Context, runner: HarnessRunner, screenshotDir: string): void;
//# sourceMappingURL=tools.d.ts.map