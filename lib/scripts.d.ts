/**
 * Python program builders for the browser-harness CLI.
 *
 * browser-harness pre-imports its helpers (`new_tab`, `goto_url`, `page_info`,
 * `js`, `cdp`, ...) and executes the program from stdin. Every builder returns
 * a complete program that performs one tool action and prints one
 * `__BH_RESULT__` line carrying the JSON result; the runner parses that line.
 * String and number embedding uses JSON encoding, which is also valid Python
 * literal syntax, so no user input reaches the program as raw source.
 *
 * @module scripts
 */
/** Tool argument shapes; the schemas in `tools.ts` are their source of truth. */
export interface NavigateArgs {
    url?: string;
    history?: 'back' | 'forward';
    newTab?: boolean;
    waitForLoad?: boolean;
}
export interface TabsArgs {
    action: 'list' | 'switch' | 'close';
    targetId?: string;
}
export interface FindArgs {
    query?: string;
    role?: string;
    limit?: number;
    withBox?: boolean;
}
export interface ClickArgs {
    nodeId?: number;
    x?: number;
    y?: number;
    button?: 'left' | 'right' | 'middle';
    clicks?: number;
}
export interface TypeArgs {
    text?: string;
    selector?: string;
    key?: string;
    clear?: boolean;
    modifiers?: number;
}
export interface ExtractArgs {
    expression?: string;
    selector?: string;
    mode?: 'text' | 'texts' | 'html' | 'attr';
    attr?: string;
    limit?: number;
}
export interface ScreenshotArgs {
    path?: string;
    full?: boolean;
    maxDim?: number;
}
export interface WaitArgs {
    forLoad?: boolean;
    loadTimeout?: number;
    selector?: string;
    visible?: boolean;
    timeout?: number;
    networkIdle?: boolean;
    networkIdleTimeout?: number;
    seconds?: number;
}
/** Navigate the current (or a fresh) tab, then wait for load by default. */
export declare function navigateScript(args: NavigateArgs): string;
/** Current tab, all tabs, and page metrics. */
export declare function infoScript(): string;
/** List, switch, or close tabs by target id. */
export declare function tabsScript(args: TabsArgs): string;
/** Search the accessibility tree; the recommended element-discovery path. */
export declare function findScript(args: FindArgs): string;
/** Click at viewport coordinates, or at an AX node's box center. */
export declare function clickScript(args: ClickArgs): string;
/** Type into the focused element, fill a selector, or press a special key. */
export declare function typeScript(args: TypeArgs): string;
/** Extract text/html/attributes via a CSS selector, or run raw JS. */
export declare function extractScript(args: ExtractArgs): string;
/** Capture a viewport (or full-page) PNG; defaults into the screenshot dir. */
export declare function screenshotScript(args: ScreenshotArgs, screenshotDir: string): string;
/** Wait for load/element/network-idle and/or a fixed delay. */
export declare function waitScript(args: WaitArgs): string;
//# sourceMappingURL=scripts.d.ts.map