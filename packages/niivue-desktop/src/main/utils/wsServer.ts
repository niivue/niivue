import { WebSocketServer, WebSocket } from 'ws'
import { ipcMain, type BrowserWindow } from 'electron'
import { createServer } from 'net'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import type {
  JsonRpcRequest,
  JsonRpcResponse,
  WsExecuteMessage,
  WsResponseMessage
} from '../../common/wsProtocol.js'

const PORT_FILE_DIR = path.join(os.homedir(), '.niivue')
const PORT_FILE = path.join(PORT_FILE_DIR, 'ws-port')
const DEFAULT_PORT = 15555

interface PendingRequest {
  resolve: (result: unknown) => void
  reject: (error: Error) => void
  ws: WebSocket
  rpcId: string | number
}

let wss: WebSocketServer | null = null
const pendingRequests = new Map<string, PendingRequest>()
let requestCounter = 0

/**
 * Find an available port starting from the given port.
 */
function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve, _reject) => {
    const server = createServer()
    server.unref()
    server.on('error', () => {
      // Port in use, try next
      resolve(findAvailablePort(startPort + 1))
    })
    server.listen(startPort, '127.0.0.1', () => {
      const addr = server.address()
      const port = typeof addr === 'object' && addr ? addr.port : startPort
      server.close(() => resolve(port))
    })
  })
}

/**
 * Write the port number to ~/.niivue/ws-port for client auto-discovery.
 */
function writePortFile(port: number): void {
  if (!fs.existsSync(PORT_FILE_DIR)) {
    fs.mkdirSync(PORT_FILE_DIR, { recursive: true })
  }
  fs.writeFileSync(PORT_FILE, String(port), 'utf-8')
}

/**
 * Remove the port file on shutdown.
 */
function removePortFile(): void {
  try {
    if (fs.existsSync(PORT_FILE)) {
      fs.unlinkSync(PORT_FILE)
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Start the WebSocket server.
 */
export async function startWsServer(
  mainWindow: BrowserWindow,
  preferredPort?: number | null
): Promise<number> {
  const port = preferredPort ?? (await findAvailablePort(DEFAULT_PORT))

  wss = new WebSocketServer({ host: '127.0.0.1', port })

  writePortFile(port)
  console.log(`[WS] Server listening on 127.0.0.1:${port}`)

  // Listen for responses from the renderer
  ipcMain.on('ws:response', (_event, msg: WsResponseMessage) => {
    const pending = pendingRequests.get(msg.requestId)
    if (!pending) return
    pendingRequests.delete(msg.requestId)

    if (msg.error) {
      pending.reject(new Error(msg.error))
    } else {
      // Post-process: handle file writes in main process
      const result = msg.result as Record<string, unknown> | null
      if (result && result._writeFile && result._base64Data) {
        try {
          const outputPath = result._writeFile as string
          const base64Data = result._base64Data as string
          fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'))
          delete result._writeFile
          delete result._base64Data
          pending.resolve(null)
        } catch (err) {
          pending.reject(new Error(`File write error: ${err instanceof Error ? err.message : String(err)}`))
        }
      } else {
        pending.resolve(msg.result)
      }
    }
  })

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected')

    ws.on('message', (data) => {
      let request: JsonRpcRequest
      try {
        request = JSON.parse(data.toString())
      } catch {
        const errorResp: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: 0,
          error: { code: -32700, message: 'Parse error' }
        }
        ws.send(JSON.stringify(errorResp))
        return
      }

      // Validate JSON-RPC structure
      if (!request.jsonrpc || request.jsonrpc !== '2.0' || request.id == null || !request.method) {
        const errorResp: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: request?.id ?? 0,
          error: { code: -32600, message: 'Invalid Request' }
        }
        ws.send(JSON.stringify(errorResp))
        return
      }

      // Pre-process: handle file I/O in main process to keep renderer free of fs/path
      const params = (request.params as Record<string, unknown>) ?? {}
      try {
        if (request.method === 'loadVolume' && params.path) {
          const filePath = params.path as string
          const fileData = fs.readFileSync(filePath)
          params.base64 = fileData.toString('base64')
          params.name = path.basename(filePath)
        } else if (request.method === 'loadMesh' && params.path) {
          const filePath = params.path as string
          const fileData = fs.readFileSync(filePath)
          params.base64 = fileData.toString('base64')
          params.name = path.basename(filePath)
        }
      } catch (err) {
        const errorResp: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: request.id,
          error: { code: -32602, message: `File error: ${err instanceof Error ? err.message : String(err)}` }
        }
        ws.send(JSON.stringify(errorResp))
        return
      }

      // Create a correlation ID and forward to renderer
      const requestId = `ws-${++requestCounter}`
      const executeMsg: WsExecuteMessage = {
        requestId,
        method: request.method,
        params
      }

      const pending: PendingRequest = {
        ws,
        rpcId: request.id,
        resolve: (result) => {
          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: request.id,
            result
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response))
          }
        },
        reject: (error) => {
          const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id: request.id,
            error: { code: -32603, message: error.message }
          }
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(response))
          }
        }
      }

      pendingRequests.set(requestId, pending)

      // Forward to renderer via IPC
      mainWindow.webContents.send('ws:execute', executeMsg)
    })

    ws.on('close', () => {
      console.log('[WS] Client disconnected')
      // Clean up any pending requests for this socket
      for (const [id, pending] of pendingRequests) {
        if (pending.ws === ws) {
          pendingRequests.delete(id)
        }
      }
    })
  })

  return port
}

/**
 * Stop the WebSocket server and clean up.
 */
export function stopWsServer(): void {
  if (wss) {
    wss.close()
    wss = null
  }
  pendingRequests.clear()
  ipcMain.removeAllListeners('ws:response')
  removePortFile()
  console.log('[WS] Server stopped')
}
