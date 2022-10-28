/**
 * Slice Type
 * @enum
 * @readonly
 */
const SLICE_TYPE = Object.freeze({
  AXIAL: 0,
  CORONAL: 1,
  SAGITTAL: 2,
  MULTIPLANAR: 3,
  RENDER: 4,
});

/**
 * @class NVDocument
 * @type NVDocument
 * @constructor
 */
export class NVDocument {
  contructor() {
    this.data.title = "Untitled document";
    this.data.renderAzimuth = 110; //-45;
    this.data.renderElevation = 10; //-165; //15;
    this.data.crosshairPos = [0.5, 0.5, 0.5];
    this.data.clipPlane = [0, 0, 0, 0];
    this.data.sliceType = SLICE_TYPE.AXIAL;
    this.data.imageOptions = [];
    this.data.meshOptions = [];
  }

  get title() {
    return this.data.title;
  }
  /**
   * @param {string} title title of document
   */
  set title(title) {
    this.data.title = title;
  }

  get imageOptions() {
    return this.data.imageOptions;
  }

  get meshOptions() {
    return this.data.meshOptions;
  }

  get renderAzimuth() {
    return this.data.renderAzimuth;
  }

  set renderAzimuth(azimuth) {
    this.data.renderAzimuth = azimuth;
  }

  get renderElevation() {
    return this.data.renderElevation;
  }

  set renderElevation(elevation) {
    this.data.renderElevation = elevation;
  }

  get crosshairPos() {
    return this.data.crosshairPos;
  }

  set crosshairPos(pos) {
    this.data.crosshairPos = pos;
  }

  get clipPlane() {
    return this.data.clipPlane;
  }

  set clipPlane(plane) {
    this.data.clipPlane = plane;
  }

  get sliceType() {
    return this.data.sliceType;
  }

  set sliceType(sliceType) {
    this.data.sliceType = sliceType;
  }

  /**
   * Factory method to return an instance of NVDocument
   * @param {string} url
   * @constructs NVDocument
   */
  static async loadFromUrl(url) {
    let document = new NVDocument();
    let response = await fetch(url);
    document.data = await response.json();
    return document;
  }
}
