import { SessionBus, SessionUser } from "./session-bus";

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

    // bind all of our events
    this.niivue.opts.onLocationChange = this.onLocationChange.bind(this);
    this.niivue.opts.onVolumeAdded = this.onVolumeAdded.bind(this);
    this.niivue.opts.onVolumeRemoved = this.onVolumeRemoved.bind(this);

    for (const volume of this.niivue.volumes) {
      volume.onColorMapChange = this.onColorMapChange;
    }
  }

  onLocationChange(location) {
    console.log(location);
  }

  onNewMessage(msg) {
    console.log(msg);
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

    this.sessionBus = new SessionBus(
      sessionName,
      this.user,
      this.onNewMessage.bind(this),
      serverBaseUrl,
      sessionKey
    );
  }

  /**
   * Add an image and notify subscribers
   * @param {import("./nvimage").NVImageFromUrlOptions} imageOptions
   */
  onVolumeAdded(imageOptions) {
    console.log("volume added");
    console.log(imageOptions);
  }

  /**
   *
   * @param {*} imageOptions
   */
  onVolumeUpdated(imageOptions) {}

  /**
   * Notifies other users that a volume has been removed
   * @param {*} volume
   */
  onVolumeRemoved(volume) {
    console.log("volume removed");
    if (this.niivue.mediaUrlMap.has(volume)) {
      let url = this.niivue.mediaUrlMap.get(volume);
      console.log("url of volume removed is " + url);
      
    } else {
      console.log("url for volume not found");
    }
  }

  /**
   *
   * @param {import("./nvimage").NVImage} volume volume that has changed color maps
   */
  onColorMapChange(volume) {
    console.log("color map has changed");
    console.log(volume);
  }
}
