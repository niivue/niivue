import WebSocket from 'ws'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const PORT_FILE = path.join(os.homedir(), '.niivue', 'ws-port')

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

/**
 * WebSocket test client for E2E tests.
 * Connects to the NiiVue Desktop WebSocket server via the auto-discovery port file,
 * sends JSON-RPC 2.0 requests, and correlates responses by request ID.
 */
export class WsTestClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pending = new Map<
    number,
    { resolve: (resp: JsonRpcResponse) => void; reject: (err: Error) => void }
  >()

  /**
   * Poll for ~/.niivue/ws-port until it appears and contains a valid port number.
   */
  async waitForPortFile(timeoutMs = 15000): Promise<number> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      try {
        if (fs.existsSync(PORT_FILE)) {
          const content = fs.readFileSync(PORT_FILE, 'utf-8').trim()
          const port = parseInt(content, 10)
          if (!isNaN(port) && port > 0) return port
        }
      } catch {
        // Ignore and retry
      }
      await new Promise((r) => setTimeout(r, 500))
    }
    throw new Error(`Port file ${PORT_FILE} not found after ${timeoutMs}ms`)
  }

  /**
   * Read the port file and open a WebSocket connection.
   * Installs a persistent message handler that dispatches responses to pending call() promises.
   */
  async connect(timeoutMs = 10000): Promise<void> {
    const port = await this.waitForPortFile()

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`WebSocket connect timeout after ${timeoutMs}ms`))
      }, timeoutMs)

      this.ws = new WebSocket(`ws://127.0.0.1:${port}`)

      this.ws.on('open', () => {
        clearTimeout(timer)
        resolve()
      })

      this.ws.on('error', (err) => {
        clearTimeout(timer)
        reject(err)
      })

      // Persistent handler: dispatch responses to pending call() promises by ID
      this.ws.on('message', (data) => {
        try {
          const resp = JSON.parse(data.toString()) as JsonRpcResponse
          const id = resp.id as number
          const pending = this.pending.get(id)
          if (pending) {
            this.pending.delete(id)
            pending.resolve(resp)
          }
        } catch {
          // Ignore unparseable messages
        }
      })
    })
  }

  /**
   * Send a JSON-RPC 2.0 request and wait for the correlated response.
   */
  async call(
    method: string,
    params?: Record<string, unknown>,
    timeoutMs = 30000
  ): Promise<JsonRpcResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const id = ++this.requestId
    const request: Record<string, unknown> = { jsonrpc: '2.0', id, method }
    if (params) request.params = params

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`RPC '${method}' timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.pending.set(id, {
        resolve: (resp) => {
          clearTimeout(timer)
          resolve(resp)
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        }
      })

      this.ws!.send(JSON.stringify(request))
    })
  }

  /**
   * Send an arbitrary string and return the first response received.
   * Used for testing protocol-level errors (parse error, invalid request).
   * Uses a one-shot listener that bypasses the normal ID-based correlation.
   */
  async sendRaw(data: string, timeoutMs = 10000): Promise<JsonRpcResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    return new Promise((resolve, reject) => {
      const handler = (msg: Buffer): void => {
        clearTimeout(timer)
        this.ws!.removeListener('message', handler)
        try {
          resolve(JSON.parse(msg.toString()) as JsonRpcResponse)
        } catch {
          reject(new Error(`Failed to parse response: ${msg.toString()}`))
        }
      }

      const timer = setTimeout(() => {
        this.ws!.removeListener('message', handler)
        reject(new Error(`sendRaw timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      this.ws!.on('message', handler)
      this.ws!.send(data)
    })
  }

  /**
   * Close the connection and reject all pending requests.
   */
  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    for (const [, pending] of this.pending) {
      pending.reject(new Error('Client closed'))
    }
    this.pending.clear()
  }
}
