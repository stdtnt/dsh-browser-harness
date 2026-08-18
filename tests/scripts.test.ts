/**
 * Python program builders: each script carries the result marker, embeds user
 * strings JSON-escaped (never raw source), and wires the intended helpers.
 * @module tests/scripts
 */

import { describe, expect, it } from 'vitest'
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
} from '../src/scripts.ts'

const MARKER = 'print("__BH_RESULT__"'

describe('script builders', () => {
  it('navigates a fresh tab on first use, else goto, and waits for load', () => {
    const script = navigateScript({ url: 'https://example.com' })
    expect(script).toContain('ensure_real_tab() is None')
    expect(script).toContain('new_tab("https://example.com")')
    expect(script).toContain('goto_url("https://example.com")')
    expect(script).toContain('wait_for_load()')
    expect(script).toContain(MARKER)
  })

  it('honors history and newTab modes', () => {
    expect(navigateScript({ history: 'back' })).toContain('cdp("Page.goBack")')
    expect(navigateScript({ history: 'forward' })).toContain('cdp("Page.goForward")')
    const fresh = navigateScript({ url: 'https://a.dev', newTab: true })
    expect(fresh).toContain('fresh_tab = True')
    expect(fresh).toContain('new_tab("https://a.dev")')
    expect(navigateScript({ url: 'https://a.dev', waitForLoad: false })).not.toContain('wait_for_load()')
  })

  it('escapes user strings as JSON literals, safe inside Python', () => {
    const script = navigateScript({ url: 'https://x.dev/?q="hi"\nnext' })
    expect(script).toContain('new_tab("https://x.dev/?q=\\"hi\\"\\nnext")')
  })

  it('reports page, tabs, and current tab for info', () => {
    const script = infoScript()
    expect(script).toContain('current_tab()')
    expect(script).toContain('list_tabs()')
    expect(script).toContain('page_info()')
  })

  it('builds list/switch/close tab programs', () => {
    expect(tabsScript({ action: 'list' })).toContain('action = "list"')
    const switched = tabsScript({ action: 'switch', targetId: 'ABC' })
    expect(switched).toContain('switch_tab(target_id)')
    const closed = tabsScript({ action: 'close', targetId: 'ABC' })
    expect(closed).toContain('close_tab(target_id)')
  })

  it('searches the AX tree with interactive-role fallback', () => {
    const script = findScript({ query: 'submit', limit: 5, withBox: true })
    expect(script).toContain('Accessibility.getFullAXTree')
    expect(script).toContain('query = "submit"')
    expect(script).toContain('limit = 5')
    expect(script).toContain('DOM.getBoxModel')
    expect(findScript({})).toContain('interactive =')
  })

  it('clicks by coordinates or by AX node id with scroll-into-view', () => {
    const xy = clickScript({ x: 10, y: 20, button: 'right', clicks: 2 })
    expect(xy).toContain('click_at_xy(x, y, button="right", clicks=2)')
    expect(xy).toContain('x = 10')
    expect(xy).toContain('y = 20')
    const node = clickScript({ nodeId: 42 })
    expect(node).toContain('DOM.scrollIntoViewIfNeeded", backendNodeId=node_id')
    expect(node).toContain('click_at_xy(x, y, button="left", clicks=1)')
  })

  it('types, fills, or presses depending on the args', () => {
    expect(typeScript({ text: 'hello' })).toContain('type_text("hello")')
    const fill = typeScript({ text: 'hello', selector: '#q', clear: false })
    expect(fill).toContain('fill_input("#q", "hello", clear_first=False)')
    expect(typeScript({ key: 'Enter', modifiers: 2 })).toContain('press_key("Enter", modifiers=2)')
  })

  it('extracts via selector modes or raw JS expression', () => {
    expect(extractScript({ selector: 'h1' })).toContain('innerText')
    expect(extractScript({ selector: 'li', mode: 'texts', limit: 3 })).toContain('document.querySelectorAll')
    expect(extractScript({ selector: 'a', mode: 'html' })).toContain('outerHTML')
    expect(extractScript({ selector: 'a', mode: 'attr', attr: 'href' })).toContain('getAttribute(\\"href\\")')
    const expr = extractScript({ expression: '({a: document.title})' })
    expect(expr).toContain('js("({a: document.title})")')
    expect(extractScript({ selector: 'h1' })).toContain('"source"')
  })

  it('screenshots into the configured directory by default', () => {
    const script = screenshotScript({}, '/shots')
    expect(script).toContain('capture_screenshot(path=path, full=False, max_dim=None)')
    expect(script).toContain('os.path.join("/shots"')
    expect(script).toContain('time.strftime("%Y%m%d-%H%M%S")')
    const explicit = screenshotScript({ path: '/x/y.png', full: true, maxDim: 1800 }, '/shots')
    expect(explicit).toContain('path = "/x/y.png"')
    expect(explicit).toContain('full=True, max_dim=1800')
  })

  it('waits for load, element, network idle, and fixed delays', () => {
    const script = waitScript({ forLoad: true, selector: '#done', networkIdle: true, seconds: 0.5, timeout: 3 })
    expect(script).toContain('wait_for_load(timeout=15)')
    expect(script).toContain('wait_for_element("#done", timeout=3, visible=False)')
    expect(script).toContain('wait_for_network_idle(timeout=10)')
    expect(script).toContain('wait(0.5)')
    expect(script).toContain('"load": wait_for_load')
  })
})
