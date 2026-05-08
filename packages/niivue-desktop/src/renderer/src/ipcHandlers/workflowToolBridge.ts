// Renderer-side handler for the workflow tool bridge. Counterpart to
// `src/main/utils/rendererBridge.ts`: receives `renderer-bridge:invoke`
// from main, dispatches to a named handler (e.g. atlas-parcellate),
// and replies on `renderer-bridge:reply`.
//
// The renderer bundle does not externalize `node:fs` / `node:path`, so
// any disk I/O for tools that route through this bridge stays on the
// main side. Renderer handlers receive raw bytes / file paths, run the
// renderer-only part (e.g. brainchop), and return bytes that main then
// writes to disk.

import { Niivue, NVImage } from '@niivue/niivue'
import { brainchopService } from '../services/brainchop/index.js'

const electron = window.electron

export type WorkflowToolHandler = (payload: unknown) => Promise<unknown>

interface BridgeRequest {
  requestId: string
  channel: string
  payload: unknown
}

const handlers = new Map<string, WorkflowToolHandler>()
let initialized = false

export function registerWorkflowTool(name: string, handler: WorkflowToolHandler): void {
  handlers.set(name, handler)
}

function reply(requestId: string, ok: boolean, value?: unknown, error?: string): void {
  electron.ipcRenderer.send('renderer-bridge:reply', { requestId, ok, value, error })
}

function initBridge(): void {
  if (initialized) return
  initialized = true
  electron.ipcRenderer.removeAllListeners('renderer-bridge:invoke')
  electron.ipcRenderer.on(
    'renderer-bridge:invoke',
    async (_event: unknown, msg: BridgeRequest) => {
      const handler = handlers.get(msg.channel)
      if (!handler) {
        reply(msg.requestId, false, undefined, `No renderer handler for tool: ${msg.channel}`)
        return
      }
      try {
        const value = await handler(msg.payload)
        reply(msg.requestId, true, value)
      } catch (err) {
        reply(msg.requestId, false, undefined, err instanceof Error ? err.message : String(err))
      }
    }
  )
}

// ── atlas-parcellate handler ────────────────────────────────────────

interface AtlasParcellatePayload {
  niftiPaths: string[]
  atlas: string
}

interface AtlasParcellateResultEntry {
  inputPath: string
  bytes: Uint8Array
}

interface AtlasParcellateResult {
  results: AtlasParcellateResultEntry[]
  labelJson: string
}

function basename(p: string): string {
  const idx = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return idx >= 0 ? p.slice(idx + 1) : p
}

async function runAtlasParcellate(
  payload: AtlasParcellatePayload,
  nv: Niivue
): Promise<AtlasParcellateResult> {
  if (!brainchopService.isReady()) {
    await brainchopService.initialize()
  }
  const modelInfo = brainchopService.getModelInfo(payload.atlas)
  if (!modelInfo) {
    throw new Error(`atlas-parcellate: unknown model '${payload.atlas}'`)
  }

  const results: AtlasParcellateResultEntry[] = []
  for (const niftiPath of payload.niftiPaths) {
    // Load the NIfTI off disk via the existing IPC path so dev/packaged
    // path resolution stays consistent with other volume loaders.
    const base64 = (await electron.ipcRenderer.invoke('loadFromFile', niftiPath)) as string
    const volume = await NVImage.loadFromBase64({
      base64,
      name: basename(niftiPath)
    })
    // brainchop expects a 256³ @ 1mm Uint8 volume; conform mirrors
    // segmentation.ts / SegmentationPanel behavior.
    const conformed = await nv.conform(volume, false)
    const result = await brainchopService.runSegmentation(conformed, payload.atlas)
    const bytes = await result.volume.saveToUint8Array(`parc.nii.gz`)
    results.push({ inputPath: niftiPath, bytes })
  }

  return {
    results,
    labelJson: modelInfo.labelsPath ?? ''
  }
}

export function registerWorkflowToolBridge(props: { nv: Niivue }): void {
  initBridge()
  registerWorkflowTool('atlas-parcellate', (payload) =>
    runAtlasParcellate(payload as AtlasParcellatePayload, props.nv)
  )
}
