import { log } from '@/logger'
import { decodeRLE } from '@/drawing/rle'

interface DrawUndoArgs {
  drawUndoBitmaps: Uint8Array[]
  currentDrawUndoBitmap: number
  drawBitmap: Uint8Array
}
export const drawUndo = ({
  drawUndoBitmaps,
  currentDrawUndoBitmap,
  drawBitmap
}: DrawUndoArgs): { drawBitmap: Uint8Array; currentDrawUndoBitmap: number } | undefined => {
  const len = drawUndoBitmaps.length
  if (len < 1) {
    log.debug('undo bitmaps not loaded')
    return
  }
  currentDrawUndoBitmap--
  if (currentDrawUndoBitmap < 0) {
    currentDrawUndoBitmap = len - 1
  }
  if (currentDrawUndoBitmap >= len) {
    currentDrawUndoBitmap = 0
  }
  if (drawUndoBitmaps[currentDrawUndoBitmap].length < 2) {
    log.debug('drawUndo is misbehaving')
    return
  }
  drawBitmap = decodeRLE(drawUndoBitmaps[currentDrawUndoBitmap], drawBitmap.length)
  return { drawBitmap, currentDrawUndoBitmap }
}
