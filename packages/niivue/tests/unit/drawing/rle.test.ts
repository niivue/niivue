import { expect, test, describe } from 'vitest'
import { decodeRLE, encodeRLE } from '../../../src/drawing/rle'

describe('RLE (Run Length Encoding) functions', () => {
  describe('decodeRLE', () => {
    test('should decode a simple run', () => {
      // RLE format: negative header (-count+1) followed by value
      // This represents 5 consecutive 255s
      const rle = new Uint8Array([-4, 255].map((v) => v & 0xff))
      const decoded = decodeRLE(rle, 5)
      expect(decoded).toEqual(new Uint8Array([255, 255, 255, 255, 255]))
    })

    test('should decode a literal sequence', () => {
      // RLE format: positive header (count-1) followed by literal values
      // Header 2 means 3 literal values follow
      const rle = new Uint8Array([2, 10, 20, 30])
      const decoded = decodeRLE(rle, 3)
      expect(decoded).toEqual(new Uint8Array([10, 20, 30]))
    })

    test('should decode mixed runs and literals', () => {
      // -2 = run of 3 255s, 1 = 2 literals (10, 20), -1 = run of 2 128s
      const rle = new Uint8Array([-2, 255, 1, 10, 20, -1, 128].map((v) => v & 0xff))
      const decoded = decodeRLE(rle, 7)
      expect(decoded).toEqual(new Uint8Array([255, 255, 255, 10, 20, 128, 128]))
    })

    test('should decode empty data', () => {
      const rle = new Uint8Array([])
      const decoded = decodeRLE(rle, 0)
      expect(decoded).toEqual(new Uint8Array([]))
    })

    test('should handle maximum run length', () => {
      // Maximum run length is 128 (header = -127)
      const rle = new Uint8Array([-127, 42].map((v) => v & 0xff))
      const decoded = decodeRLE(rle, 128)
      expect(decoded.length).toBe(128)
      expect(decoded.every((v) => v === 42)).toBe(true)
    })

    test('should handle maximum literal length', () => {
      // Maximum literal length is 128 (header = 127)
      const values = Array.from({ length: 128 }, (_, i) => i)
      const rle = new Uint8Array([127, ...values])
      const decoded = decodeRLE(rle, 128)
      expect(decoded).toEqual(new Uint8Array(values))
    })
  })

  describe('encodeRLE', () => {
    test('should encode a simple run', () => {
      const data = new Uint8Array([255, 255, 255, 255, 255])
      const encoded = encodeRLE(data)
      // Should produce: [-4, 255] (run of 5)
      expect(encoded[0]).toBe(252) // -4 as unsigned
      expect(encoded[1]).toBe(255)
    })

    test('should encode literal values', () => {
      const data = new Uint8Array([10, 20, 30])
      const encoded = encodeRLE(data)
      // Should produce: [2, 10, 20, 30] (3 literals)
      expect(encoded[0]).toBe(2)
      expect(encoded[1]).toBe(10)
      expect(encoded[2]).toBe(20)
      expect(encoded[3]).toBe(30)
    })

    test('should encode mixed data', () => {
      const data = new Uint8Array([255, 255, 255, 10, 20, 128, 128])
      const encoded = encodeRLE(data)
      const decoded = decodeRLE(encoded, data.length)
      expect(decoded).toEqual(data)
    })

    test('should encode empty data', () => {
      const data = new Uint8Array([])
      const encoded = encodeRLE(data)
      expect(encoded.length).toBe(0)
    })

    test('should handle maximum run length', () => {
      // Create 129 identical values - should split into runs
      const data = new Uint8Array(129).fill(42)
      const encoded = encodeRLE(data)

      // Just verify the round trip works correctly
      const decoded = decodeRLE(encoded, data.length)
      expect(decoded).toEqual(data)

      // Encoded should be much smaller than original
      expect(encoded.length).toBeLessThan(10)
    })

    test('should handle alternating values', () => {
      const data = new Uint8Array([1, 2, 1, 2, 1, 2])
      const encoded = encodeRLE(data)

      // Should encode as literals since no runs
      expect(encoded[0]).toBe(5) // 6 literals
      expect(Array.from(encoded.slice(1, 7))).toEqual([1, 2, 1, 2, 1, 2])
    })

    test('should detect runs after literals', () => {
      const data = new Uint8Array([1, 2, 3, 3, 3])
      const encoded = encodeRLE(data)

      const signed = new Int8Array(encoded.buffer, 0, encoded.length)

      // First: literals 1, 2
      expect(signed[0]).toBe(1)
      expect(encoded[1]).toBe(1)
      expect(encoded[2]).toBe(2)

      // Then: run of 3 3s
      expect(signed[3]).toBe(-2)
      expect(encoded[4]).toBe(3)
    })
  })

  describe('encode/decode round trip', () => {
    test('should preserve data through encode/decode cycle', () => {
      const testCases = [
        new Uint8Array([1, 2, 3, 4, 5]),
        new Uint8Array([255, 255, 255, 255]),
        new Uint8Array([0, 0, 1, 1, 2, 2, 3, 3]),
        new Uint8Array(Array.from({ length: 256 }, (_, i) => i % 256)),
        new Uint8Array(1000).fill(42),
        new Uint8Array([])
      ]

      for (const original of testCases) {
        const encoded = encodeRLE(original)
        const decoded = decodeRLE(encoded, original.length)
        expect(decoded).toEqual(original)
      }
    })

    test('should handle worst case scenario', () => {
      // Worst case: no repeating values
      const original = new Uint8Array(Array.from({ length: 1000 }, (_, i) => i % 256))
      const encoded = encodeRLE(original)
      const decoded = decodeRLE(encoded, original.length)

      expect(decoded).toEqual(original)
      // Encoded should be slightly larger (due to headers)
      expect(encoded.length).toBeGreaterThan(original.length)
      expect(encoded.length).toBeLessThan(original.length * 1.02) // Less than 2% overhead
    })

    test('should handle best case scenario', () => {
      // Best case: all same values
      const original = new Uint8Array(1000).fill(123)
      const encoded = encodeRLE(original)
      const decoded = decodeRLE(encoded, original.length)

      expect(decoded).toEqual(original)
      // Encoded should be much smaller
      expect(encoded.length).toBeLessThan(20) // Should need only a few run headers
    })
  })
})
