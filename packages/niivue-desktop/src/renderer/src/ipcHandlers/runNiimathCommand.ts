// src/renderer/src/ipcHandlers/runNiimathCommand.ts
import { Niivue, NVImage } from '@niivue/niivue'

/**
 * Register handlers for Niimath completion and errors, decoding
 * the compressed output using NVImage.new.
 *
 * @param setVolumes - React setter for the array of NVImage volumes.
 * @param modeMap    - Map<requestId, 'replace'|'overlay'> for volume insertion.
 * @param indexMap   - Map<requestId, number> mapping which index to replace.
 */
export function registerRunNiimathHandler(
  nv: Niivue,
  setVolumes: React.Dispatch<React.SetStateAction<NVImage[]>>,
  modeMap: Map<string, 'replace' | 'overlay'>,
  indexMap: Map<string, number>
): void {
  window.electron.ipcRenderer.removeAllListeners('niimath:complete')
  window.electron.ipcRenderer.removeAllListeners('niimath:error')

  // Handle successful completion
  window.electron.ipcRenderer.on(
    'niimath:complete',
    async (_evt, requestId: string, resultB64: string) => {
      try {
        // Decode Base64 to ArrayBuffer
        const buf = Buffer.from(resultB64, 'base64')
        const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
        const mode = modeMap.get(requestId) ?? 'replace'
        const idx = indexMap.get(requestId) ?? 0
        modeMap.delete(requestId)
        indexMap.delete(requestId)

         // Determine base name from original volume
        const original = nv.volumes[idx]
        const baseName = original?.name || requestId
        const uniqueName = `${baseName}-${requestId}`
        // Create NVImage (handles .nii and .nii.gz)
        const img = await NVImage.new(
          arrayBuffer,
          uniqueName,
          '',
          1.0,
          null,
          NaN,
          NaN,
          true,
          0.02,
          false,
          false,
          '',
          0,
          1,
          NaN,
          NaN,
          true,
          null,
          0,
          null
        )

        // Determine insertion
        indexMap.delete(requestId)
        if (mode === 'overlay') {
          console.log('overlaying image')
          nv.addVolume(img)
        } else {
          nv.setVolume(img, idx)
        }

        // Re-render the scene
        nv.drawScene()

        // Sync React state from nv.volumes
        setVolumes([...nv.volumes])
      } catch (err) {
        console.error('Failed to decode Niimath output:', err)
      }
    }
  )

  // Handle errors
  window.electron.ipcRenderer.on('niimath:error', (_evt, requestId: string, message: string) => {
    console.error(`Niimath job ${requestId} error:`, message)
    // TODO: propagate error to UI
  })
}
