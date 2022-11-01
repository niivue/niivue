import { NVUtilities } from "./nvutilities";

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
  constructor() {
    this.data = {};
    this.data.title = "Untitled document";
    this.data.renderAzimuth = 110; //-45;
    this.data.renderElevation = 10; //-165; //15;
    this.data.crosshairPos = [0.5, 0.5, 0.5];
    this.data.clipPlane = [0, 0, 0, 0];
    this.data.sliceType = SLICE_TYPE.AXIAL;
    this.data.imageOptionsArray = [];
    this.data.meshOptionsArray = [];

    this.volumes = [];
    this.meshes = [];
    this.drawing = null;
    this.imageOptionsMap = new Map();
    this.meshOptionsMap = new Map();
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

  get imageOptionsArray() {
    return this.data.imageOptionsArray;
  }

  get meshOptionsArray() {
    return this.data.meshOptionsArray;
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

  get encodedImageBlobs() {
    return this.data.encodedImageBlobs;
  }

  hasImage(image) {
    return this.volumes.find((i) => i.id === image.id);
  }

  hasImageFromUrl(url) {
    return this.data.imageOptionsArray.find((i) => i.url === url);
  }

  addImage(image, imageOptions) {
    if (!this.hasImage(image)) {
      if (!imageOptions.name) {
        if(imageOptions.url) {
            // TODO(cdrake): add file type
            let absoluteUrlRE = new RegExp("^(?:[a-z+]+:)?//", "i");
            let url = absoluteUrlRE.test(imageOptions.url)
            ? new URL(imageOptions.url)
            : new URL(imageOptions.url, window.location.href);

            imageOptions.name = url.pathname.split("/").pop();
            if (imageOptions.name.toLowerCase().endsWith(".gz")) {
            imageOptions.name = imageOptions.name.slice(0, -3);
            }

            if (!imageOptions.name.toLowerCase().endsWith(".nii")) {
            imageOptions.name += ".nii";
            }
        }
        else {
            throw new Error('no name and no url');
        }
      }

      this.volumes.push(image);
      this.data.imageOptionsArray.push(imageOptions);
      this.imageOptionsMap.set(
        image.id,
        this.data.imageOptionsArray.length - 1
      );
    } else {
      // update the id of existing image
      let options = this.data.imageOptionsArray.find(
        (i) => i.url === imageOptions.url
      );
      console.log("options");
      console.log(options);
      let index = this.data.imageOptionsArray.indexOf(options);
      if (index >= 0) {
        if (index < this.volumes.length) {
          this.volumes[index] = image;
        } else {
          this.volumes.splice(index, 0, image);
        }
      }
    }
  }

  removeImage(image) {
    if (this.imageOptionsMap.has(image.id)) {
      let index = this.imageOptionsMap.get(image.id);
      if (this.data.imageOptionsArray.length > index) {
        this.data.imageOptionsArray.splice(index, 1);
      }
      this.imageOptionsMap.delete(image.id);
    }
    this.volumes = this.volumes.filter((i) => i.id != image.id);
  }

  getImageOptions(image) {
    return this.imageOptionsMap.has(image.id)
      ? this.data.imageOptionsArray[this.imageOptionsMap.get(image.id)]
      : null;
  }

  async save(fileName) {
    let imageOptionsArray = [];
    this.data.encodedImageBlobs = [];
    this.data.encodedDrawingBlob = null;
    this.data.imageOptionsMap = [];

    // check for our base layer
    if (this.volumes.length == 0) {
      throw new Error("nothing to save");
    }

    let imageOptions = this.imageOptionsArray[0];
    if (imageOptions) {
      imageOptionsArray.push(imageOptions);
      let encodedImageBlob = NVUtilities.uint8tob64(
        this.volumes[0].toUint8Array()
      );
      this.data.encodedImageBlobs.push(encodedImageBlob);
      if (this.drawing) {
        this.data.encodedDrawingBlob = NVUtilities.uint8tob64(
          this.volumes[0].toUint8Array(this.drawing)
        );
      }

      this.data.imageOptionsMap.push([this.volumes[0].id, 0]);
    } else {
      throw new Error("image options for base layer not found");
    }

    for (let i = 1; i < this.volumes.length; i++) {
      let imageOptions = this.imageOptionsArray[i];
      if (imageOptions) {
        imageOptionsArray.push(imageOptions);
        const volume = this.volumes[i];
        let encodedImageBlob = NVUtilities.uint8tob64(
          await volume.toUint8Array()
        );
        this.data.encodedImageBlobs.push(encodedImageBlob);
        this.data.imageOptionsMap.push([volume.id, i]);
      }
    }

    this.data.imageOptionsArray = imageOptionsArray;
    NVUtilities.download(
      JSON.stringify(this.data),
      fileName,
      "application/json"
    );
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
    document.imageOptionsMap = new Map(document.data.imageOptionsMap);
    return document;
  }
}
