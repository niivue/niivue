// Main↔renderer bridge for tools that have to run in the renderer (brainchop,
// atlas-parcellate) but are reachable from the workflow engine, which lives in
// main. The engine calls a main-side ToolExecutor, the executor sends a
// renderer-bridge:invoke IPC to the renderer with a request id, and the
// renderer replies on renderer-bridge:reply. We avoid `ipcMain.handle` /
// `ipcRenderer.invoke` because that pattern only flows renderer→main.

import { ipcMain } from 'electron'
import { getMainWindow } from './mainWindow.js'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (err: Error) => void
  timeoutHandle: NodeJS.Timeout
}

interface BridgeReply {
  requestId: string
  ok: boolean
  value?: unknown
  error?: string
}

const pending = new Map<string, PendingRequest>()
let initialized = false

function ensureInit(): void {
  if (initialized) return
  initialized = true
  ipcMain.on('renderer-bridge:reply', (_evt, payload: BridgeReply) => {
    const req = pending.get(payload.requestId)
    if (!req) return
    pending.delete(payload.requestId)
    clearTimeout(req.timeoutHandle)
    if (payload.ok) {
      req.resolve(payload.value)
    } else {
      req.reject(new Error(payload.error ?? `Renderer-bridge call failed`))
    }
  })
}

/**
 * Send a request to the renderer over the workflow tool bridge and wait for
 * the matching reply. The renderer must register a handler for `channel`
 * via `registerWorkflowTool(channel, …)` before the workflow runs.
 */
export function invokeRenderer<T = unknown>(
  channel: string,
  payload: unknown,
  timeoutMs = 10 * 60 * 1000
): Promise<T> {
  ensureInit()
  const win = getMainWindow()
  if (!win || win.webContents.isDestroyed()) {
    return Promise.reject(
      new Error(`Renderer bridge: cannot invoke '${channel}' — no live main window`)
    )
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = setTimeout(() => {
      pending.delete(requestId)
      reject(new Error(`Renderer bridge: '${channel}' timed out after ${timeoutMs}ms`))
    }, timeoutMs)
    pending.set(requestId, {
      resolve: resolve as (v: unknown) => void,
      reject,
      timeoutHandle
    })
    win.webContents.send('renderer-bridge:invoke', { requestId, channel, payload })
  })
}
