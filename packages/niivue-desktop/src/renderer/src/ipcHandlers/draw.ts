// src/ipcHandlers/draw.ts
import { Niivue } from '@niivue/niivue'
// import type { UpdateDocument } from '../AppContext.js'

const electron = window.electron

/**
 * Listen for 'draw-command' from the main menu,
 * execute it on the current Niivue instance, then persist
 * the updated opts back into your AppContext.
 */
export function registerDrawHandler(
  nv: Niivue,
  // docId: string,
  // updateDocument: UpdateDocument
): void {
  // clean up any old handler
  electron.ipcRenderer.removeAllListeners('draw-command')

  // add the new one
  electron.ipcRenderer.on('draw-command', (_evt, cmd: string) => {
    // 1) Execute the draw command
    switch (cmd) {
      case 'Off':
        nv.setDrawingEnabled(false)
        break
      case 'Undo':
        nv.drawUndo()
        break
      case 'Red':
        nv.setDrawingEnabled(true)
        nv.setPenValue(1, nv.drawFillOverwrites)
        break
      case 'Green':
        nv.setDrawingEnabled(true)
        nv.setPenValue(2, nv.drawFillOverwrites)
        break
      case 'Blue':
        nv.setDrawingEnabled(true)
        nv.setPenValue(3, nv.drawFillOverwrites)
        break
      case 'Yellow':
        nv.setDrawingEnabled(true)
        nv.setPenValue(4, nv.drawFillOverwrites)
        break
      case 'Cyan':
        nv.setDrawingEnabled(true)
        nv.setPenValue(5, nv.drawFillOverwrites)
        break
      case 'Purple':
        nv.setDrawingEnabled(true)
        nv.setPenValue(6, nv.drawFillOverwrites)
        break
      case 'Erase':
        nv.setDrawingEnabled(true)
        nv.setPenValue(0, nv.drawFillOverwrites)
        break
      case 'Cluster':
        nv.setDrawingEnabled(true)
        nv.setPenValue(-0, nv.drawFillOverwrites)
        break
      case 'GrowCluster':
        nv.setDrawingEnabled(true)
        nv.setPenValue(Number.NEGATIVE_INFINITY, nv.drawFillOverwrites)
        break
      case 'GrowClusterBright':
        nv.setDrawingEnabled(true)
        nv.setPenValue(Number.POSITIVE_INFINITY, nv.drawFillOverwrites)
        break
      case 'ClickToSegmentAuto':
        nv.opts.clickToSegmentIs2D = false
        nv.opts.clickToSegment = true
        nv.setDrawingEnabled(true)
        break
      case 'ClickToSegment2D':
        nv.opts.clickToSegmentIs2D = true
        nv.opts.clickToSegment = true
        nv.setDrawingEnabled(true)
        break
      case 'DrawFilled':
        nv.drawFillOverwrites = !nv.drawFillOverwrites
        break
      case 'DrawOverwrite':
        nv.drawFillOverwrites = !nv.drawFillOverwrites
        break
      case 'Translucent':
        nv.drawOpacity = nv.drawOpacity > 0.75 ? 0.5 : 1.0
        break
      case 'ThinPen':
        nv.opts.penSize = nv.opts.penSize > 1 ? 1 : 3
        break
      case 'Growcut':
        nv.drawGrowCut()
        break
      case 'DrawOtsu':
        {
          const input = prompt('Segmentation classes (2–4)', '3')
          const levels = input ? parseInt(input, 10) : NaN
          if (!isNaN(levels)) nv.drawOtsu(levels)
        }
        break
      default:
        console.warn(`Unrecognized draw command: ${cmd}`)
    }

    // 2) Redraw
    nv.drawScene()

    // 3) Persist only the updated opts + mark dirty
    // updateDocument(docId, {
    //   opts: { ...nv.opts },
    //   isDirty: true
    // })
  })
}
