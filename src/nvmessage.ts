import { LoadFromUrlParams } from './nvmesh.js'
import { SessionUser } from './session-bus.js'

/**
 * Enum for sync operations
 */
export enum NVMESSAGE {
  ZOOM = 1, // "zoom",
  CLIP_PLANE = 2, // "clipPlane",
  AZIMUTH_ELEVATION = 3, // "ae",
  FRAME_CHANGED = 4, // "frame changed",
  VOLUME_ADDED_FROM_URL = 5, // "volume added from url",
  VOLUME_WITH_URL_REMOVED = 6, // "volume with url removed",
  COLORMAP_CHANGED = 7, // "color map has changed",
  OPACITY_CHANGED = 8, // "opacity has changed",
  MESH_FROM_URL_ADDED = 9, // "mesh added from url",
  MESH_WITH_URL_REMOVED = 10, // "mesh with url removed",
  CUSTOM_SHADER_ADDED = 11, // "custom shader added",
  SHADER_CHANGED = 12, // "mesh shader changed",
  MESH_PROPERTY_CHANGED = 13, // "mesh property changed",
  USER_JOINED = 'user joined', // TODO this breaks the scheme a bit -- see session-bus::localStorageEventListener
  CREATE = 'create', // TODO same as above
  VOLUME_LOADED_FROM_URL = 'volume with url added' // TODO nvcontroller
}

export type Message = {
  userKey?: string
  from?: string
} & (
  | {
      op: NVMESSAGE.ZOOM
      zoom: number
    }
  | {
      op: NVMESSAGE.CLIP_PLANE
      clipPlane: number[]
    }
  | {
      op: NVMESSAGE.AZIMUTH_ELEVATION
      elevation: number
      azimuth: number
    }
  | {
      op: NVMESSAGE.FRAME_CHANGED
      url: string
      index: number
    }
  | {
      op: NVMESSAGE.VOLUME_ADDED_FROM_URL
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO fix this
      imageOptions: any
    }
  | {
      op: NVMESSAGE.VOLUME_LOADED_FROM_URL
      url: string
    }
  | {
      op: NVMESSAGE.VOLUME_WITH_URL_REMOVED
      url: string
    }
  | {
      op: NVMESSAGE.COLORMAP_CHANGED
      url: string
      colormap: string
    }
  | {
      op: NVMESSAGE.OPACITY_CHANGED
      url: string
      opacity: number
    }
  | {
      op: NVMESSAGE.MESH_FROM_URL_ADDED
      meshOptions: LoadFromUrlParams
    }
  | {
      op: NVMESSAGE.MESH_WITH_URL_REMOVED
      url: string
    }
  | {
      op: NVMESSAGE.CUSTOM_SHADER_ADDED
      fragmentShaderText: string
      name: string
    }
  | {
      op: NVMESSAGE.SHADER_CHANGED
      meshIndex: number
      shaderIndex: number
    }
  | {
      op: NVMESSAGE.MESH_PROPERTY_CHANGED
      meshIndex: number
      key: string
      val: unknown
    }
  | {
      op: NVMESSAGE.USER_JOINED
      user: SessionUser
    }
  | {
      op: NVMESSAGE.CREATE
      key: string
    }
)
