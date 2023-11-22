import { SessionBus, SessionUser } from './session-bus'
// Disabled warnings because of issue with JSDoc https://github.com/microsoft/TypeScript/issues/14377
// eslint-disable-next-line no-unused-vars
import { NVImage, NVImageFromUrlOptions } from './nvimage'
// eslint-disable-next-line no-unused-vars
import { NVMesh, NVMeshFromUrlOptions } from './nvmesh'
// eslint-disable-next-line no-unused-vars
import { Niivue } from './niivue'

/**
 * Enum for sync operations
 * @readonly
 * @enum {number}
 */
const NVMESSAGE = Object.freeze({
  ZOOM: 1, // "zoom",
  CLIP_PLANE: 2, // "clipPlane",
  AZIMUTH_ELEVATION: 3, // "ae",
  FRAME_CHANGED: 4, // "frame changed",
  VOLUME_ADDED_FROM_URL: 5, // "volume added from url",
  VOLUME_WITH_URL_REMOVED: 6, // "volume with url removed",
  COLORMAP_CHANGED: 7, // "color map has changed",
  OPACITY_CHANGED: 8, // "opacity has changed",
  MESH_FROM_URL_ADDED: 9, // "mesh added from url",
  MESH_WITH_URL_REMOVED: 10, // "mesh with url removed",
  CUSTOM_SHADER_ADDED: 11, // "custom shader added",
  SHADER_CHANGED: 12, // "mesh shader changed",
  MESH_PROPERTY_CHANGED: 13 // "mesh property changed",
})

/**
 * @class NVController
 * @type NVController
 * @description NVController is for synchronizing both remote and local instances of Niivue
 * @constructor
 * @param {Niivue} niivue  Niivue object to conttrol
 */
export class NVController {
  constructor(niivue) {
    this.niivue = niivue
    this.mediaUrlMap = new Map()
    this.isInSession = false

    // events for external consumers
    this.onFrameChange = () => {}

    // bind all of our events

    // 2D
    this.niivue.onLocationChange = this.onLocationChangeHandler.bind(this)

    // 3D
    this.niivue.onZoom3DChange = this.onZoom3DChangeHandler.bind(this)
    this.niivue.scene.onAzimuthElevationChange = this.onAzimuthElevationChangeHandler.bind(this)
    this.niivue.onClipPlaneChange = this.onClipPlaneChangeHandler.bind(this)

    // volume handlers
    this.niivue.onVolumeAddedFromUrl = this.onVolumeAddedFromUrlHandler.bind(this)
    this.niivue.onVolumeWithUrlRemoved = this.onVolumeWithUrlRemovedHandler.bind(this)

    // mesh handlers
    this.niivue.onMeshAddedFromUrl = this.onMeshAddedFromUrlHandler.bind(this)
    this.niivue.onMeshWithUrlRemoved = this.onMeshWithUrlRemovedHandler.bind(this)
    this.niivue.onCustomMeshShaderAdded = this.onCustomMeshShaderAddedHandler.bind(this)
    this.niivue.onMeshShaderChanged = this.onMeshShaderChanged.bind(this)
    this.niivue.onMeshPropertyChanged = this.onMeshPropertyChanged.bind(this)

    // 4D
    this.niivue.onFrameChange = this.onFrameChangeHandler.bind(this)

    // volume specific handlers
    for (const volume of this.niivue.volumes) {
      volume.onColormapChange = this.onColormapChangeHandler.bind(this)
      volume.onOpacityChange = this.onOpacityChangeHandler.bind(this)
    }
  }

  onLocationChangeHandler(location) {
    console.log(location)
  }

  addVolume(volume, url) {
    this.niivue.volumes.push(volume)
    const idx = this.niivue.volumes.length === 1 ? 0 : this.niivue.volumes.length - 1
    this.niivue.setVolume(volume, idx)
    this.niivue.mediaUrlMap.set(volume, url)
  }

  addMesh(mesh, url) {
    this.niivue.meshes.push(mesh)
    const idx = this.niivue.meshes.length === 1 ? 0 : this.niivue.meshes.length - 1
    this.niivue.setMesh(mesh, idx)
    this.niivue.mediaUrlMap.set(mesh, url)
  }

  onNewMessage(msg) {
    switch (msg.op) {
      case NVMESSAGE.ZOOM:
        this.niivue._volScaleMultiplier = msg.zoom
        break
      case NVMESSAGE.CLIP_PLANE:
        this.niivue.scene.clipPlane = msg.clipPlane
        break
      case NVMESSAGE.AZIMUTH_ELEVATION:
        this.niivue.scene._elevation = msg.elevation
        this.niivue.scene._azimuth = msg.azimuth
        break
      case NVMESSAGE.FRAME_CHANGED:
        {
          const volume = this.niivue.getMediaByUrl(msg.url)
          if (volume) {
            volume.frame4D = msg.index
          }
        }
        break
      case NVMESSAGE.VOLUME_ADDED_FROM_URL:
        if (!this.niivue.getMediaByUrl(msg.imageOptions.url)) {
          NVImage.loadFromUrl(msg.imageOptions).then((volume) => {
            this.addVolume(volume, msg.imageOptions.url)
          })
        }

        break
      case NVMESSAGE.VOLUME_WITH_URL_REMOVED:
        {
          const volume = this.niivue.getMediaByUrl(msg.url)
          if (volume) {
            this.niivue.setVolume(volume, -1)
            this.niivue.mediaUrlMap.delete(volume)
          }
        }
        break
      case NVMESSAGE.COLORMAP_CHANGED:
        {
          const volume = this.niivue.getMediaByUrl(msg.url)
          volume._colormap = msg.colormap
          this.niivue.updateGLVolume()
        }
        break

      case NVMESSAGE.OPACITY_CHANGED:
        {
          const volume = this.niivue.getMediaByUrl(msg.url)
          volume._opacity = msg.opacity
          this.niivue.updateGLVolume()
        }
        break
      case NVMESSAGE.MESH_FROM_URL_ADDED:
        if (!this.niivue.getMediaByUrl(msg.meshOptions.url)) {
          msg.meshOptions.gl = this.niivue.gl
          NVMesh.loadFromUrl(msg.meshOptions).then((mesh) => {
            this.addMesh(mesh, msg.meshOptions.url)
          })
        }
        break
      case NVMESSAGE.MESH_WITH_URL_REMOVED:
        {
          const mesh = this.niivue.getMediaByUrl(msg.url)
          if (mesh) {
            this.niivue.setMesh(mesh, -1)
            this.niivue.mediaUrlMap.delete(mesh)
          }
        }
        break
      case NVMESSAGE.CUSTOM_SHADER_ADDED:
        {
          const shader = this.niivue.createCustomMeshShader(msg.fragmentShaderText, msg.name)
          this.niivue.meshShaders.push(shader)
        }
        break

      case NVMESSAGE.SHADER_CHANGED:
        this.niivue.meshes[msg.meshIndex].meshShaderIndex = msg.shaderIndex
        this.niivue.updateGLVolume()
        break

      case NVMESSAGE.MESH_PROPERTY_CHANGED:
        this.niivue.meshes[msg.meshIndex].setProperty(msg.key, msg.val, this.niivue.gl)
        break
    }
    this.niivue.drawScene()
  }

  /**
   *
   * @param {string} serverBaseUrl
   * @param {string} sessionName
   * @param {string} sessionKey
   * @param {SessionUser} user
   * @description Connects to existing session or creates new session
   */
  connectToSession(sessionName, user = undefined, serverBaseUrl = undefined, sessionKey = undefined) {
    this.user = user || new SessionUser()
    this.sessionBus = new SessionBus(sessionName, this.user, this.onNewMessage.bind(this), serverBaseUrl, sessionKey)
    this.isInSession = true
  }

  /**
   * Zoom level has changed
   * @param {number} zoom
   */
  async onZoom3DChangeHandler(zoom) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.ZOOM,
        zoom
      })
    }
  }

  /**
   * Azimuth and/or elevation has changed
   * @param {number} azimuth
   * @param {number} elevation
   */
  async onAzimuthElevationChangeHandler(azimuth, elevation) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.AZIMUTH_ELEVATION,
        azimuth,
        elevation
      })
    }
  }

  /**
   * Clip plane has changed
   * @param {number[]} clipPlane
   */
  async onClipPlaneChangeHandler(clipPlane) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.CLIP_PLANE,
        clipPlane
      })
    }
  }

  /**
   * Add an image and notify subscribers
   * @param {NVImageFromUrlOptions} imageOptions
   */
  async onVolumeAddedFromUrlHandler(imageOptions, volume) {
    if (this.isInSession) {
      console.log(imageOptions)
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.VOLUME_ADDED_FROM_URL,
        imageOptions
      })
    }
    volume.onColormapChange = this.onColormapChangeHandler.bind(this)
    volume.onOpacityChange = this.onOpacityChangeHandler.bind(this)
  }

  /**
   * A volume has been added
   * @param {NVImage} volume
   */
  async onImageLoadedHandler(volume) {
    volume.onColormapChange = this.onColormapChangeHandler.bind(this)
    volume.onOpacityChange = this.onOpacityChangeHandler.bind(this)
    if (this.isInSession && this.niivue.mediaUrlMap.has(volume)) {
      const url = this.niivue.mediaUrlMap.get(volume)
      this.sessionBus.sendSessionMessage({
        op: 'volume with url added',
        url
      })
    }
  }

  /**
   * Notifies other users that a volume has been removed
   * @param {string} url
   */
  async onVolumeWithUrlRemovedHandler(url) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.VOLUME_WITH_URL_REMOVED,
        url
      })
    }
  }

  /**
   * Notifies that a mesh has been loaded by URL
   * @param {NVMeshFromUrlOptions} meshOptions
   */
  async onMeshAddedFromUrlHandler(meshOptions) {
    console.log('mesh loaded from url')
    console.log(meshOptions)
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.MESH_FROM_URL_ADDED,
        meshOptions
      })
    }
  }

  /**
   * Notifies that a mesh has been added
   * @param {NVMesh} mesh
   */
  async onMeshLoadedHandler(mesh) {
    console.log('mesh has been added')
    console.log(mesh)
  }

  async onMeshWithUrlRemovedHandler(url) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.MESH_WITH_URL_REMOVED,
        url
      })
    }
  }

  /**
   *
   * @param {NVImage} volume volume that has changed color maps
   */
  async onColormapChangeHandler(volume) {
    if (this.isInSession && this.niivue.mediaUrlMap.has(volume)) {
      const url = this.niivue.mediaUrlMap.get(volume)
      const colormap = volume.colormap
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.COLORMAP_CHANGED,
        url,
        colormap
      })
    }
  }

  /**
   * @param {NVImage} volume volume that has changed opacity
   */
  async onOpacityChangeHandler(volume) {
    if (this.isInSession && this.niivue.mediaUrlMap.has(volume)) {
      const url = this.niivue.mediaUrlMap.get(volume)
      const opacity = volume.opacity
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.OPACITY_CHANGED,
        url,
        opacity
      })
    }
  }

  /**
   * Frame for 4D image has changed
   * @param {NVImage} volume
   * @param {number} index
   */
  onFrameChangeHandler(volume, index) {
    console.log('frame has changed to ' + index)
    console.log(volume)
    if (this.niivue.mediaUrlMap.has(volume) && this.isInSession) {
      const url = this.niivue.mediaUrlMap.get(volume)
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.FRAME_CHANGED,
        url,
        index
      })
    }
    this.onFrameChange(volume, index)
  }

  /**
   * Custom mesh shader has been added
   * @param {string} fragmentShaderText shader code to be compiled
   * @param {string} name name of shader, can be used as index
   */
  onCustomMeshShaderAddedHandler(fragmentShaderText, name) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.CUSTOM_SHADER_ADDED,
        fragmentShaderText,
        name
      })
    }
  }

  /**
   * Mesh shader has changed
   * @param {number} meshIndex index of mesh
   * @param {number} shaderIndex index of shader
   */
  onMeshShaderChanged(meshIndex, shaderIndex) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.SHADER_CHANGED,
        meshIndex,
        shaderIndex
      })
    }
  }

  /**
   * Mesh property has been changed
   * @param {number} meshIndex index of mesh
   * @param {any} key property index
   * @param {any} val property value
   */
  onMeshPropertyChanged(meshIndex, key, val) {
    if (this.isInSession) {
      console.log(NVMESSAGE.MESH_PROPERTY_CHANGED)
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.MESH_PROPERTY_CHANGED,
        meshIndex,
        key,
        val
      })
    }
  }
}
