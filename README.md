# dsh-browser-harness

Drive Chrome from the DeepSeek Harness agent loop through
[browser-harness](https://github.com/browser-use/browser-harness) — the thin
editable CDP harness that connects agents to a real browser. This plugin wraps
the `browser-harness` CLI and exposes nine agent tools covering navigation,
interaction, and extraction.

## Tools

| Tool | What it does |
| --- | --- |
| `browser_navigate` | Navigate to a URL (fresh tab on first use), or go back/forward; waits for load |
| `browser_info` | Current tab, all tabs, and page metrics (viewport/scroll/page size) |
| `browser_tabs` | List, switch, or close tabs by target id |
| `browser_find` | Search the accessibility tree by name/role; returns `id`s for clicking |
| `browser_click` | Click at viewport coordinates or at an AX element id (scrolls into view) |
| `browser_type` | Type into the focused element, fill a selector (fires input/change), or press special keys |
| `browser_extract` | Extract text/html/attributes via selector, or run arbitrary JS |
| `browser_screenshot` | Capture a viewport or full-page PNG |
| `browser_wait` | Wait for load, an element, network idle, or a fixed delay |

All tools present as generic cards in the Web UI. Every call is one short-lived
`browser-harness` subprocess; the harness daemon keeps the browser connection
alive between calls.

## Requirements

- A working `browser-harness` installation or checkout
  (see its [install.md](https://github.com/browser-use/browser-harness/blob/main/install.md)),
  with a browser the daemon can attach to (local Chrome with remote debugging
  enabled, or a cloud browser via `BU_NAME`/`BU_CDP_URL`).
- DeepSeek Harness (`dsh` CLI) for the profile the plugin is installed into.

## Install

```sh
dsh plugin --profile <name> add ./plugins/dsh-browser-harness
```

Point the plugin at your harness binary. If `browser-harness` is on PATH,
nothing else is needed; for an uninstalled checkout, add the plugin row config
to the profile's `cordis.patch.yml` (or a `--patch` overlay):

```yaml
- update:
    - id: dsh-browser-harness
      config:
        binPath: /Users/you/projects/browser-harness/browser-harness
        cwd: /Users/you/projects/browser-harness
```

Then boot the profile and ask the agent to browse:

```sh
dsh --profile <name>
```

## Configuration

All keys are optional; defaults are applied in code.

| Key | Default | Meaning |
| --- | --- | --- |
| `binPath` | `browser-harness` (PATH) | The binary to invoke; use a checkout launcher path for an uninstalled harness |
| `cwd` | process cwd | Working directory for harness invocations (set to the checkout root when `binPath` is relative) |
| `timeoutMs` | `120000` | Per-call wall-clock cap |
| `screenshotDir` | process cwd | Directory for timestamped screenshots (when the tool is called without `path`) |
| `env` | `{}` | Extra environment for every invocation, e.g. `BU_NAME`, `BU_CDP_URL`, `BH_DOMAIN_SKILLS`, `BH_RECORD` |

Example: use a named remote (cloud) browser:

```yaml
- update:
    - id: dsh-browser-harness
      config:
        env:
          BU_NAME: r7k2
```

## How it works

Each tool builds a small Python program (helpers pre-imported by the harness
CLI), pipes it to `browser-harness` stdin, and parses the single
`__BH_RESULT__` JSON marker line the program prints. User-provided strings are
embedded as JSON literals (valid Python literals too), never as raw source.
A call that is cancelled (agent abort or per-call timeout) kills the child and
reports accordingly; harness failures surface the stderr tail and point at
`browser-harness --doctor`.

The plugin runs no browser itself — it reuses the harness daemon and the
browser the daemon attaches to. First navigation opens a fresh tab when no real
tab exists (`ensure_real_tab()`), matching the harness's own convention.

## Development

```sh
npm install
npm run typecheck
npm test          # unit tests against a fake harness binary
npm run build     # tsc → lib/
```

Unit tests exercise the runner protocol, script builders, and argument
validators with a fake `browser-harness` shim; no browser or harness install is
needed. A real smoke test: launch Chrome with
`--remote-debugging-port=9222 --user-data-dir=/tmp/bh-test-profile`, set
`binPath` to a harness checkout launcher, and drive the tools from an agent
session.

## Security notes

`browser_extract` and `browser_click`/`browser_type` execute arbitrary page
JavaScript or drive real input events in the attached browser, and every call
runs Python through the harness CLI — the same trust level as a shell tool.
The attached browser is the user's real browser (or a named cloud browser), so
deployment policy (allow/deny, confirmation) belongs in a
`tools/pre-execute` gate, per the DSH extension cookbook.
