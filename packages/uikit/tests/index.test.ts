import { uiFunction } from '../src'
import { describe, it, expect } from 'vitest'

describe('uiFunction', () => {
  it('should return correct message', () => {
    expect(uiFunction()).toBe('Hello from UI Kit!')
  })
})
