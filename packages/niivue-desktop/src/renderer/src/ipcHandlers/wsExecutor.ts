import React from 'react'
import { Niivue, NVImage, NVMesh } from '@niivue/niivue'
import type { WsExecuteMessage, WsResponseMessage, VolumeInfo, SceneInfo } from '../../../common/wsProtocol.js'

const electron = window.electron

/**
 * Register the WebSocket executor that listens for ws:execute IPC messages
 * from the main process, dispatches them to the NiiVue instance, and
 * sends results back via ws:response.
 *
 * File I/O (reading volumes/meshes from disk, writing screenshots) is handled
 * by the main process (wsServer.ts). The renderer only works with base64 data
 * and NiiVue API calls.
 */
export function registerWsExecutor(
  nv: Niivue,
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>,
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
): void {
  electron.ipcRenderer.on('ws:execute', async (_event: unknown, msg: WsExecuteMessage) => {
    const { requestId, method, params } = msg
    try {
      const result = await executeMethod(nv, method, params, setVolumes, setMeshes)
      const response: WsResponseMessage = { requestId, result }
      electron.ipcRenderer.send('ws:response', response)
    } catch (err) {
      const response: WsResponseMessage = {
        requestId,
        error: err instanceof Error ? err.message : String(err)
      }
      electron.ipcRenderer.send('ws:response', response)
    }
  })
}

async function executeMethod(
  nv: Niivue,
  method: string,
  params: Record<string, unknown>,
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>,
  setMeshes: React.Dispatch<React.SetStateAction<NVMesh[]>>
): Promise<unknown> {
  switch (method) {
    case 'loadVolume': {
      // Main process pre-reads the file and sends base64 + name
      const base64 = params.base64 as string
      const name = params.name as string
      if (!base64) throw new Error('Missing file data')
      const vol = await NVImage.loadFromBase64({ base64, name: name || 'volume' })
      nv.addVolume(vol)
      nv.drawScene()
      setVolumes([...nv.volumes])
      const index = nv.volumes.length - 1
      return { index, id: vol.id }
    }

    case 'removeVolume': {
      const index = params.index as number
      if (index == null) throw new Error('Missing required param: index')
      if (index < 0 || index >= nv.volumes.length) throw new Error(`Volume index ${index} out of range`)
      const vol = nv.volumes[index]
      nv.removeVolume(vol)
      nv.drawScene()
      setVolumes([...nv.volumes])
      return null
    }

    case 'getVolumes': {
      return nv.volumes.map((vol, i): VolumeInfo => ({
        index: i,
        id: vol.id,
        name: vol.name,
        colormap: vol.colormap,
        opacity: vol.opacity,
        dims: vol.dims ? Array.from(vol.dims) : []
      }))
    }

    case 'setColormap': {
      const volumeIndex = params.volumeIndex as number
      const colormap = params.colormap as string
      if (volumeIndex == null) throw new Error('Missing required param: volumeIndex')
      if (!colormap) throw new Error('Missing required param: colormap')
      if (volumeIndex < 0 || volumeIndex >= nv.volumes.length) {
        throw new Error(`Volume index ${volumeIndex} out of range`)
      }
      const vol = nv.volumes[volumeIndex]
      nv.setColormap(vol.id, colormap)
      nv.drawScene()
      return null
    }

    case 'setOpacity': {
      const volumeIndex = params.volumeIndex as number
      const opacity = params.opacity as number
      if (volumeIndex == null) throw new Error('Missing required param: volumeIndex')
      if (opacity == null) throw new Error('Missing required param: opacity')
      nv.setOpacity(volumeIndex, opacity)
      nv.drawScene()
      return null
    }

    case 'setSliceType': {
      const sliceType = params.sliceType as number
      if (sliceType == null) throw new Error('Missing required param: sliceType')
      nv.setSliceType(sliceType)
      return null
    }

    case 'setClipPlane': {
      const depthAzimuthElevation = params.depthAzimuthElevation as number[]
      if (!depthAzimuthElevation) throw new Error('Missing required param: depthAzimuthElevation')
      nv.setClipPlane(depthAzimuthElevation)
      return null
    }

    case 'setRenderAzimuthElevation': {
      const azimuth = params.azimuth as number
      const elevation = params.elevation as number
      if (azimuth == null) throw new Error('Missing required param: azimuth')
      if (elevation == null) throw new Error('Missing required param: elevation')
      nv.setRenderAzimuthElevation(azimuth, elevation)
      return null
    }

    case 'setCrosshairWidth': {
      const width = params.width as number
      if (width == null) throw new Error('Missing required param: width')
      nv.setCrosshairWidth(width)
      return null
    }

    case 'loadMesh': {
      // Main process pre-reads the file and sends base64 + name
      const base64 = params.base64 as string
      const name = params.name as string
      if (!base64) throw new Error('Missing file data')
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], name || 'mesh'),
        gl: nv.gl,
        name: name || 'mesh'
      })
      nv.addMesh(mesh)
      nv.drawScene()
      setMeshes([...nv.meshes])
      return { index: nv.meshes.length - 1 }
    }

    case 'removeMesh': {
      const index = params.index as number
      if (index == null) throw new Error('Missing required param: index')
      if (index < 0 || index >= nv.meshes.length) throw new Error(`Mesh index ${index} out of range`)
      const mesh = nv.meshes[index]
      nv.removeMesh(mesh)
      nv.drawScene()
      setMeshes([...nv.meshes])
      return null
    }

    case 'screenshot': {
      const outputPath = params.outputPath as string | undefined
      const canvas = nv.canvas
      if (!canvas) throw new Error('No canvas available')
      nv.drawScene()
      const dataUrl = canvas.toDataURL('image/png')
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
      if (outputPath) {
        // Signal main process to write the file
        return { _writeFile: outputPath, _base64Data: base64Data }
      }
      return { base64: base64Data }
    }

    case 'saveVolume': {
      const volumeIndex = params.volumeIndex as number
      const outputPath = params.outputPath as string
      if (volumeIndex == null) throw new Error('Missing required param: volumeIndex')
      if (!outputPath) throw new Error('Missing required param: outputPath')
      if (volumeIndex < 0 || volumeIndex >= nv.volumes.length) {
        throw new Error(`Volume index ${volumeIndex} out of range`)
      }
      await nv.saveImage({ filename: outputPath, isSaveDrawing: false, volumeByIndex: volumeIndex })
      return null
    }

    case 'getColormaps': {
      return nv.colormaps()
    }

    case 'getScene': {
      const volumes: VolumeInfo[] = nv.volumes.map((vol, i) => ({
        index: i,
        id: vol.id,
        name: vol.name,
        colormap: vol.colormap,
        opacity: vol.opacity,
        dims: vol.dims ? Array.from(vol.dims) : []
      }))
      const scene: SceneInfo = {
        volumes,
        meshCount: nv.meshes.length,
        sliceType: nv.opts.sliceType ?? 0,
        crosshairWidth: nv.opts.crosshairWidth ?? 1
      }
      return scene
    }

    default:
      throw new Error(`Unknown method: ${method}`)
  }
}
