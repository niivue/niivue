import { UIKRenderer, UIKFont, UIK_VERSION, checkUIKitCompatibility } from '../src'
import { describe, it, expect } from 'vitest'

describe('UIKit exports', () => {
  it('should export UIKRenderer class', () => {
    expect(UIKRenderer).toBeDefined()
    expect(typeof UIKRenderer).toBe('function')
  })

  it('should export UIKFont class', () => {
    expect(UIKFont).toBeDefined()
    expect(typeof UIKFont).toBe('function')
  })

  it('should export version information', () => {
    expect(UIK_VERSION).toBeDefined()
    expect(typeof UIK_VERSION).toBe('string')
    expect(UIK_VERSION).toMatch(/\d+\.\d+\.\d+/)
  })

  it('should export compatibility checker', () => {
    expect(checkUIKitCompatibility).toBeDefined()
    expect(typeof checkUIKitCompatibility).toBe('function')
  })
})
