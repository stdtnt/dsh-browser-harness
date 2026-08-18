// Real integration smoke: drives the plugin's built runner + script builders
// against a real browser-harness checkout and a real Chrome (headless, CDP on
// 9222). Run after `npm run build`:
//   node tests/smoke.mjs <browser-harness-checkout> <bh-home-dir>
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { HarnessRunner } from '../lib/runner.js'
import {
  navigateScript,
  infoScript,
  findScript,
  clickScript,
  extractScript,
  typeScript,
  screenshotScript,
  waitScript,
} from '../lib/scripts.js'

const [checkout, bhHome] = process.argv.slice(2)
if (!checkout || !bhHome) {
  console.error('usage: node tests/smoke.mjs <browser-harness-checkout> <bh-home-dir>')
  process.exit(2)
}

const screenshotDir = join(bhHome, 'shots')
mkdirSync(screenshotDir, { recursive: true })

const runner = new HarnessRunner({
  binPath: resolve(checkout, 'browser-harness'),
  cwd: checkout,
  timeoutMs: 90_000,
  screenshotDir,
  env: { BH_HOME: bhHome },
})
const signal = new AbortController().signal

const html =
  '<!doctype html><html><body><h1>Smoke Page</h1>' +
  '<button id="btn" onclick="document.getElementById(\'status\').textContent=\'clicked!\'">Click me</button>' +
  '<input id="input" placeholder="type here">' +
  '<p id="status">ready</p></body></html>'
const url = 'data:text/html;charset=utf-8,' + encodeURIComponent(html)

async function step(name, fn) {
  try {
    const value = await fn()
    console.log(`== ${name} OK ==`)
    console.log(JSON.stringify(value))
    return value
  } catch (error) {
    console.error(`== ${name} FAILED ==`)
    console.error(String(error).slice(0, 1200))
    process.exitCode = 1
    return undefined
  }
}

await step('navigate', () => runner.run(navigateScript({ url }), signal))
const info = await step('info', () => runner.run(infoScript(), signal))

const found = await step('find', () =>
  runner.run(findScript({ query: 'click me', limit: 5, withBox: true }), signal),
)
const first = found?.value?.matches?.[0]
if (first?.id !== undefined) {
  await step('click node', () => runner.run(clickScript({ nodeId: first.id }), signal))
} else if (info?.value?.page) {
  await step('click xy fallback', () => runner.run(clickScript({ x: 120, y: 90 }), signal))
}

await step('extract', () => runner.run(extractScript({ selector: '#status', mode: 'text' }), signal))
await step('type fill', () => runner.run(typeScript({ text: 'hello world', selector: '#input' }), signal))
await step('extract input value', () => runner.run(extractScript({ expression: 'document.querySelector("#input").value' }), signal))
await step('wait', () => runner.run(waitScript({ selector: '#status', timeout: 5 }), signal))
await step('screenshot', () => runner.run(screenshotScript({}, screenshotDir), signal))
