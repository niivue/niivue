import { describe, it, expect } from 'vitest'
import { nice } from '../../../src/utils/nice'

describe('nice', () => {
  describe('with round = true', () => {
    it('should round values less than 1.5 to 1', () => {
      expect(nice(1.2, true)).toBe(1)
      expect(nice(14.9, true)).toBe(10)
      expect(nice(0.14, true)).toBe(0.1)
    })

    it('should round values between 1.5 and 3 to 2', () => {
      expect(nice(1.5, true)).toBe(2)
      expect(nice(2.9, true)).toBe(2)
      expect(nice(25, true)).toBe(20)
    })

    it('should round values between 3 and 7 to 5', () => {
      expect(nice(3, true)).toBe(5)
      expect(nice(6.9, true)).toBe(5)
      expect(nice(45, true)).toBe(50)
    })

    it('should round values 7 and above to 10', () => {
      expect(nice(7, true)).toBe(10)
      expect(nice(9.5, true)).toBe(10)
      expect(nice(85, true)).toBe(100)
    })
  })

  describe('with round = false', () => {
    it('should keep values <= 1 as 1', () => {
      expect(nice(1, false)).toBe(1)
      expect(nice(0.9, false)).toBe(1)
      expect(nice(10, false)).toBe(10)
    })

    it('should round values between 1 and 2 to 2', () => {
      expect(nice(1.1, false)).toBe(2)
      expect(nice(1.9, false)).toBe(2)
      expect(nice(15, false)).toBe(20)
    })

    it('should round values between 2 and 5 to 5', () => {
      expect(nice(2.1, false)).toBe(5)
      expect(nice(4.9, false)).toBe(5)
      expect(nice(35, false)).toBe(50)
    })

    it('should round values above 5 to 10', () => {
      expect(nice(5.1, false)).toBe(10)
      expect(nice(9.9, false)).toBe(10)
      expect(nice(75, false)).toBe(100)
    })
  })

  describe('edge cases', () => {
    it('should handle small decimal values', () => {
      expect(nice(0.0012, true)).toBe(0.001)
      expect(nice(0.0012, false)).toBe(0.002)
    })

    it('should handle large values', () => {
      expect(nice(1234, true)).toBe(1000)
      expect(nice(1234, false)).toBe(2000)
    })
  })
})
