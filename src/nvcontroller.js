import { SessionBus, SessionUser } from "./session-bus";
import { NVImage } from "./nvimage";
import { NVMesh } from "./nvmesh";

/**
 * @typedef {import("./nvimage").NVImageFromUrlOptions} NVImageFromUrlOptions
 */

/**
 * @typedef {import("./nvmesh").NVMeshFromUrlOptions} NVMeshFromUrlOptions
 */

/**
 * @class SessionBus
 * @type SessionBus
 * @description SessionBus is for synchonizing both remote and local instances
 * @constructor
 * @param {import("./niivue").Niivue} niivue  Niivue object to conttrol
 */
export class NVController {
  constructor(niivue) {
    this.niivue = niivue;
    this.mediaUrlMap = new Map();
    this.isInSession = false;

    // events for external consumers
    this.onFrameChange = () => {};

    // bind all of our events

    // 2D
    this.niivue.opts.onLocationChange = this.onLocationChangeHandler.bind(this);

    // 3D
    this.niivue.opts.onZoom3DChange = this.onZoom3DChangeHandler.bind(this);
    this.niivue.scene.onAzimuthElevationChange =
      this.onAzimuthElevationChangeHandler.bind(this);
    this.niivue.opts.onClipPlaneChange =
      this.onClipPlaneChangeHandler.bind(this);

    // volume handlers
    this.niivue.opts.onVolumeAddedFromUrl =
      this.onVolumeAddedFromUrlHandler.bind(this);
    this.niivue.opts.onVolumeWithUrlRemoved =
      this.onVolumeWithUrlRemovedHandler.bind(this);

    // mesh handlers
    this.niivue.opts.onMeshAddedFromUrl =
      this.onMeshAddedFromUrlHandler.bind(this);
    this.niivue.opts.onMeshWithUrlRemoved =
      this.onMeshWithUrlRemovedHandler.bind(this);
    this.niivue.opts.onCustomMeshShaderAdded =
      this.onCustomMeshShaderAddedHandler.bind(this);

    // 4D
    this.niivue.opts.onFrameChange = this.onFrameChangeHandler.bind(this);

    // volume specific handlers
    for (const volume of this.niivue.volumes) {
      volume.onColorMapChange = this.onColorMapChangeHandler.bind(this);
      volume.onOpacityChange = this.onOpacityChangeHandler.bind(this);
    }
  }

  onLocationChangeHandler(location) {
    console.log(location);
  }

  addVolume(volume, url) {
    this.niivue.volumes.push(volume);
    let idx =
      this.niivue.volumes.length === 1 ? 0 : this.niivue.volumes.length - 1;
    this.niivue.setVolume(volume, idx);
    this.niivue.mediaUrlMap.set(volume, url);
  }

  addMesh(mesh, url) {
    this.niivue.meshes.push(mesh);
    let idx =
      this.niivue.meshes.length === 1 ? 0 : this.niivue.meshes.length - 1;
    this.niivue.setMesh(mesh, idx);
    this.niivue.mediaUrlMap.set(mesh, url);
  }

  onNewMessage(msg) {
    // console.log("local mesage received");
    // console.log(msg);
    switch (msg.op) {
      case "zoom":
        this.niivue._volScaleMultiplier = msg.zoom;
        break;
      case "clipPlane":
        this.niivue.scene.clipPlane = msg.clipPlane;
        break;
      case "ae":
        this.niivue.scene._elevation = msg.elevation;
        this.niivue.scene._azimuth = msg.azimuth;
        break;
      case "frame changed":
        {
          let volume = this.niivue.getMediaByUrl(msg.url);
          if (volume) {
            volume.frame4D = msg.index;
          }
        }
        break;
      case "volume added from url":
        {
          if (!this.niivue.getMediaByUrl(msg.imageOptions.url)) {
            console.log("volume added by remote");
            NVImage.loadFromUrl(msg.imageOptions).then((volume) => {
              this.addVolume(volume, msg.imageOptions.url);
            });
          }
        }
        break;
      case "volume with url removed":
        {
          let volume = this.niivue.getMediaByUrl(msg.url);
          if (volume) {
            this.niivue.setVolume(volume, -1);
            this.niivue.mediaUrlMap.delete(volume);
          }
        }
        break;

      case "mesh added from url":
        if (!this.niivue.getMediaByUrl(msg.meshOptions.url)) {
          msg.meshOptions.gl = this.niivue.gl;
          NVMesh.loadFromUrl(msg.meshOptions).then((mesh) => {
            this.addMesh(mesh, msg.meshOptions.url);
          });
        }
        break;
      case "mesh with url removed": {
        let mesh = this.niivue.getMediaByUrl(msg.url);
        if (mesh) {
          this.niivue.setMesh(mesh, -1);
          this.niivue.mediaUrlMap.delete(mesh);
        }
      }
      break;
      case "custom shader added":
        this.niivue.setCustomMeshShader(msg.fragmentShaderText, msg.name);
        break;

      case "":
        break;
    }
    this.niivue.drawScene();
  }

  /**
   *
   * @param {string} serverBaseUrl
   * @param {string} sessionName
   * @param {string} sessionKey
   * @param {SessionUser} user
   * @decription Connects to existing session or creates new session
   */
  connectToSession(
    sessionName,
    user = undefined,
    serverBaseUrl = undefined,
    sessionKey = undefined
  ) {
    this.user = user || new SessionUser();
    console.log("session user");
    console.log(this.user.id);
    this.sessionBus = new SessionBus(
      sessionName,
      this.user,
      this.onNewMessage.bind(this),
      serverBaseUrl,
      sessionKey
    );
    this.isInSession = true;
  }

  /**
   * Zoom level has changed
   * @param {number} zoom
   */
  async onZoom3DChangeHandler(zoom) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: "zoom",
        zoom,
      });
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
        op: "ae",
        azimuth,
        elevation,
      });
    }
  }

  /**
   * Clip plane has changed
   * @param {number[]} clipPlane
   */
  async onClipPlaneChangeHandler(clipPlane) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: "clipPlane",
        clipPlane,
      });
    }
  }

  /**
   * Add an image and notify subscribers
   * @param {NVImageFromUrlOptions} imageOptions
   */
  async onVolumeAddedFromUrlHandler(imageOptions, volume) {
    if (this.isInSession) {
      console.log(imageOptions);
      this.sessionBus.sendSessionMessage({
        op: "volume added from url",
        imageOptions,
      });
    }
    volume.onColorMapChange = this.onColorMapChangeHandler.bind(this);
    volume.onOpacityChange = this.onOpacityChangeHandler.bind(this);
  }

  /**
   * A volume has been added
   * @param {NVImage} volume
   */
  async onImageLoadedHandler(volume) {
    volume.onColorMapChange = this.onColorMapChangeHandler.bind(this);
    volume.onOpacityChange = this.onOpacityChangeHandler.bind(this);
    if (this.isInSession && this.niivue.mediaUrlMap.has(volume)) {
      let url = this.niivue.mediaUrlMap.get(volume);
      this.sessionBus.sendSessionMessage({
        op: "volume with url added",
        url,
      });
    }
  }

  /**
   * Notifies other users that a volume has been removed
   * @param {string} url
   */
  async onVolumeWithUrlRemovedHandler(url) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: "volume with url removed",
        url,
      });
    }
  }

  /**
   * Notifies that a mesh has been loaded by URL
   * @param {NVMeshFromUrlOptions} meshOptions
   */
  async onMeshAddedFromUrlHandler(meshOptions) {
    console.log("mesh loaded from url");
    console.log(meshOptions);
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: "mesh added from url",
        meshOptions,
      });
    }
  }

  /**
   * Notifies that a mesh has been added
   * @param {NVMesh} mesh
   */
  async onMeshLoadedHandler(mesh) {
    console.log("mesh has been added");
    console.log(mesh);
  }

  async onMeshWithUrlRemovedHandler(url) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: "mesh with url removed",
        url,
      });
    }
  }

  /**
   *
   * @param {NVImage} volume volume that has changed color maps
   */
  async onColorMapChangeHandler(volume) {
    console.log("color map has changed");
    console.log(volume);
  }

  /**
   * @param {NVImage} volume volume that has changed opacity
   */
  async onOpacityChangeHandler(volume) {
    console.log("opacity has changed");
    console.log(volume);
  }

  /**
   * @param {NVImage} volume
   * @param {number} index
   */
  onFrameChangeHandler(volume, index) {
    console.log("frame has changed to " + index);
    console.log(volume);
    if (this.niivue.mediaUrlMap.has(volume) && this.isInSession) {
      let url = this.niivue.mediaUrlMap.get(volume);
      this.sessionBus.sendSessionMessage({
        op: "frame changed",
        url,
        index,
      });
    }
    this.onFrameChange(volume, index);
  }

  onCustomMeshShaderAddedHandler(fragmentShaderText, name) {
    if (this.isInSession) {
      this.sessionBus.sendSessionMessage({
        op: "custom shader added",
        fragmentShaderText,
        name,
      });
    }
  }
}
