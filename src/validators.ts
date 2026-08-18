/**
 * Cross-field argument validation for the browser tools.
 *
 * `defineTool` validates the per-property schema, so these functions only
 * hand-check constraints the schema DSL cannot express: mutual exclusion,
 * required pairing, and positive-integer bounds.
 *
 * @module validators
 */

import type { ClickArgs, ExtractArgs, FindArgs, NavigateArgs, ScreenshotArgs, TabsArgs, TypeArgs, WaitArgs } from './scripts.ts'

function requireString(value: string | undefined, label: string): void {
  if (value === undefined || value.trim() === '') {
    throw new Error(`invalid ${label}: expected a non-empty string`)
  }
}

function requirePositiveNumber(value: number | undefined, label: string): void {
  if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
    throw new Error(`invalid ${label}: expected a positive number, got ${JSON.stringify(value)}`)
  }
}

function requirePositiveInteger(value: number | undefined, label: string, max: number): void {
  if (value !== undefined && (!Number.isInteger(value) || value <= 0 || value > max)) {
    throw new Error(`invalid ${label}: expected an integer in 1..${max}, got ${JSON.stringify(value)}`)
  }
}

/** `url` XOR `history`; `newTab` only makes sense with `url`. */
export function validateNavigateArgs(args: NavigateArgs): void {
  if (args.history !== undefined) {
    if (args.url !== undefined) {
      throw new Error('invalid args: "url" and "history" are mutually exclusive')
    }
    if (args.newTab === true) {
      throw new Error('invalid args: "newTab" cannot be combined with "history"')
    }
  } else {
    requireString(args.url, 'url')
  }
}

/** `switch`/`close` need a target id. */
export function validateTabsArgs(args: TabsArgs): void {
  if ((args.action === 'switch' || args.action === 'close') && (args.targetId === undefined || args.targetId === '')) {
    throw new Error(`invalid args: "${args.action}" requires "targetId"`)
  }
}

/** Free-text query bounds; the AX filter itself lives in the Python. */
export function validateFindArgs(args: FindArgs): void {
  requirePositiveInteger(args.limit, 'limit', 50)
  if (args.query !== undefined) requireString(args.query, 'query')
  if (args.role !== undefined) requireString(args.role, 'role')
}

/** `nodeId` XOR `x`+`y`; click count is a positive integer. */
export function validateClickArgs(args: ClickArgs): void {
  if (args.nodeId !== undefined) {
    if (args.x !== undefined || args.y !== undefined) {
      throw new Error('invalid args: "nodeId" cannot be combined with "x"/"y"')
    }
  } else if (args.x === undefined || args.y === undefined) {
    throw new Error('invalid args: provide either "nodeId" or both "x" and "y"')
  }
  requirePositiveInteger(args.clicks, 'clicks', 20)
}

/** Exactly one of `text`/`key`; `selector` pairs with `text` only. */
export function validateTypeArgs(args: TypeArgs): void {
  const hasText = args.text !== undefined && args.text !== ''
  const hasKey = args.key !== undefined && args.key !== ''
  if (hasText === hasKey) {
    throw new Error('invalid args: provide exactly one of "text" (with optional "selector") or "key"')
  }
  if (hasKey && (args.text !== undefined || args.selector !== undefined)) {
    throw new Error('invalid args: "key" cannot be combined with "text" or "selector"')
  }
}

/** Exactly one of `expression`/`selector`; `attr` is required with mode attr. */
export function validateExtractArgs(args: ExtractArgs): void {
  const hasExpression = args.expression !== undefined && args.expression !== ''
  const hasSelector = args.selector !== undefined && args.selector !== ''
  if (hasExpression === hasSelector) {
    throw new Error('invalid args: provide exactly one of "expression" or "selector"')
  }
  if (hasSelector && args.mode === 'attr') {
    requireString(args.attr, 'attr (required when mode is attr)')
  }
  requirePositiveInteger(args.limit, 'limit', 50)
}

/** Output path non-empty; `maxDim` bounded to the image downscale range. */
export function validateScreenshotArgs(args: ScreenshotArgs): void {
  if (args.path !== undefined) requireString(args.path, 'path')
  requirePositiveInteger(args.maxDim, 'maxDim', 4096)
}

/** At least one wait condition; every timeout is a positive number. */
export function validateWaitArgs(args: WaitArgs): void {
  if (args.forLoad !== true && args.selector === undefined && args.networkIdle !== true && args.seconds === undefined) {
    throw new Error('invalid args: set at least one of "forLoad", "selector", "networkIdle", or "seconds"')
  }
  requirePositiveNumber(args.loadTimeout, 'loadTimeout')
  requirePositiveNumber(args.timeout, 'timeout')
  requirePositiveNumber(args.networkIdleTimeout, 'networkIdleTimeout')
  requirePositiveNumber(args.seconds, 'seconds')
}
