/**
 * Cross-field argument validators the schema DSL cannot express.
 * @module tests/validators
 */

import { describe, expect, it } from 'vitest'
import {
  validateClickArgs,
  validateExtractArgs,
  validateFindArgs,
  validateNavigateArgs,
  validateScreenshotArgs,
  validateTabsArgs,
  validateTypeArgs,
  validateWaitArgs,
} from '../src/validators.ts'

describe('validateNavigateArgs', () => {
  it('requires a url unless history is set', () => {
    expect(() => validateNavigateArgs({})).toThrow('invalid url')
    expect(() => validateNavigateArgs({ url: ' ' })).toThrow('invalid url')
    expect(() => validateNavigateArgs({ url: 'https://a.dev' })).not.toThrow()
    expect(() => validateNavigateArgs({ history: 'back' })).not.toThrow()
  })

  it('forbids url+history and history+newTab mixes', () => {
    expect(() => validateNavigateArgs({ url: 'https://a.dev', history: 'back' })).toThrow(
      'mutually exclusive',
    )
    expect(() => validateNavigateArgs({ history: 'back', newTab: true })).toThrow(
      'cannot be combined',
    )
  })
})

describe('validateTabsArgs', () => {
  it('requires targetId for switch/close', () => {
    expect(() => validateTabsArgs({ action: 'list' })).not.toThrow()
    expect(() => validateTabsArgs({ action: 'switch' })).toThrow('requires "targetId"')
    expect(() => validateTabsArgs({ action: 'close', targetId: '' })).toThrow('requires "targetId"')
    expect(() => validateTabsArgs({ action: 'close', targetId: 'ABC' })).not.toThrow()
  })
})

describe('validateFindArgs', () => {
  it('bounds the limit to 1..50 and rejects blank queries', () => {
    expect(() => validateFindArgs({ limit: 0 })).toThrow('invalid limit')
    expect(() => validateFindArgs({ limit: 51 })).toThrow('invalid limit')
    expect(() => validateFindArgs({ limit: 20 })).not.toThrow()
    expect(() => validateFindArgs({ query: '' })).toThrow('invalid query')
    expect(() => validateFindArgs({ role: 'button' })).not.toThrow()
  })
})

describe('validateClickArgs', () => {
  it('requires nodeId XOR x+y', () => {
    expect(() => validateClickArgs({})).toThrow('provide either "nodeId" or both "x" and "y"')
    expect(() => validateClickArgs({ x: 1 })).toThrow('provide either')
    expect(() => validateClickArgs({ nodeId: 1, x: 1, y: 1 })).toThrow('cannot be combined')
    expect(() => validateClickArgs({ x: 1, y: 2 })).not.toThrow()
    expect(() => validateClickArgs({ nodeId: 7 })).not.toThrow()
  })

  it('bounds the click count', () => {
    expect(() => validateClickArgs({ x: 1, y: 1, clicks: 0 })).toThrow('invalid clicks')
    expect(() => validateClickArgs({ x: 1, y: 1, clicks: 2 })).not.toThrow()
  })
})

describe('validateTypeArgs', () => {
  it('requires exactly one of text/key', () => {
    expect(() => validateTypeArgs({})).toThrow('exactly one of "text"')
    expect(() => validateTypeArgs({ text: 'a', key: 'Enter' })).toThrow('exactly one of "text"')
    expect(() => validateTypeArgs({ text: 'a' })).not.toThrow()
    expect(() => validateTypeArgs({ key: 'Enter' })).not.toThrow()
  })

  it('forbids selector with key and empty text', () => {
    expect(() => validateTypeArgs({ key: 'Tab', selector: '#x' })).toThrow('cannot be combined')
    expect(() => validateTypeArgs({ text: '' })).toThrow('exactly one of "text"')
    expect(() => validateTypeArgs({ text: 'a', selector: '#x' })).not.toThrow()
  })
})

describe('validateExtractArgs', () => {
  it('requires exactly one of expression/selector', () => {
    expect(() => validateExtractArgs({})).toThrow('exactly one of "expression" or "selector"')
    expect(() => validateExtractArgs({ expression: '1', selector: 'h1' })).toThrow('exactly one of')
    expect(() => validateExtractArgs({ selector: 'h1' })).not.toThrow()
    expect(() => validateExtractArgs({ expression: 'document.title' })).not.toThrow()
  })

  it('requires attr for attr mode and bounds limit', () => {
    expect(() => validateExtractArgs({ selector: 'a', mode: 'attr' })).toThrow('invalid attr')
    expect(() => validateExtractArgs({ selector: 'a', mode: 'attr', attr: 'href' })).not.toThrow()
    expect(() => validateExtractArgs({ selector: 'a', limit: 100 })).toThrow('invalid limit')
  })
})

describe('validateScreenshotArgs', () => {
  it('rejects blank paths and out-of-range maxDim', () => {
    expect(() => validateScreenshotArgs({ path: '' })).toThrow('invalid path')
    expect(() => validateScreenshotArgs({ maxDim: 5000 })).toThrow('invalid maxDim')
    expect(() => validateScreenshotArgs({ path: '/x.png', maxDim: 1800 })).not.toThrow()
  })
})

describe('validateWaitArgs', () => {
  it('requires at least one wait condition', () => {
    expect(() => validateWaitArgs({})).toThrow('at least one of')
    expect(() => validateWaitArgs({ forLoad: true })).not.toThrow()
    expect(() => validateWaitArgs({ seconds: 1 })).not.toThrow()
  })

  it('rejects non-positive timeouts', () => {
    expect(() => validateWaitArgs({ forLoad: true, loadTimeout: 0 })).toThrow('invalid loadTimeout')
    expect(() => validateWaitArgs({ selector: '#x', timeout: -1 })).toThrow('invalid timeout')
    expect(() => validateWaitArgs({ networkIdle: true, networkIdleTimeout: 0 })).toThrow(
      'invalid networkIdleTimeout',
    )
    expect(() => validateWaitArgs({ seconds: 0 })).toThrow('invalid seconds')
  })
})
