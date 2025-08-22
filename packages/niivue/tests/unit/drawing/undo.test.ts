import { expect, test, describe, vi } from 'vitest'
import { drawUndo } from '../../../src/drawing/undo'
import { decodeRLE } from '../../../src/drawing/rle'

vi.mock('../../../src/logger', () => ({
  log: {
    debug: vi.fn()
  }
}))

vi.mock('../../../src/drawing/rle', () => ({
  decodeRLE: vi.fn()
}))

describe('drawUndo', () => {
  test('should return undefined when drawUndoBitmaps is empty', () => {
    const args = {
      drawUndoBitmaps: [],
      currentDrawUndoBitmap: 0,
      drawBitmap: new Uint8Array([1, 2, 3])
    }

    const result = drawUndo(args)
    expect(result).toBeUndefined()
  })

  test('should wrap around to last bitmap when currentDrawUndoBitmap becomes negative', () => {
    const mockBitmap1 = new Uint8Array([1, 2, 3, 4])
    const mockBitmap2 = new Uint8Array([5, 6, 7, 8])
    const mockBitmap3 = new Uint8Array([9, 10, 11, 12])
    const decodedData = new Uint8Array([9, 10, 11, 12])

    vi.mocked(decodeRLE).mockReturnValue(decodedData)

    const args = {
      drawUndoBitmaps: [mockBitmap1, mockBitmap2, mockBitmap3],
      currentDrawUndoBitmap: 0,
      drawBitmap: new Uint8Array([0, 0, 0, 0])
    }

    const result = drawUndo(args)

    expect(result).toBeDefined()
    expect(result?.currentDrawUndoBitmap).toBe(2) // wrapped to last index
    expect(result?.drawBitmap).toEqual(decodedData)
    expect(decodeRLE).toHaveBeenCalledWith(mockBitmap3, 4)
  })

  test('should wrap around to first bitmap when currentDrawUndoBitmap exceeds array length', () => {
    const mockBitmap1 = new Uint8Array([1, 2, 3, 4])
    const mockBitmap2 = new Uint8Array([5, 6, 7, 8])

    const args = {
      drawUndoBitmaps: [mockBitmap1, mockBitmap2],
      currentDrawUndoBitmap: 3, // exceeds array length
      drawBitmap: new Uint8Array([0, 0, 0])
    }

    const result = drawUndo(args)

    expect(result).toBeDefined()
    expect(result?.currentDrawUndoBitmap).toBe(0) // wrapped to first index after decrement
  })

  test('should return undefined when bitmap at current index has length < 2', () => {
    const args = {
      drawUndoBitmaps: [new Uint8Array([1]), new Uint8Array([2])],
      currentDrawUndoBitmap: 1,
      drawBitmap: new Uint8Array([0, 0, 0])
    }

    const result = drawUndo(args)
    expect(result).toBeUndefined()
  })

  test('should successfully decode and return bitmap', () => {
    const mockBitmap1 = new Uint8Array([1, 2, 3, 4])
    const mockBitmap2 = new Uint8Array([5, 6, 7, 8])
    const decodedData = new Uint8Array([100, 101, 102])

    vi.mocked(decodeRLE).mockReturnValue(decodedData)

    const args = {
      drawUndoBitmaps: [mockBitmap1, mockBitmap2],
      currentDrawUndoBitmap: 1,
      drawBitmap: new Uint8Array([0, 0, 0])
    }

    const result = drawUndo(args)

    expect(result).toBeDefined()
    expect(result?.currentDrawUndoBitmap).toBe(0) // decremented from 1
    expect(result?.drawBitmap).toEqual(decodedData)
    expect(decodeRLE).toHaveBeenCalledWith(mockBitmap1, 3)
  })

  test('should handle normal undo operation', () => {
    const mockBitmap1 = new Uint8Array([1, 2, 3, 4])
    const mockBitmap2 = new Uint8Array([5, 6, 7, 8])
    const mockBitmap3 = new Uint8Array([9, 10, 11, 12])
    const decodedData = new Uint8Array([200, 201, 202])

    vi.mocked(decodeRLE).mockReturnValue(decodedData)

    const args = {
      drawUndoBitmaps: [mockBitmap1, mockBitmap2, mockBitmap3],
      currentDrawUndoBitmap: 2,
      drawBitmap: new Uint8Array([0, 0, 0])
    }

    const result = drawUndo(args)

    expect(result).toBeDefined()
    expect(result?.currentDrawUndoBitmap).toBe(1) // decremented from 2
    expect(result?.drawBitmap).toEqual(decodedData)
    expect(decodeRLE).toHaveBeenCalledWith(mockBitmap2, 3)
  })
})
