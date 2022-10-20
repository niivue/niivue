import { SessionBus, SessionUser } from "./session-bus";

/**
 * @typedef {import("./nvimage".NVImage)} NVImage
 */

/**
 * @typedef {import("./nvimage").NVImageFromUrlOptions} NVImageFromUrlOptions
 */

/**
 * @typedef {import("./nvmesh").NVMesh} NVMesh
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
    this.volumesLoadedByUrl = new Map();

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
    this.niivue.opts.onImageLoaded = this.onImageLoadedHandler.bind(this);
    this.niivue.opts.onVolumeLoadedByUrl =
      this.onVolumeLoadedByUrlHandler.bind(this);
    this.niivue.opts.onVolumeRemoved = this.onVolumeRemovedHandler.bind(this);

    // mesh handlers
    this.niivue.opts.onMeshLoadedByUrl =
      this.onMeshLoadedByUrlHandler.bind(this);
    this.niivue.opts.onMeshLoaded = this.onMeshLoadedHandler.bind(this);

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

  onNewMessage(msg) {
    console.log("local mesage received");
    console.log(msg);
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
        let volume = this.niivue.getMediaByUrl(msg.url);
        if (volume) {
          volume.frame4D = msg.index;
        }
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
  onZoom3DChangeHandler(zoom) {
    console.log("zoom has changed");
    console.log(zoom);

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
  onAzimuthElevationChangeHandler(azimuth, elevation) {
    console.log("a or e has changed: " + azimuth + " " + elevation);

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
  onClipPlaneChangeHandler(clipPlane) {
    console.log("clip plane has changed");
    console.log(clipPlane);
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
  onVolumeLoadedByUrlHandler(imageOptions) {
    console.log("volume loaded by url");
    console.log(imageOptions);
  }

  /**
   * A volume has been added
   * @param {NVImage} volume
   */
  onImageLoadedHandler(volume) {
    volume.onColorMapChange = this.onColorMapChangeHandler.bind(this);
    volume.onOpacityChange = this.onOpacityChangeHandler.bind(this);
  }

  /**
   *
   * @param {NVImageFromUrlOptions} imageOptions
   */
  onVolumeUpdated(imageOptions) {
    console.log(imageOptions);
  }

  /**
   * Notifies other users that a volume has been removed
   * @param {NVImage} volume
   */
  onVolumeRemovedHandler(volume) {
    console.log("volume removed");
    if (this.niivue.mediaUrlMap.has(volume)) {
      let url = this.niivue.mediaUrlMap.get(volume);
      console.log("url of volume removed is " + url);
    } else {
      console.log("url for volume not found");
    }
  }

  /**
   * Notifies that a mesh has been loaded by URL
   * @param {NVMeshFromUrlOptions} options
   */
  onMeshLoadedByUrlHandler(options) {
    console.log("mesh loaded by url");
    console.log(options);
  }

  /**
   * Notifies that a mesh has been added
   * @param {NVMesh} mesh
   */
  onMeshLoadedHandler(mesh) {
    console.log("mesh has been added");
    console.log(mesh);
  }
  /**
   *
   * @param {NVImage} volume volume that has changed color maps
   */
  onColorMapChangeHandler(volume) {
    console.log("color map has changed");
    console.log(volume);
  }

  /**
   * @param {NVImage} volume volume that has changed opacity
   */
  onOpacityChangeHandler(volume) {
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
}
