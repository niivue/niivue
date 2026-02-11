/**
 * WebSocket protocol types for NiiVue Desktop (JSON-RPC 2.0)
 */

// JSON-RPC 2.0 request/response types
export interface JsonRpcRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, unknown>
}

export interface JsonRpcResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// Standard JSON-RPC error codes
export const RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
} as const

// IPC message types between main and renderer
export interface WsExecuteMessage {
  requestId: string
  method: string
  params: Record<string, unknown>
}

export interface WsResponseMessage {
  requestId: string
  result?: unknown
  error?: string
}

// Response types for WebSocket methods
export interface VolumeInfo {
  index: number
  id: string
  name: string
  colormap: string
  opacity: number
  dims: number[]
}

export interface SceneInfo {
  volumes: VolumeInfo[]
  meshCount: number
  sliceType: number
  crosshairWidth: number
}

// Supported method names
export type WsMethod =
  | 'loadVolume'
  | 'removeVolume'
  | 'getVolumes'
  | 'setColormap'
  | 'setOpacity'
  | 'setSliceType'
  | 'setClipPlane'
  | 'setRenderAzimuthElevation'
  | 'setCrosshairWidth'
  | 'loadMesh'
  | 'removeMesh'
  | 'screenshot'
  | 'saveVolume'
  | 'getColormaps'
  | 'getScene'
