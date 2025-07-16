// src/utils/niimathHelpers.ts
import { Niivue, NVImage } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'

/**
 * Run a Niimath command on a specific NVImage.
 * Uses NVImage.toUint8Array() to get NIfTI bytes without triggering a download.
 *
 * @param nv         Your Niivue instance
 * @param niimath    Your Niimath instance (already .init()-ed)
 * @param cmdString  CLI-style string: e.g. "-uthr 180" or "-mesh -i m -b"
 * @param inputVol   The NVImage you want to process
 * @param options    asOverlay: keep original & add result on top
 */
export async function applyNiimathCommand(
  nv: Niivue,
  niimath: Niimath,
  cmdString: string,
  inputVol: NVImage,
  { asOverlay = false }: { asOverlay?: boolean } = {}
): Promise<void> {
  // 1) get NIfTI bytes directly from NVImage
  const niiArray: Uint8Array = inputVol.toUint8Array()
  const fileName = `${inputVol.name || 'image'}.nii`
  const inputFile = new File([niiArray], fileName)
  let proc = niimath.image(inputFile)

  // 2) tokenize & configure chainable options
  const tokens = cmdString.trim().split(/\s+/)
  let i = 0
  let wantsMesh = false

  while (i < tokens.length) {
    const tok = tokens[i++]
    if (tok === '-mesh') {
      wantsMesh = true
      const meshOpts: Record<string, string|number> = {}
      while (i < tokens.length && tokens[i].startsWith('-')) {
        const flag = tokens[i++].slice(1)
        meshOpts[flag] = ['b','l','o','v'].includes(flag)
          ? 1
          : (isNaN(Number(tokens[i])) ? tokens[i++] : Number(tokens[i++]))
      }
      proc = proc.mesh(meshOpts)
    } else if (tok.startsWith('-')) {
      const method = tok.slice(1)
      const args: (string|number)[] = []
      while (i < tokens.length && !tokens[i].startsWith('-')) {
        const v = tokens[i++]
        args.push(isNaN(Number(v)) ? v : Number(v))
      }
      if (typeof (proc as any)[method] === 'function') {
        // @ts-ignore
        proc = (proc as any)[method](...args)
      } else {
        console.warn(`Niimath has no method "${method}"`)
      }
    } else {
      console.warn(`Unexpected token "${tok}"`)
    }
  }

  // 3) run & capture errors (including worker errors)
  const outName = wantsMesh ? 'output.mz3' : 'output.nii'
  let outBlob: Blob
  // listen for uncaught errors from the WebAssembly worker
  const workerErrors: string[] = []
  const handler = (ev: ErrorEvent) => {
    ev.preventDefault()
    const info = ev.error?.message ?? ev.message
    workerErrors.push(info)
  }
  window.addEventListener('error', handler)
  try {
    outBlob = await proc.run(outName)
    // if a worker error occurred, throw it here
    if (workerErrors.length) {
      throw new Error(`Niimath worker error: ${workerErrors[0]}`)
    }
  } catch (err: any) {
    console.error('applyNiimathCommand error:', err)
    throw err
  } finally {
    window.removeEventListener('error', handler)
  }

  // 4) read blob to ArrayBuffer
  let outBuf: ArrayBuffer
  try {
    outBuf = await outBlob.arrayBuffer()
  } catch (err: any) {
    console.error('Error reading blob:', err)
    throw new Error(`Failed to read Niimath output: ${err.message || err}`)
  }

  // 5) import into Niivue
  if (!asOverlay) {
    nv.removeVolume(inputVol)
  }
  await nv.loadFromArrayBuffer(outBuf, outName)
  if (asOverlay && !wantsMesh) {
    const idx = nv.volumes.length - 1
    const vol = nv.volumes[idx]
    nv.setOpacity(idx, 0.5)
    nv.setColormap(vol.id, 'hot')
  }
  nv.drawScene()
}
