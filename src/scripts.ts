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
  url?: string
  history?: 'back' | 'forward'
  newTab?: boolean
  waitForLoad?: boolean
}
export interface TabsArgs {
  action: 'list' | 'switch' | 'close'
  targetId?: string
}
export interface FindArgs {
  query?: string
  role?: string
  limit?: number
  withBox?: boolean
}
export interface ClickArgs {
  nodeId?: number
  x?: number
  y?: number
  button?: 'left' | 'right' | 'middle'
  clicks?: number
}
export interface TypeArgs {
  text?: string
  selector?: string
  key?: string
  clear?: boolean
  modifiers?: number
}
export interface ExtractArgs {
  expression?: string
  selector?: string
  mode?: 'text' | 'texts' | 'html' | 'attr'
  attr?: string
  limit?: number
}
export interface ScreenshotArgs {
  path?: string
  full?: boolean
  maxDim?: number
}
export interface WaitArgs {
  forLoad?: boolean
  loadTimeout?: number
  selector?: string
  visible?: boolean
  timeout?: number
  networkIdle?: boolean
  networkIdleTimeout?: number
  seconds?: number
}

/** Encode a string as a JSON string literal, valid in both JS and Python. */
function py(value: string): string {
  return JSON.stringify(value)
}

const ENVELOPE = (body: string, value: string): string =>
  `import json\n\n${body}\n\nprint("__BH_RESULT__" + json.dumps(${value}, default=str))\n`

/** Navigate the current (or a fresh) tab, then wait for load by default. */
export function navigateScript(args: NavigateArgs): string {
  const url = args.url !== undefined ? py(args.url) : 'None'
  const history = args.history !== undefined ? py(args.history) : 'None'
  const body = `history = ${history}
fresh_tab = ${args.newTab === true ? 'True' : 'False'}

if history == "back":
    cdp("Page.goBack")
elif history == "forward":
    cdp("Page.goForward")
elif fresh_tab:
    new_tab(${url})
else:
    if ensure_real_tab() is None:
        new_tab(${url})
    else:
        goto_url(${url})
${args.waitForLoad === false ? '' : 'wait_for_load()'}
result = {"page": page_info(), "tab": current_tab()}`
  return ENVELOPE(body, 'result')
}

/** Current tab, all tabs, and page metrics. */
export function infoScript(): string {
  return ENVELOPE(
    'result = {"current": current_tab(), "tabs": list_tabs(), "page": page_info()}',
    'result',
  )
}

/** List, switch, or close tabs by target id. */
export function tabsScript(args: TabsArgs): string {
  const targetId = args.targetId !== undefined ? py(args.targetId) : 'None'
  const body = `action = ${py(args.action)}
target_id = ${targetId}

if action == "list":
    result = {"action": "list", "tabs": list_tabs()}
elif action == "switch":
    switch_tab(target_id)
    result = {"action": "switch", "tab": current_tab()}
else:
    close_tab(target_id)
    result = {"action": "close", "tabs": list_tabs()}`
  return ENVELOPE(body, 'result')
}

/** Search the accessibility tree; the recommended element-discovery path. */
export function findScript(args: FindArgs): string {
  const query = args.query !== undefined ? py(args.query) : 'None'
  const role = args.role !== undefined ? py(args.role) : 'None'
  const limit = args.limit ?? 20
  const withBox = args.withBox === true
  const body = `query = ${query}
role = ${role}
limit = ${limit}
interactive = {"button", "link", "textbox", "searchbox", "combobox", "checkbox",
               "radio", "switch", "menuitem", "tab", "listbox", "option",
               "slider", "spinbutton", "img", "heading", "label"}
out = []
for n in cdp("Accessibility.getFullAXTree")["nodes"]:
    if n.get("ignored"):
        continue
    bid = n.get("backendDOMNodeId")
    if bid is None:
        continue
    r = (n.get("role") or {}).get("value", "")
    name = (n.get("name") or {}).get("value", "")
    value = (n.get("value") or {}).get("value", "")
    if role is not None and r.lower() != role.lower():
        continue
    if query is not None:
        q = query.lower()
        if q not in name.lower() and q not in r.lower():
            continue
    elif r not in interactive:
        continue
    entry = {"id": bid, "role": r, "name": name}
    if value:
        entry["value"] = value
    if ${withBox ? 'True' : 'False'}:
        try:
            qp = cdp("DOM.getBoxModel", backendNodeId=bid)["model"]["content"]
            entry["x"] = (qp[0] + qp[2] + qp[4] + qp[6]) / 4
            entry["y"] = (qp[1] + qp[3] + qp[5] + qp[7]) / 4
        except Exception:
            pass
    out.append(entry)
    if len(out) >= limit:
        break
result = {"matches": out}`
  return ENVELOPE(body, 'result')
}

/** Click at viewport coordinates, or at an AX node's box center. */
export function clickScript(args: ClickArgs): string {
  const button = args.button ?? 'left'
  const clicks = args.clicks ?? 1
  const body =
    args.nodeId !== undefined
      ? `node_id = ${args.nodeId}
try:
    cdp("DOM.scrollIntoViewIfNeeded", backendNodeId=node_id)
except Exception:
    pass
q = cdp("DOM.getBoxModel", backendNodeId=node_id)["model"]["content"]
if not q:
    raise RuntimeError(f"element {node_id} has no box model (hidden?)")
x = (q[0] + q[2] + q[4] + q[6]) / 4
y = (q[1] + q[3] + q[5] + q[7]) / 4
click_at_xy(x, y, button=${py(button)}, clicks=${clicks})`
      : `x = ${args.x}
y = ${args.y}
click_at_xy(x, y, button=${py(button)}, clicks=${clicks})`
  return ENVELOPE(
    `${body}\nresult = {"x": x, "y": y, "page": page_info()}`,
    'result',
  )
}

/** Type into the focused element, fill a selector, or press a special key. */
export function typeScript(args: TypeArgs): string {
  const body = args.key !== undefined
    ? `press_key(${py(args.key)}, modifiers=${args.modifiers ?? 0})`
    : args.selector !== undefined
      ? `fill_input(${py(args.selector)}, ${py(args.text ?? '')}, clear_first=${args.clear === false ? 'False' : 'True'})`
      : `type_text(${py(args.text ?? '')})`
  return ENVELOPE(
    `${body}\nresult = {"ok": True, "page": page_info()}`,
    'result',
  )
}

/** Extract text/html/attributes via a CSS selector, or run raw JS. */
export function extractScript(args: ExtractArgs): string {
  const mode = args.mode ?? 'text'
  let expression: string
  if (args.expression !== undefined) {
    expression = args.expression
  } else {
    const sel = py(args.selector!)
    const limit = args.limit ?? 10
    if (mode === 'text') {
      expression = `(()=>{const e=document.querySelector(${sel});return e?e.innerText.trim():null})()`
    } else if (mode === 'texts') {
      expression = `Array.from(document.querySelectorAll(${sel})).slice(0, ${limit}).map(e => e.innerText.trim())`
    } else if (mode === 'html') {
      expression = `Array.from(document.querySelectorAll(${sel})).slice(0, ${limit}).map(e => e.outerHTML)`
    } else {
      const attr = py(args.attr ?? '')
      expression = `Array.from(document.querySelectorAll(${sel})).slice(0, ${limit}).map(e => e.getAttribute(${attr}))`
    }
  }
  // The whole expression is embedded as one JSON string literal, so inner
  // quotes stay escaped and never break the Python source.
  return ENVELOPE(
    `result = js(${py(expression)})\npage = page_info()\nresult = {"source": {"url": page.get("url"), "title": page.get("title")}, "result": result}`,
    'result',
  )
}

/** Capture a viewport (or full-page) PNG; defaults into the screenshot dir. */
export function screenshotScript(args: ScreenshotArgs, screenshotDir: string): string {
  const explicitPath = args.path !== undefined ? py(args.path) : 'None'
  const body = `import os

path = ${explicitPath}
if path is None:
    path = os.path.join(${py(screenshotDir)}, "bh-" + time.strftime("%Y%m%d-%H%M%S") + ".png")
path = capture_screenshot(path=path, full=${args.full === true ? 'True' : 'False'}, max_dim=${args.maxDim ?? 'None'})
result = {"path": path, "size": os.path.getsize(path), "page": page_info()}`
  return ENVELOPE(body, 'result')
}

/** Wait for load/element/network-idle and/or a fixed delay. */
export function waitScript(args: WaitArgs): string {
  const checks: string[] = []
  if (args.forLoad === true) {
    checks.push(`"load": wait_for_load(timeout=${args.loadTimeout ?? 15})`)
  }
  if (args.selector !== undefined) {
    checks.push(
      `"element": wait_for_element(${py(args.selector)}, timeout=${args.timeout ?? 10}, visible=${args.visible === true ? 'True' : 'False'})`,
    )
  }
  if (args.networkIdle === true) {
    checks.push(`"networkIdle": wait_for_network_idle(timeout=${args.networkIdleTimeout ?? 10})`)
  }
  if (args.seconds !== undefined) {
    checks.push(`"sleep": True`)
  }
  const body = [
    ...(args.seconds !== undefined ? [`wait(${args.seconds})`] : []),
    `result = {"checks": {${checks.join(', ')}}, "page": page_info()}`,
  ].join('\n')
  return ENVELOPE(body, 'result')
}
