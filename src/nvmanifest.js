import { NVImage, NVImageFromUrlOptions } from "./nvimage.js";
import { NVMesh, NVMeshFromUrlOptions } from "./nvmesh.js";

/**
 * @class NVManifest
 * @type NVManifest
 * @description NVManifest is an object used to describe resources that will be loaded by a Niivue instance
 */
export class NVManifest {
    /** 
     * Creates a new instance of NVManifest
     * @constructor
     */
    constructor() {
        this.meshOptions = [];
        this.imageOptions = [];
        this.images = [];
        this.meshes = [];
        this.elevation = 0;
        this.azimuth = 0;        
    }

    /**
     * 
     * @param {NVImageFromUrlOptions} imageOptions 
     */
    addImageFromUrlOptions(imageOptions) {
        this.imageOptions.push(imageOptions);        
    }

    /**
     * 
     * @param {NVMeshFromUrlOptions} meshOptions 
     */
    addMeshFromUrlOptions(meshOptions) {
        this.meshOptions.push(meshOptions);
    }

    /**
     * Fetches resources specified in image and mesh options
     */
    fetchResources() {
        for(const imageOption of this.imageOptions) {

        }

        for(const meshOption of this.meshOptions) {

        }
    }

    /**
     * Factory method to return an instance of
     * @param {string} url 
     * @constructs NVManifest
     */
    static async loadFromUrl(url) {

       let response = await fetch(url);
       let json = await response.json();
       
       let manifest = new NVManifest();
       for(const imageOption of imageOptions) {
        manifest.addImageFromUrlOptions(imageOption);
       }

       for(const meshOption of meshOptions) {
        manifest.addMeshFromUrlOptions(meshOption);
       }

       

       return manifest;
    }
}