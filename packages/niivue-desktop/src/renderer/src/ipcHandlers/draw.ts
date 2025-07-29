// src/ipcHandlers/draw.ts
import { Niivue } from '@niivue/niivue'

const electron = window.electron

/**
 * Listens for 'draw-command' and invokes the corresponding Niivue draw APIs.
 */
export function registerDrawHandler(nv: Niivue): void {
  // Clean up any existing listener
  electron.ipcRenderer.removeAllListeners('draw-command')

  electron.ipcRenderer.on('draw-command', async (_evt, cmd: string) => {
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
      case 'DrawOtsu': {
        const input = prompt('Segmentation classes (2–4)', '3')
        const levels = input ? parseInt(input, 10) : NaN
        if (!isNaN(levels)) nv.drawOtsu(levels)
        break
      }
      default:
        console.warn(`Unrecognized draw command: ${cmd}`)
    }

    // Always re-draw after a draw command
    nv.drawScene()
  })
}
