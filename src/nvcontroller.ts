import { SessionBus, SessionUser } from './session-bus.js'
import { ImageFromUrlOptions, NVImage } from './nvimage/index.js'
import { LoadFromUrlParams, NVMesh } from './nvmesh.js'
import { Niivue } from './niivue/index.js'
import { Message, NVMESSAGE } from './nvmessage.js'
import { log } from './logger.js'

/**
 * NVController is for synchronizing both remote and local instances of Niivue
 * @ignore
 */
export class NVController {
  niivue: Niivue
  mediaUrlMap: Map<string, unknown>
  isInSession = false
  user?: SessionUser
  sessionBus?: SessionBus

  // events for external consumers
  onFrameChange = (_volume: NVImage, _index: number): void => {}

  /**
   * @param niivue - niivue object to control
   */
  constructor(niivue: Niivue) {
    this.niivue = niivue
    this.mediaUrlMap = new Map()

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

  // TODO location type
  onLocationChangeHandler(location: unknown): void {
    log.debug(location)
  }

  addVolume(volume: NVImage, url: string): void {
    this.niivue.volumes.push(volume)
    const idx = this.niivue.volumes.length === 1 ? 0 : this.niivue.volumes.length - 1
    this.niivue.setVolume(volume, idx)
    this.niivue.mediaUrlMap.set(volume, url)
  }

  addMesh(mesh: NVMesh, url: string): void {
    this.niivue.meshes.push(mesh)
    const idx = this.niivue.meshes.length === 1 ? 0 : this.niivue.meshes.length - 1
    this.niivue.setMesh(mesh, idx)
    this.niivue.mediaUrlMap.set(mesh, url)
  }

  onNewMessage(msg: Message): void {
    switch (msg.op) {
      case NVMESSAGE.ZOOM:
        // TODO was _volScaleMultiplier, doesn't exist.
        this.niivue.volScaleMultiplier = msg.zoom
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
          const volume = this.niivue.getMediaByUrl(msg.url) as NVImage
          if (volume) {
            volume.frame4D = msg.index
          }
        }
        break
      case NVMESSAGE.VOLUME_ADDED_FROM_URL:
        if (!this.niivue.getMediaByUrl(msg.imageOptions.url)) {
          NVImage.loadFromUrl(msg.imageOptions)
            .then((volume) => {
              if (volume) {
                this.addVolume(volume, msg.imageOptions.url)
              }
            })
            .catch((e) => {
              if (e) {
                throw e
              }
            })
        }

        break
      case NVMESSAGE.VOLUME_WITH_URL_REMOVED:
        {
          const volume = this.niivue.getMediaByUrl(msg.url)
          if (volume) {
            this.niivue.setVolume(volume as NVImage, -1)
            this.niivue.mediaUrlMap.delete(volume)
          }
        }
        break
      case NVMESSAGE.COLORMAP_CHANGED:
        {
          const volume = this.niivue.getMediaByUrl(msg.url) as NVImage
          volume._colormap = msg.colormap
          this.niivue.updateGLVolume()
        }
        break

      case NVMESSAGE.OPACITY_CHANGED:
        {
          const volume = this.niivue.getMediaByUrl(msg.url) as NVImage
          volume._opacity = msg.opacity
          this.niivue.updateGLVolume()
        }
        break
      case NVMESSAGE.MESH_FROM_URL_ADDED:
        if (!this.niivue.getMediaByUrl(msg.meshOptions.url)) {
          msg.meshOptions.gl = this.niivue.gl!
          NVMesh.loadFromUrl(msg.meshOptions)
            .then((mesh) => {
              this.addMesh(mesh, msg.meshOptions.url)
            })
            .catch((e) => {
              if (e) {
                throw e
              }
            })
        }
        break
      case NVMESSAGE.MESH_WITH_URL_REMOVED:
        {
          const mesh = this.niivue.getMediaByUrl(msg.url)
          if (mesh) {
            this.niivue.setMesh(mesh as NVMesh, -1)
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
        this.niivue.meshes[msg.meshIndex].setProperty(msg.key as keyof NVMesh, msg.val, this.niivue.gl!)
        break
    }
    this.niivue.drawScene()
  }

  /**
   * Connects to existing session or creates new session
   */
  connectToSession(sessionName: string, user?: SessionUser, serverBaseUrl?: string, sessionKey?: string): void {
    this.user = user || new SessionUser()
    this.sessionBus = new SessionBus(sessionName, this.user, this.onNewMessage.bind(this), serverBaseUrl, sessionKey)
    this.isInSession = true
  }

  /**
   * Zoom level has changed
   */
  onZoom3DChangeHandler(zoom: number): void {
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.ZOOM,
        zoom
      })
    }
  }

  /**
   * Azimuth and/or elevation has changed
   */
  onAzimuthElevationChangeHandler(azimuth: number, elevation: number): void {
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.AZIMUTH_ELEVATION,
        azimuth,
        elevation
      })
    }
  }

  /**
   * Clip plane has changed
   */
  onClipPlaneChangeHandler(clipPlane: number[]): void {
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.CLIP_PLANE,
        clipPlane
      })
    }
  }

  /**
   * Add an image and notify subscribers
   */
  onVolumeAddedFromUrlHandler(imageOptions: ImageFromUrlOptions, volume: NVImage): void {
    if (this.isInSession && this.sessionBus) {
      log.debug(imageOptions)
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
   */
  onImageLoadedHandler(volume: NVImage): void {
    volume.onColormapChange = this.onColormapChangeHandler.bind(this)
    volume.onOpacityChange = this.onOpacityChangeHandler.bind(this)
    if (this.isInSession && this.sessionBus && this.niivue.mediaUrlMap.has(volume)) {
      const url = this.niivue.mediaUrlMap.get(volume)
      this.sessionBus.sendSessionMessage({
        // TODO this was "volume with url added", but there is VOLUME_ADDED_FROM_URL -- not sure if that is meant?
        // That would break the switch statement above
        op: NVMESSAGE.VOLUME_LOADED_FROM_URL,
        url: url!
      })
    }
  }

  /**
   * Notifies other users that a volume has been removed
   */
  onVolumeWithUrlRemovedHandler(url: string): void {
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.VOLUME_WITH_URL_REMOVED,
        url
      })
    }
  }

  /**
   * Notifies that a mesh has been loaded by URL
   */
  onMeshAddedFromUrlHandler(meshOptions: LoadFromUrlParams): void {
    log.debug('mesh loaded from url')
    log.debug(meshOptions)
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.MESH_FROM_URL_ADDED,
        meshOptions
      })
    }
  }

  /**
   * Notifies that a mesh has been added
   */
  onMeshLoadedHandler(mesh: NVMesh): void {
    log.debug('mesh has been added')
    log.debug(mesh)
  }

  onMeshWithUrlRemovedHandler(url: string): void {
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.MESH_WITH_URL_REMOVED,
        url
      })
    }
  }

  /**
   *
   * @param volume - volume that has changed color maps
   */
  onColormapChangeHandler(volume: NVImage): void {
    if (this.isInSession && this.sessionBus && this.niivue.mediaUrlMap.has(volume)) {
      const url = this.niivue.mediaUrlMap.get(volume)
      const colormap = volume.colormap
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.COLORMAP_CHANGED,
        url: url!,
        colormap
      })
    }
  }

  /**
   * @param volume - volume that has changed opacity
   */
  onOpacityChangeHandler(volume: NVImage): void {
    if (this.isInSession && this.sessionBus && this.niivue.mediaUrlMap.has(volume)) {
      const url = this.niivue.mediaUrlMap.get(volume)
      const opacity = volume.opacity
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.OPACITY_CHANGED,
        url: url!,
        opacity
      })
    }
  }

  /**
   * Frame for 4D image has changed
   */
  onFrameChangeHandler(volume: NVImage, index: number): void {
    log.debug('frame has changed to ' + index)
    log.debug(volume)
    if (this.niivue.mediaUrlMap.has(volume) && this.isInSession && this.sessionBus) {
      const url = this.niivue.mediaUrlMap.get(volume)
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.FRAME_CHANGED,
        url: url!,
        index
      })
    }
    this.onFrameChange(volume, index)
  }

  /**
   * Custom mesh shader has been added
   * @param fragmentShaderText - shader code to be compiled
   * @param name - name of shader, can be used as index
   */
  onCustomMeshShaderAddedHandler(fragmentShaderText: string, name: string): void {
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.CUSTOM_SHADER_ADDED,
        fragmentShaderText,
        name
      })
    }
  }

  /**
   * Mesh shader has changed
   * @param meshIndex - index of mesh
   * @param shaderIndex - index of shader
   */
  onMeshShaderChanged(meshIndex: number, shaderIndex: number): void {
    if (this.isInSession && this.sessionBus) {
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.SHADER_CHANGED,
        meshIndex,
        shaderIndex
      })
    }
  }

  /**
   * Mesh property has been changed
   * @param meshIndex - index of mesh
   * @param key - property index
   * @param val - property value
   */
  onMeshPropertyChanged(meshIndex: number, key: string, val: unknown): void {
    if (this.isInSession && this.sessionBus) {
      log.debug(NVMESSAGE.MESH_PROPERTY_CHANGED)
      this.sessionBus.sendSessionMessage({
        op: NVMESSAGE.MESH_PROPERTY_CHANGED,
        meshIndex,
        key,
        val
      })
    }
  }
}
