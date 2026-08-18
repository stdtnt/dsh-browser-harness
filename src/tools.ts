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

import type { Context } from '@deepseek-ai/cordis'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { GenericCallView, ToolRunContext } from '@deepseek-ai/dsh-tools'
import type { JsonValue } from '@deepseek-ai/dsh-tools'
import type { HarnessRunner } from './runner.ts'
import {
  validateClickArgs,
  validateExtractArgs,
  validateFindArgs,
  validateNavigateArgs,
  validateScreenshotArgs,
  validateTabsArgs,
  validateTypeArgs,
  validateWaitArgs,
} from './validators.ts'
import {
  clickScript,
  extractScript,
  findScript,
  infoScript,
  navigateScript,
  screenshotScript,
  tabsScript,
  typeScript,
  waitScript,
} from './scripts.ts'
import type {
  ClickArgs,
  ExtractArgs,
  FindArgs,
  NavigateArgs,
  ScreenshotArgs,
  TabsArgs,
  TypeArgs,
  WaitArgs,
} from './scripts.ts'

/** Compact generic card for one browser action. */
function present(title: string, rawInput?: JsonValue): GenericCallView {
  return {
    card: 'generic',
    title,
    kind: 'execute',
    ...(rawInput !== undefined ? { rawInput } : {}),
  }
}

/** One text content block. */
function text(lines: string[]): ContentBlock[] {
  return [{ type: 'text', text: lines.join('\n') }]
}

/** Register every browser tool on `ctx.tools`; disposal is effect-based. */
export function registerBrowserTools(ctx: Context, runner: HarnessRunner, screenshotDir: string): void {
  const run = async (script: string, exec: ToolRunContext): Promise<JsonValue> => {
    const result = await runner.run(script, exec.signal)
    return result.value
  }

  ctx.tools.register(defineTool({
    name: 'browser_navigate',
    description:
      'Navigate the current tab to a URL (or go back/forward in history). '
      + 'On the first navigation with no real tab open, a fresh tab is created. '
      + 'Use `newTab: true` to open the URL in a new tab. '
      + 'Returns page metrics and the current tab. Prefer this over raw fetch when '
      + 'the page needs JS rendering, interaction, or your logged-in session.',
    parameters: {
      url: { type: 'string', description: 'Absolute URL to navigate to (required unless `history` is set)' },
      history: {
        type: 'string',
        enum: ['back', 'forward'],
        description: 'Go back/forward in history instead of navigating to a URL',
      },
      newTab: { type: 'boolean', description: 'Open the URL in a new tab (default false)' },
      waitForLoad: { type: 'boolean', description: 'Wait for document load before returning (default true)' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const page = (value as { page?: { url?: string; title?: string } }).page
        return text([`Navigated to ${page?.url ?? '(unknown)'} — ${page?.title ?? ''}`.trim()])
      },
    },
    presentCall: args => present(`browser_navigate ${args.history ?? args.url ?? ''}`.trim(), args),
    async execute(args, exec) {
      validateNavigateArgs(args as NavigateArgs)
      return run(navigateScript(args as NavigateArgs), exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_info',
    description:
      'Current browser state: the attached tab (url/title), all open tabs, and ' +
      'page metrics (viewport, scroll, page size). Use this to orient before ' +
      'acting or to verify the result of a previous action.',
    parameters: {},
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const current = (value as { current?: { url?: string; title?: string } }).current
        const tabs = (value as { tabs?: unknown[] }).tabs ?? []
        const page = (value as { page?: { w?: number; h?: number } }).page
        return text([
          `Attached tab: ${current?.title ?? '(unknown)'} — ${current?.url ?? '(unknown)'}`,
          `Open tabs: ${tabs.length}`,
          `Viewport: ${page?.w ?? '?'}×${page?.h ?? '?'}`,
        ])
      },
    },
    presentCall: () => present('browser_info'),
    execute: (_args, exec) => run(infoScript(), exec),
  }))

  ctx.tools.register(defineTool({
    name: 'browser_tabs',
    description:
      'List all open tabs, switch the attached tab, or close a tab. ' +
      '`targetId` values come from `browser_info` or `browser_tabs` list results.',
    parameters: {
      action: {
        type: 'string',
        enum: ['list', 'switch', 'close'],
        required: true,
        description: 'What to do with tabs',
      },
      targetId: { type: 'string', description: 'Tab target id; required for switch and close' },
    },
    output: {
      schema: { type: 'json' },
      render: (args, value) => {
        if (args.action === 'list') {
          const tabs = (value as { tabs?: { title?: string; url?: string }[] }).tabs ?? []
          return text([`${tabs.length} tab(s):`, ...tabs.map(t => `- ${t.title ?? ''} — ${t.url ?? ''}`)])
        }
        if (args.action === 'switch') {
          const tab = (value as { tab?: { title?: string; url?: string } }).tab
          return text([`Switched to ${tab?.title ?? ''} — ${tab?.url ?? ''}`])
        }
        const tabs = (value as { tabs?: unknown[] }).tabs ?? []
        return text([`Closed tab; ${tabs.length} remain(s)`])
      },
    },
    presentCall: args => present(`browser_tabs ${args.action}`, args.targetId !== undefined ? { targetId: args.targetId } : undefined),
    async execute(args, exec) {
      validateTabsArgs(args as TabsArgs)
      return run(tabsScript(args as TabsArgs), exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_find',
    description:
      'Find interactive elements in the page accessibility tree by name or role ' +
      '(button, link, textbox, ...). Returns matched elements with an `id` usable ' +
      'as `nodeId` in `browser_click`, plus role/name/value. This is the preferred ' +
      'discovery step before clicking; the AX tree is the ground truth of what is ' +
      'actionable, unlike raw HTML. Use `withBox: true` to also get viewport ' +
      'center coordinates for the matches.',
    parameters: {
      query: { type: 'string', description: 'Case-insensitive substring matched against element names and roles' },
      role: { type: 'string', description: 'Exact role filter, e.g. "button" or "link"' },
      limit: { type: 'integer', description: 'Maximum matches to return (default 20, max 50)' },
      withBox: { type: 'boolean', description: 'Include viewport center coordinates (default false)' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const matches = (value as { matches?: { id?: number; role?: string; name?: string }[] }).matches ?? []
        if (matches.length === 0) return text(['No matching elements found'])
        return text([
          `${matches.length} match(es):`,
          ...matches.map(m => `- [${m.id}] ${m.role}: ${m.name ?? ''}`),
        ])
      },
    },
    presentCall: args => present(`browser_find ${args.query ?? args.role ?? '*'}`.trim()),
    async execute(args, exec) {
      validateFindArgs(args as FindArgs)
      return run(findScript(args as FindArgs), exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_click',
    description:
      'Click at viewport coordinates (`x`/`y`, from `browser_find` withBox results ' +
      'or `browser_screenshot`) or at an accessibility element (`nodeId` from ' +
      '`browser_find`; the element is scrolled into view first). Use `verify` to ' +
      'also return page state after the click (default true).',
    parameters: {
      nodeId: { type: 'integer', description: 'AX element id from browser_find' },
      x: { type: 'number', description: 'Viewport x coordinate (requires y)' },
      y: { type: 'number', description: 'Viewport y coordinate (requires x)' },
      button: { type: 'string', enum: ['left', 'right', 'middle'], description: 'Mouse button (default left)' },
      clicks: { type: 'integer', description: 'Click count for double-click (default 1)' },
    },
    output: {
      schema: { type: 'json' },
      render: (args, value) => {
        const clicked = value as { x?: number; y?: number; page?: { url?: string } }
        const label = args.nodeId !== undefined ? `node ${args.nodeId}` : `(${clicked.x}, ${clicked.y})`
        return text([`Clicked ${label}`, `Page: ${clicked.page?.url ?? '(unknown)'}`])
      },
    },
    presentCall: args => present(`browser_click ${args.nodeId !== undefined ? `node ${args.nodeId}` : `(${args.x ?? '?'}, ${args.y ?? '?'})`}`),
    async execute(args, exec) {
      validateClickArgs(args as ClickArgs)
      return run(clickScript(args as ClickArgs), exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_type',
    description:
      'Type text or press keys in the browser. With `selector`, fills a framework-' +
      'managed input (fires input/change events so React/Vue see the update); ' +
      'without it, types into the currently focused element. With `key`, presses a ' +
      'special key (Enter, Tab, Backspace, Escape, Arrow*, ...) — `modifiers` is a ' +
      'bitfield: 1=Alt, 2=Ctrl, 4=Meta(Cmd), 8=Shift.',
    parameters: {
      text: { type: 'string', description: 'Text to type' },
      selector: { type: 'string', description: 'CSS selector of the input to fill (with text)' },
      clear: { type: 'boolean', description: 'Clear the input before filling (default true)' },
      key: { type: 'string', description: 'Special key to press, e.g. "Enter", "Tab", "Escape"' },
      modifiers: { type: 'integer', description: 'Modifier bitfield for `key` (default 0)' },
    },
    output: {
      schema: { type: 'json' },
      render: (args, value) => {
        const page = (value as { page?: { url?: string } }).page
        const what = args.key !== undefined ? `pressed ${args.key}` : args.selector !== undefined ? `filled ${args.selector}` : 'typed'
        return text([`${what} — ${page?.url ?? '(unknown)'}`])
      },
    },
    presentCall: args => present(`browser_type ${args.key ?? args.selector ?? 'focused element'}`),
    async execute(args, exec) {
      validateTypeArgs(args as TypeArgs)
      return run(typeScript(args as TypeArgs), exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_extract',
    description:
      'Extract content from the current page. Either run an arbitrary JS ' +
      '`expression` (must return JSON-serializable data; async/await works), or ' +
      'pass a CSS `selector` with a `mode` (text = first match innerText, texts = ' +
      'all matches, html = outerHTML of matches, attr = one attribute per match). ' +
      'Returns the results plus the page url/title.',
    parameters: {
      expression: { type: 'string', description: 'JS expression returning JSON-serializable data' },
      selector: { type: 'string', description: 'CSS selector to extract from' },
      mode: {
        type: 'string',
        enum: ['text', 'texts', 'html', 'attr'],
        description: 'Extraction mode (default text)',
      },
      attr: { type: 'string', description: 'Attribute name when mode is attr' },
      limit: { type: 'integer', description: 'Max matches for texts/html/attr modes (default 10, max 50)' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const source = (value as { source?: { url?: string; title?: string } }).source
        const result = (value as { result?: unknown }).result
        const rendered = typeof result === 'string' ? result : JSON.stringify(result)
        return text([`Extracted from ${source?.url ?? '(unknown)'}:`, rendered])
      },
    },
    presentCall: args => present(`browser_extract ${args.expression ?? args.selector ?? ''}`.trim()),
    async execute(args, exec) {
      validateExtractArgs(args as ExtractArgs)
      return run(extractScript(args as ExtractArgs), exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_screenshot',
    description:
      'Capture a PNG of the current viewport (or the full page with `full: true`) ' +
      'and save it to `path`, or to the configured screenshot directory with a ' +
      'timestamped name. Returns the saved path, byte size, and page state. Read ' +
      'the image with your file tools when you need to see layout or imagery.',
    parameters: {
      path: { type: 'string', description: 'Explicit output path for the PNG' },
      full: { type: 'boolean', description: 'Capture the full page instead of the viewport (default false)' },
      maxDim: { type: 'integer', description: 'Downscale so the longest side stays under this many pixels' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const shot = value as { path?: string; size?: number; page?: { url?: string } }
        return text([`Saved ${shot.path ?? '(unknown)'} (${shot.size ?? '?'} bytes)`, `Page: ${shot.page?.url ?? '(unknown)'}`])
      },
    },
    presentCall: args => present('browser_screenshot', args.path !== undefined ? { path: args.path } : undefined),
    async execute(args, exec) {
      validateScreenshotArgs(args as ScreenshotArgs)
      return run(screenshotScript(args as ScreenshotArgs, screenshotDir), exec)
    },
  }))

  ctx.tools.register(defineTool({
    name: 'browser_wait',
    description:
      'Wait for page conditions before the next action: document load, a CSS ' +
      'selector to appear (optionally visible), network idle (in-flight requests ' +
      'settled), or a fixed delay. Returns which checks passed. Use this after ' +
      'actions that trigger async rendering (SPA routes, form submits).',
    parameters: {
      forLoad: { type: 'boolean', description: 'Wait for document.readyState == complete (default false)' },
      loadTimeout: { type: 'number', description: 'Load check timeout in seconds (default 15)' },
      selector: { type: 'string', description: 'Wait for this CSS selector to exist' },
      visible: { type: 'boolean', description: 'Also require the selector to be visible (default false)' },
      timeout: { type: 'number', description: 'Element check timeout in seconds (default 10)' },
      networkIdle: { type: 'boolean', description: 'Wait until network is idle (default false)' },
      networkIdleTimeout: { type: 'number', description: 'Network idle timeout in seconds (default 10)' },
      seconds: { type: 'number', description: 'Fixed delay in seconds' },
    },
    output: {
      schema: { type: 'json' },
      render: (_args, value) => {
        const checks = (value as { checks?: Record<string, boolean> }).checks ?? {}
        const page = (value as { page?: { url?: string } }).page
        const lines = Object.entries(checks).map(([name, passed]) => `- ${name}: ${passed ? 'passed' : 'timed out'}`)
        return text([`Wait checks:`, ...lines, `Page: ${page?.url ?? '(unknown)'}`])
      },
    },
    presentCall: args => {
      const what = args.selector ?? (args.forLoad ? 'load' : args.networkIdle ? 'network idle' : `${args.seconds ?? 0}s`)
      return present(`browser_wait ${what}`)
    },
    async execute(args, exec) {
      validateWaitArgs(args as WaitArgs)
      return run(waitScript(args as WaitArgs), exec)
    },
  }))
}
