import { mat4, vec3, vec4, vec2 } from 'gl-matrix';
import { NIFTI1, NIFTI2, NIFTIEXTENSION } from 'nifti-reader-js';

type ColorMap = {
    R: number[];
    G: number[];
    B: number[];
    A: number[];
    I: number[];
    min?: number;
    max?: number;
    labels?: string[];
};
type LUT = {
    lut: Uint8ClampedArray;
    min?: number;
    max?: number;
    labels?: string[];
};
declare class ColorTables {
    gamma: number;
    version: number;
    cluts: Record<string, ColorMap>;
    /**
     * Sets cluts to alphabetically sorted cmaps
     */
    constructor();
    addColormap(key: string, cmap: ColorMap): void;
    colormaps(): Array<keyof typeof this.cluts>;
    colorMaps(): Array<keyof typeof this.cluts>;
    colormapFromKey(name: string): ColorMap;
    colormap(key?: string, isInvert?: boolean): Uint8ClampedArray;
    makeLabelLut(cm: ColorMap, alphaFill?: number): LUT;
    makeLabelLutFromUrl(name: string): Promise<LUT>;
    makeDrawLut(name: string | ColorMap): LUT;
    makeLut(Rsi: number[], Gsi: number[], Bsi: number[], Asi: number[], Isi: number[], isInvert: boolean): Uint8ClampedArray;
}
declare const cmapper: ColorTables;

declare class Shader {
    program: WebGLProgram;
    uniforms: Record<string, WebGLUniformLocation | null>;
    isMatcap?: boolean;
    constructor(gl: WebGL2RenderingContext, vertexSrc: string, fragmentSrc: string);
    use(gl: WebGL2RenderingContext): void;
}

type Geometry = {
    vertexBuffer: WebGLBuffer;
    indexBuffer: WebGLBuffer;
    indexCount: number;
    vao: WebGLVertexArrayObject | null;
};
/**
 * Represents a 3D object rendered with WebGL, including geometry, transformations, and rendering state.
 * Used internally by Niivue for rendering meshes and crosshairs.
 */
declare class NiivueObject3D {
    static BLEND: number;
    static CULL_FACE: number;
    static CULL_FRONT: number;
    static CULL_BACK: number;
    static ENABLE_DEPTH_TEST: number;
    sphereIdx: number[];
    sphereVtx: number[];
    renderShaders: number[];
    isVisible: boolean;
    isPickable: boolean;
    vertexBuffer: WebGLVertexArrayObject;
    indexCount: number;
    indexBuffer: WebGLVertexArrayObject | null;
    vao: WebGLVertexArrayObject | null;
    mode: number;
    glFlags: number;
    id: number;
    colorId: [number, number, number, number];
    modelMatrix: mat4;
    scale: number[];
    position: number[];
    rotation: number[];
    rotationRadians: number;
    extentsMin: number[];
    extentsMax: number[];
    furthestVertexFromOrigin?: number;
    originNegate?: vec3;
    fieldOfViewDeObliqueMM?: vec3;
    mm?: vec4;
    constructor(id: number, vertexBuffer: WebGLBuffer, mode: number, indexCount: number, indexBuffer?: WebGLVertexArrayObject | null, vao?: WebGLVertexArrayObject | null);
    static generateCrosshairs: (gl: WebGL2RenderingContext, id: number, xyzMM: vec4, xyzMin: vec3, xyzMax: vec3, radius: number, sides?: number, gap?: number) => NiivueObject3D;
    static generateCrosshairsGeometry: (gl: WebGL2RenderingContext, xyzMM: vec4, xyzMin: vec3, xyzMax: vec3, radius: number, sides?: number, gap?: number) => Geometry;
    static getFirstPerpVector: (v1: vec3) => vec3;
    static subdivide: (verts: number[], faces: number[]) => void;
    static weldVertices: (verts: number[], faces: number[]) => number[];
    static makeSphere: (vertices: number[], indices: number[], radius: number, origin?: vec3 | vec4) => void;
    static makeCylinder: (vertices: number[], indices: number[], start: vec3, dest: vec3, radius: number, sides?: number, endcaps?: boolean) => void;
    static makeColoredCylinder: (vertices: number[], indices: number[], colors: number[], start: vec3, dest: vec3, radius: number, rgba255?: number[], sides?: number, endcaps?: boolean) => void;
    static makeColoredSphere: (vertices: number[], indices: number[], colors: number[], radius: number, origin?: vec3 | vec4, rgba255?: number[]) => void;
}

declare enum LabelTextAlignment {
    LEFT = "left",
    RIGHT = "right",
    CENTER = "center"
}
declare enum LabelLineTerminator {
    NONE = "none",
    CIRCLE = "circle",
    RING = "ring"
}
declare enum LabelAnchorPoint {
    NONE = 0,
    TOPLEFT = 9,
    TOPCENTER = 10,
    TOPRIGHT = 12,
    MIDDLELEFT = 17,
    MIDDLECENTER = 18,
    MIDDLERIGHT = 20,
    BOTTOMLEFT = 33,
    BOTTOMCENTER = 34,
    BOTTOMRIGHT = 36
}
/**
 * Class representing label style.
 * @ignore
 */
declare class NVLabel3DStyle {
    textColor: number[];
    textScale: number;
    textAlignment?: LabelTextAlignment;
    lineWidth: number;
    lineColor: number[];
    lineTerminator: LabelLineTerminator;
    bulletScale?: number;
    bulletColor?: number[];
    backgroundColor?: number[];
    /**
     * @param textColor - Color of text
     * @param textScale - Text Size (0.0..1.0)
     * @param lineWidth - Line width
     * @param lineColor - Line color
     * @param bulletScale - Bullet size respective of text
     * @param bulletColor - Bullet color
     * @param backgroundColor - Background color of label
     */
    constructor(textColor?: number[], textScale?: number, textAlignment?: LabelTextAlignment, lineWidth?: number, lineColor?: number[], lineTerminator?: LabelLineTerminator, bulletScale?: number, bulletColor?: number[], backgroundColor?: number[]);
}
/**
 * Label class
 * @ignore
 */
declare class NVLabel3D {
    text: string;
    style: NVLabel3DStyle;
    points?: number[] | number[][];
    anchor: LabelAnchorPoint;
    onClick?: (label: NVLabel3D, e?: MouseEvent) => void;
    /**
     * @param text - The text of the label
     * @param style - The style of the label
     * @param points - An array of points label for label lines
     */
    constructor(text: string, style: NVLabel3DStyle, points?: number[] | number[][], anchor?: LabelAnchorPoint, onClick?: (label: NVLabel3D, e?: MouseEvent) => void);
}

/**
 * Enum for NIfTI datatype codes
 *   // https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h
 */
declare enum NiiDataType {
    DT_NONE = 0,
    DT_BINARY = 1,
    DT_UINT8 = 2,
    DT_INT16 = 4,
    DT_INT32 = 8,
    DT_FLOAT32 = 16,
    DT_COMPLEX64 = 32,
    DT_FLOAT64 = 64,
    DT_RGB24 = 128,
    DT_INT8 = 256,
    DT_UINT16 = 512,
    DT_UINT32 = 768,
    DT_INT64 = 1024,
    DT_UINT64 = 1280,
    DT_FLOAT128 = 1536,
    DT_COMPLEX128 = 1792,
    DT_COMPLEX256 = 2048,
    DT_RGBA32 = 2304
}
/**
 * Enum for supported image types (e.g. NII, NRRD, DICOM)
 */
declare enum ImageType {
    UNKNOWN = 0,
    NII = 1,
    DCM = 2,
    DCM_MANIFEST = 3,
    MIH = 4,
    MIF = 5,
    NHDR = 6,
    NRRD = 7,
    MHD = 8,
    MHA = 9,
    MGH = 10,
    MGZ = 11,
    V = 12,
    V16 = 13,
    VMR = 14,
    HEAD = 15,
    DCM_FOLDER = 16,
    SRC = 17,
    FIB = 18,
    BMP = 19,
    ZARR = 20,
    NPY = 21,
    NPZ = 22
}
type ImageFromUrlOptions = {
    url: string;
    urlImageData?: string;
    headers?: Record<string, string>;
    name?: string;
    colorMap?: string;
    colormap?: string;
    opacity?: number;
    cal_min?: number;
    cal_max?: number;
    trustCalMinMax?: boolean;
    percentileFrac?: number;
    useQFormNotSForm?: boolean;
    alphaThreshold?: boolean;
    colormapNegative?: string;
    colorMapNegative?: string;
    cal_minNeg?: number;
    cal_maxNeg?: number;
    colorbarVisible?: boolean;
    ignoreZeroVoxels?: boolean;
    imageType?: ImageType;
    frame4D?: number;
    colormapLabel?: LUT | null;
    pairedImgData?: null;
    limitFrames4D?: number;
    isManifest?: boolean;
    urlImgData?: string;
    buffer?: ArrayBuffer;
};
type ImageFromFileOptions = {
    file: File | File[];
    name?: string;
    colormap?: string;
    opacity?: number;
    urlImgData?: File | null | FileSystemEntry;
    cal_min?: number;
    cal_max?: number;
    trustCalMinMax?: boolean;
    percentileFrac?: number;
    ignoreZeroVoxels?: boolean;
    useQFormNotSForm?: boolean;
    colormapNegative?: string;
    imageType?: ImageType;
    frame4D?: number;
    limitFrames4D?: number;
};
type ImageFromBase64 = {
    base64: string;
    name?: string;
    colormap?: string;
    opacity?: number;
    cal_min?: number;
    cal_max?: number;
    trustCalMinMax?: boolean;
    percentileFrac?: number;
    ignoreZeroVoxels?: boolean;
    useQFormNotSForm?: boolean;
    colormapNegative?: string;
    frame4D?: number;
    imageType?: ImageType;
    cal_minNeg?: number;
    cal_maxNeg?: number;
    colorbarVisible?: boolean;
    colormapLabel?: LUT | null;
};
type ImageMetadata = {
    id: string;
    datatypeCode: number;
    nx: number;
    ny: number;
    nz: number;
    nt: number;
    dx: number;
    dy: number;
    dz: number;
    dt: number;
    bpv: number;
};
declare const NVImageFromUrlOptions: (url: string, urlImageData?: string, name?: string, colormap?: string, opacity?: number, cal_min?: number, cal_max?: number, trustCalMinMax?: boolean, percentileFrac?: number, ignoreZeroVoxels?: boolean, useQFormNotSForm?: boolean, colormapNegative?: string, frame4D?: number, imageType?: ImageType, cal_minNeg?: number, cal_maxNeg?: number, colorbarVisible?: boolean, alphaThreshold?: boolean, colormapLabel?: any) => ImageFromUrlOptions;

type TypedVoxelArray = Float32Array | Uint8Array | Int16Array | Float64Array | Uint16Array;
/**
 * a NVImage encapsulates some image data and provides methods to query and operate on images
 */
declare class NVImage {
    name: string;
    id: string;
    url?: string;
    headers?: Record<string, string>;
    _colormap: string;
    _opacity: number;
    percentileFrac: number;
    ignoreZeroVoxels: boolean;
    trustCalMinMax: boolean;
    colormapNegative: string;
    colormapLabel: LUT | null;
    colormapInvert?: boolean;
    nFrame4D?: number;
    frame4D: number;
    nTotalFrame4D?: number;
    cal_minNeg: number;
    cal_maxNeg: number;
    colorbarVisible: boolean;
    modulationImage: number | null;
    modulateAlpha: number;
    series: any;
    nVox3D?: number;
    oblique_angle?: number;
    maxShearDeg?: number;
    useQFormNotSForm: boolean;
    colormapType?: number;
    pixDims?: number[];
    matRAS?: mat4;
    pixDimsRAS?: number[];
    obliqueRAS?: mat4;
    dimsRAS?: number[];
    permRAS?: number[];
    img2RASstep?: number[];
    img2RASstart?: number[];
    toRAS?: mat4;
    toRASvox?: mat4;
    frac2mm?: mat4;
    frac2mmOrtho?: mat4;
    extentsMinOrtho?: number[];
    extentsMaxOrtho?: number[];
    mm2ortho?: mat4;
    hdr: NIFTI1 | NIFTI2 | null;
    extensions?: NIFTIEXTENSION[];
    imageType?: ImageType;
    img?: TypedVoxelArray;
    imaginary?: Float32Array;
    v1?: Float32Array;
    fileObject?: File | File[];
    dims?: number[];
    onColormapChange: (img: NVImage) => void;
    onOpacityChange: (img: NVImage) => void;
    mm000?: vec3;
    mm100?: vec3;
    mm010?: vec3;
    mm001?: vec3;
    cal_min?: number;
    cal_max?: number;
    robust_min?: number;
    robust_max?: number;
    global_min?: number;
    global_max?: number;
    urlImgData?: string;
    isManifest?: boolean;
    limitFrames4D?: number;
    constructor(dataBuffer?: ArrayBuffer | ArrayBuffer[] | ArrayBufferLike | null, name?: string, colormap?: string, opacity?: number, pairedImgData?: ArrayBuffer | null, cal_min?: number, cal_max?: number, trustCalMinMax?: boolean, percentileFrac?: number, ignoreZeroVoxels?: boolean, useQFormNotSForm?: boolean, colormapNegative?: string, frame4D?: number, imageType?: ImageType, cal_minNeg?: number, cal_maxNeg?: number, colorbarVisible?: boolean, colormapLabel?: LUT | null, colormapType?: number);
    init(dataBuffer?: ArrayBuffer | ArrayBuffer[] | ArrayBufferLike | null, name?: string, colormap?: string, opacity?: number, _pairedImgData?: ArrayBuffer | null, cal_min?: number, cal_max?: number, trustCalMinMax?: boolean, percentileFrac?: number, ignoreZeroVoxels?: boolean, useQFormNotSForm?: boolean, colormapNegative?: string, frame4D?: number, imageType?: ImageType, cal_minNeg?: number, cal_maxNeg?: number, colorbarVisible?: boolean, colormapLabel?: LUT | null, colormapType?: number, imgRaw?: ArrayBuffer | ArrayBufferLike | null): void;
    static new(dataBuffer: ArrayBuffer | ArrayBuffer[] | ArrayBufferLike | null, name: string, colormap: string, opacity: number, pairedImgData: ArrayBuffer | null, cal_min: number, cal_max: number, trustCalMinMax: boolean, percentileFrac: number, ignoreZeroVoxels: boolean, useQFormNotSForm: boolean, colormapNegative: string, frame4D: number, imageType: ImageType, cal_minNeg: number, cal_maxNeg: number, colorbarVisible: boolean, colormapLabel: LUT | null, colormapType: number, zarrData: null | unknown): Promise<NVImage>;
    computeObliqueAngle(mtx44: mat4): number;
    float32V1asRGBA(inImg: Float32Array): Uint8Array;
    loadImgV1(isFlipX?: boolean, isFlipY?: boolean, isFlipZ?: boolean): boolean;
    calculateOblique(): void;
    THD_daxes_to_NIFTI(xyzDelta: number[], xyzOrigin: number[], orientSpecific: number[]): void;
    SetPixDimFromSForm(): void;
    readECAT(buffer: ArrayBuffer): ArrayBuffer;
    readV16(buffer: ArrayBuffer): ArrayBuffer;
    readNPY(buffer: ArrayBuffer): Promise<ArrayBuffer>;
    readNPZ(buffer: ArrayBuffer): Promise<ArrayBuffer>;
    imageDataFromArrayBuffer(buffer: ArrayBuffer): Promise<ImageData>;
    readBMP(buffer: ArrayBuffer): Promise<ArrayBuffer>;
    readZARR(buffer: ArrayBuffer, zarrData: unknown): Promise<ArrayBufferLike>;
    readVMR(buffer: ArrayBuffer): ArrayBuffer;
    readFIB(buffer: ArrayBuffer): Promise<[ArrayBuffer, Float32Array]>;
    readSRC(buffer: ArrayBuffer): Promise<ArrayBuffer>;
    readHEAD(dataBuffer: ArrayBuffer, pairedImgData: ArrayBuffer | null): Promise<ArrayBuffer>;
    readMHA(buffer: ArrayBuffer, pairedImgData: ArrayBuffer | null): Promise<ArrayBuffer>;
    readMIF(buffer: ArrayBuffer, pairedImgData: ArrayBuffer | null): Promise<ArrayBuffer>;
    calculateRAS(): void;
    hdr2RAS(nVolumes?: number): Promise<NIFTI1 | NIFTI2>;
    img2RAS(nVolume?: number): TypedVoxelArray;
    vox2mm(XYZ: number[], mtx: mat4): vec3;
    mm2vox(mm: number[], frac?: boolean): Float32Array | vec3;
    arrayEquals(a: unknown[], b: unknown[]): boolean;
    setColormap(cm: string): void;
    setColormapLabel(cm: ColorMap): void;
    setColormapLabelFromUrl(url: string): Promise<void>;
    get colormap(): string;
    get colorMap(): string;
    set colormap(cm: string);
    set colorMap(cm: string);
    get opacity(): number;
    set opacity(opacity: number);
    /**
     * set contrast/brightness to robust range (2%..98%)
     * @param vol - volume for estimate (use -1 to use estimate on all loaded volumes; use INFINITY for current volume)
     * @param isBorder - if true (default) only center of volume used for estimate
     * @returns volume brightness and returns array [pct2, pct98, mnScale, mxScale]
     * @see {@link https://niivue.com/demos/features/timeseries2.html | live demo usage}
     */
    calMinMax(vol?: number, isBorder?: boolean): number[];
    intensityRaw2Scaled(raw: number): number;
    intensityScaled2Raw(scaled: number): number;
    /**
     * Converts NVImage to NIfTI compliant byte array, potentially compressed.
     * Delegates to ImageWriter.saveToUint8Array.
     */
    saveToUint8Array(fnm: string, drawing8?: Uint8Array | null): Promise<Uint8Array>;
    /**
     * save image as NIfTI volume and trigger download.
     * Delegates to ImageWriter.saveToDisk.
     */
    saveToDisk(fnm?: string, drawing8?: Uint8Array | null): Promise<Uint8Array>;
    static fetchDicomData(url: string, headers?: Record<string, string>): Promise<Array<{
        name: string;
        data: ArrayBuffer;
    }>>;
    static readFirstDecompressedBytes(stream: ReadableStream<Uint8Array>, minBytes: number): Promise<Uint8Array>;
    static extractFilenameFromUrl(url: string): string | null;
    static loadInitialVolumesGz(url?: string, headers?: {}, limitFrames4D?: number): Promise<ArrayBuffer | null>;
    static loadInitialVolumes(url?: string, headers?: {}, limitFrames4D?: number): Promise<ArrayBuffer | null>;
    /**
     * factory function to load and return a new NVImage instance from a given URL
     */
    static loadFromUrl({ url, urlImgData, headers, name, colormap, opacity, cal_min, cal_max, trustCalMinMax, percentileFrac, ignoreZeroVoxels, useQFormNotSForm, colormapNegative, frame4D, isManifest, limitFrames4D, imageType, colorbarVisible, buffer }?: Partial<Omit<ImageFromUrlOptions, 'url'>> & {
        url?: string | Uint8Array | ArrayBuffer;
    }): Promise<NVImage>;
    static readFileAsync(file: File, bytesToLoad?: number): Promise<ArrayBuffer>;
    /**
     * factory function to load and return a new NVImage instance from a file in the browser
     */
    static loadFromFile({ file, // file can be an array of file objects or a single file object
    name, colormap, opacity, urlImgData, cal_min, cal_max, trustCalMinMax, percentileFrac, ignoreZeroVoxels, useQFormNotSForm, colormapNegative, frame4D, limitFrames4D, imageType }: ImageFromFileOptions): Promise<NVImage>;
    /**
     * Creates a Uint8Array representing a NIFTI file (header + optional image data).
     * Delegates to ImageWriter.createNiftiArray.
     */
    static createNiftiArray(dims?: number[], pixDims?: number[], affine?: number[], datatypeCode?: NiiDataType, img?: TypedVoxelArray | Uint8Array): Uint8Array;
    /**
     * Creates a NIFTI1 header object with basic properties.
     * Delegates to ImageWriter.createNiftiHeader.
     */
    static createNiftiHeader(dims?: number[], pixDims?: number[], affine?: number[], datatypeCode?: NiiDataType): NIFTI1;
    /**
     * read a 3D slab of voxels from a volume
     * @see {@link https://niivue.com/demos/features/slab_selection.html | live demo usage}
     */
    /**
     * read a 3D slab of voxels from a volume, specified in RAS coordinates.
     * Delegates to VolumeUtils.getVolumeData.
     */
    getVolumeData(voxStart?: number[], voxEnd?: number[], dataType?: string): [TypedVoxelArray, number[]];
    /**
     * write a 3D slab of voxels from a volume
     * @see {@link https://niivue.com/demos/features/slab_selection.html | live demo usage}
     */
    /**
     * write a 3D slab of voxels from a volume, specified in RAS coordinates.
     * Delegates to VolumeUtils.setVolumeData.
     * Input slabData is assumed to be in the correct raw data type for the target image.
     */
    setVolumeData(voxStart?: number[], voxEnd?: number[], img?: TypedVoxelArray): void;
    /**
     * factory function to load and return a new NVImage instance from a base64 encoded string
     * @example
     * myImage = NVImage.loadFromBase64('SomeBase64String')
     */
    static loadFromBase64({ base64, name, colormap, opacity, cal_min, cal_max, trustCalMinMax, percentileFrac, ignoreZeroVoxels, useQFormNotSForm, colormapNegative, frame4D, imageType, cal_minNeg, cal_maxNeg, colorbarVisible, colormapLabel }: ImageFromBase64): Promise<NVImage>;
    /**
     * make a clone of a NVImage instance and return a new NVImage
     * @example
     * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
     * clonedImage = myImage.clone()
     */
    clone(): NVImage;
    /**
     * fill a NVImage instance with zeros for the image data
     * @example
     * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
     * clonedImageWithZeros = myImage.clone().zeroImage()
     */
    zeroImage(): void;
    /**
     * get nifti specific metadata about the image
     */
    getImageMetadata(): ImageMetadata;
    /**
     * a factory function to make a zero filled image given a NVImage as a reference
     * @example
     * myImage = NVImage.loadFromFile(SomeFileObject) // files can be from dialogs or drag and drop
     * newZeroImage = NVImage.zerosLike(myImage)
     */
    static zerosLike(nvImage: NVImage, dataType?: string): NVImage;
    /**
     * Returns voxel intensity at specific native coordinates.
     * Delegates to VolumeUtils.getValue.
     */
    getValue(x: number, y: number, z: number, frame4D?: number, isReadImaginary?: boolean): number;
    /**
     * Update options for image
     */
    applyOptionsUpdate(options: ImageFromUrlOptions): void;
    getImageOptions(): ImageFromUrlOptions;
    /**
     * Converts NVImage to NIfTI compliant byte array.
     * Handles potential re-orientation of drawing data.
     * Delegates to ImageWriter.toUint8Array.
     */
    toUint8Array(drawingBytes?: Uint8Array | null): Uint8Array;
    convertVox2Frac(vox: vec3): vec3;
    convertFrac2Vox(frac: vec3): vec3;
    convertFrac2MM(frac: vec3, isForceSliceMM?: boolean): vec4;
    convertMM2Frac(mm: vec3 | vec4, isForceSliceMM?: boolean): vec3;
}

type FreeSurferConnectome = {
    data_type: string;
    points: Array<{
        comments?: Array<{
            text: string;
        }>;
        coordinates: {
            x: number;
            y: number;
            z: number;
        };
    }>;
};
/**
 * Represents a connectome
 */
declare class NVConnectome extends NVMesh {
    gl: WebGL2RenderingContext;
    nodesChanged: EventTarget;
    constructor(gl: WebGL2RenderingContext, connectome: LegacyConnectome);
    static convertLegacyConnectome(json: LegacyConnectome): Connectome;
    static convertFreeSurferConnectome(json: FreeSurferConnectome, colormap?: string): Connectome;
    updateLabels(): void;
    addConnectomeNode(node: NVConnectomeNode): void;
    deleteConnectomeNode(node: NVConnectomeNode): void;
    updateConnectomeNodeByIndex(index: number, updatedNode: NVConnectomeNode): void;
    updateConnectomeNodeByPoint(point: [number, number, number], updatedNode: NVConnectomeNode): void;
    addConnectomeEdge(first: number, second: number, colorValue: number): NVConnectomeEdge;
    deleteConnectomeEdge(first: number, second: number): NVConnectomeEdge;
    findClosestConnectomeNode(point: number[], distance: number): NVConnectomeNode | null;
    updateConnectome(gl: WebGL2RenderingContext): void;
    updateMesh(gl: WebGL2RenderingContext): void;
    json(): Connectome;
    /**
     * Factory method to create connectome from options
     */
    static loadConnectomeFromUrl(gl: WebGL2RenderingContext, url: string): Promise<NVConnectome>;
}

/**
 * Slice Type
 * @ignore
 */
declare enum SLICE_TYPE {
    AXIAL = 0,
    CORONAL = 1,
    SAGITTAL = 2,
    MULTIPLANAR = 3,
    RENDER = 4
}
declare enum SHOW_RENDER {
    NEVER = 0,
    ALWAYS = 1,
    AUTO = 2
}
/**
 * Multi-planar layout
 * @ignore
 */
declare enum MULTIPLANAR_TYPE {
    AUTO = 0,
    COLUMN = 1,
    GRID = 2,
    ROW = 3
}
/**
 * Drag mode
 * @ignore
 */
declare enum DRAG_MODE {
    none = 0,
    contrast = 1,
    measurement = 2,
    pan = 3,
    slicer3D = 4,
    callbackOnly = 5,
    roiSelection = 6,
    angle = 7
}
declare enum DRAG_MODE_SECONDARY {
    none = 0,
    contrast = 1,
    measurement = 2,
    pan = 3,
    slicer3D = 4,
    callbackOnly = 5,
    roiSelection = 6,
    angle = 7
}
declare enum DRAG_MODE_PRIMARY {
    crosshair = 0,
    windowing = 1
}
declare enum COLORMAP_TYPE {
    MIN_TO_MAX = 0,
    ZERO_TO_MAX_TRANSPARENT_BELOW_MIN = 1,
    ZERO_TO_MAX_TRANSLUCENT_BELOW_MIN = 2
}
/**
 * NVConfigOptions
 */
type NVConfigOptions = {
    textHeight: number;
    fontSizeScaling: number;
    fontMinPx: number;
    colorbarHeight: number;
    colorbarWidth: number;
    showColorbarBorder: boolean;
    crosshairWidth: number;
    crosshairWidthUnit: 'voxels' | 'mm' | 'percent';
    crosshairGap: number;
    rulerWidth: number;
    show3Dcrosshair: boolean;
    backColor: number[];
    crosshairColor: number[];
    fontColor: Float32List;
    selectionBoxColor: number[];
    clipPlaneColor: number[];
    clipThick: number;
    clipVolumeLow: number[];
    clipVolumeHigh: number[];
    rulerColor: number[];
    colorbarMargin: number;
    trustCalMinMax: boolean;
    clipPlaneHotKey: string;
    viewModeHotKey: string;
    doubleTouchTimeout: number;
    longTouchTimeout: number;
    keyDebounceTime: number;
    isNearestInterpolation: boolean;
    atlasOutline: number;
    atlasActiveIndex: number;
    isRuler: boolean;
    isColorbar: boolean;
    isOrientCube: boolean;
    tileMargin: number;
    multiplanarPadPixels: number;
    multiplanarForceRender: boolean;
    multiplanarEqualSize: boolean;
    multiplanarShowRender: SHOW_RENDER;
    isRadiologicalConvention: boolean;
    meshThicknessOn2D: number | string;
    dragMode: DRAG_MODE | DRAG_MODE_SECONDARY;
    dragModePrimary: DRAG_MODE_PRIMARY;
    yoke3Dto2DZoom: boolean;
    isDepthPickMesh: boolean;
    isCornerOrientationText: boolean;
    isOrientationTextVisible: boolean;
    heroImageFraction: number;
    heroSliceType: SLICE_TYPE;
    sagittalNoseLeft: boolean;
    isSliceMM: boolean;
    isV1SliceShader: boolean;
    forceDevicePixelRatio: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'silent';
    loadingText: string;
    isForceMouseClickToVoxelCenters: boolean;
    dragAndDropEnabled: boolean;
    drawingEnabled: boolean;
    penValue: number;
    floodFillNeighbors: number;
    isFilledPen: boolean;
    thumbnail: string;
    maxDrawUndoBitmaps: number;
    sliceType: SLICE_TYPE;
    isAntiAlias: boolean | null;
    isAdditiveBlend: boolean;
    isResizeCanvas: boolean;
    meshXRay: number;
    limitFrames4D: number;
    showLegend: boolean;
    legendBackgroundColor: number[];
    legendTextColor: number[];
    multiplanarLayout: MULTIPLANAR_TYPE;
    renderOverlayBlend: number;
    sliceMosaicString: string;
    centerMosaic: boolean;
    interactive: boolean;
    penSize: number;
    clickToSegment: boolean;
    clickToSegmentRadius: number;
    clickToSegmentBright: boolean;
    clickToSegmentAutoIntensity: boolean;
    clickToSegmentIntensityMax: number;
    clickToSegmentIntensityMin: number;
    clickToSegmentPercent: number;
    clickToSegmentMaxDistanceMM: number;
    clickToSegmentIs2D: boolean;
    selectionBoxLineThickness: number;
    selectionBoxIsOutline: boolean;
    scrollRequiresFocus: boolean;
    showMeasureUnits: boolean;
    measureTextJustify: 'start' | 'center' | 'end';
    measureTextColor: number[];
    measureLineColor: number[];
    measureTextHeight: number;
    isAlphaClipDark: boolean;
    gradientOrder: number;
    gradientOpacity: number;
    renderSilhouette: number;
    gradientAmount: number;
    invertScrollDirection: boolean;
    is2DSliceShader: boolean;
};
declare const DEFAULT_OPTIONS: NVConfigOptions;
type SceneData = {
    gamma: number;
    azimuth: number;
    elevation: number;
    crosshairPos: vec3;
    clipPlane: number[];
    clipPlaneDepthAziElev: number[];
    volScaleMultiplier: number;
    pan2Dxyzmm: vec4;
    clipThick: number;
    clipVolumeLow: number[];
    clipVolumeHigh: number[];
};
declare const INITIAL_SCENE_DATA: {
    gamma: number;
    azimuth: number;
    elevation: number;
    crosshairPos: vec3;
    clipPlane: number[];
    clipPlaneDepthAziElev: number[];
    volScaleMultiplier: number;
    pan2Dxyzmm: vec4;
    clipThick: number;
    clipVolumeLow: number[];
    clipVolumeHigh: number[];
};
type Scene = {
    onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
    onZoom3DChange: (scale: number) => void;
    sceneData: SceneData;
    renderAzimuth: number;
    renderElevation: number;
    volScaleMultiplier: number;
    crosshairPos: vec3;
    clipPlane: number[];
    clipPlaneDepthAziElev: number[];
    pan2Dxyzmm: vec4;
    _elevation?: number;
    _azimuth?: number;
    gamma?: number;
};
type DocumentData = {
    title?: string;
    imageOptionsArray?: ImageFromUrlOptions[];
    meshOptionsArray?: unknown[];
    opts?: Partial<NVConfigOptions>;
    previewImageDataURL?: string;
    labels?: NVLabel3D[];
    encodedImageBlobs?: string[];
    encodedDrawingBlob?: string;
    meshesString?: string;
    sceneData?: Partial<SceneData>;
    connectomes?: string[];
    customData?: string;
};
type ExportDocumentData = {
    encodedImageBlobs: string[];
    encodedDrawingBlob: string;
    previewImageDataURL: string;
    imageOptionsMap: Map<string, number>;
    imageOptionsArray: ImageFromUrlOptions[];
    sceneData: Partial<SceneData>;
    opts: NVConfigOptions;
    meshesString: string;
    labels: NVLabel3D[];
    connectomes: string[];
    customData: string;
};
/**
 * Creates and instance of NVDocument
 * @ignore
 */
declare class NVDocument {
    data: DocumentData;
    scene: Scene;
    volumes: NVImage[];
    meshDataObjects?: Array<NVMesh | NVConnectome>;
    meshes: Array<NVMesh | NVConnectome>;
    drawBitmap: Uint8Array | null;
    imageOptionsMap: Map<any, any>;
    meshOptionsMap: Map<any, any>;
    private _optsProxy;
    private _optsChangeCallback;
    constructor();
    /**
     * Title of the document
     */
    get title(): string;
    /**
     * Gets preview image blob
     * @returns dataURL of preview image
     */
    get previewImageDataURL(): string;
    /**
     * Sets preview image blob
     * @param dataURL - encoded preview image
     */
    set previewImageDataURL(dataURL: string);
    /**
     * @param title - title of document
     */
    set title(title: string);
    get imageOptionsArray(): ImageFromUrlOptions[];
    /**
     * Gets the base 64 encoded blobs of associated images
     */
    get encodedImageBlobs(): string[];
    /**
     * Gets the base 64 encoded blob of the associated drawing
     * TODO the return type was marked as string[] here, was that an error?
     */
    get encodedDrawingBlob(): string;
    /**
     * Gets the options of the {@link Niivue} instance
     */
    get opts(): NVConfigOptions;
    /**
     * Sets the options of the {@link Niivue} instance
     */
    set opts(opts: NVConfigOptions);
    /**
     * Gets the 3D labels of the {@link Niivue} instance
     */
    get labels(): NVLabel3D[];
    /**
     * Sets the 3D labels of the {@link Niivue} instance
     */
    set labels(labels: NVLabel3D[]);
    get customData(): string | undefined;
    set customData(data: string);
    /**
     * Checks if document has an image by id
     */
    hasImage(image: NVImage): boolean;
    /**
     * Checks if document has an image by url
     */
    hasImageFromUrl(url: string): boolean;
    /**
     * Adds an image and the options an image was created with
     */
    addImageOptions(image: NVImage, imageOptions: ImageFromUrlOptions): void;
    /**
     * Removes image from the document as well as its options
     */
    removeImage(image: NVImage): void;
    /**
     * Fetch any image data that is missing from this document.
     * This includes loading image blobs for `ImageFromUrlOptions` with valid `url` fields.
     * After calling this, `volumes` and `imageOptionsMap` will be populated.
     */
    fetchLinkedData(): Promise<void>;
    /**
     * Returns the options for the image if it was added by url
     */
    getImageOptions(image: NVImage): ImageFromUrlOptions | null;
    /**
     * Serialise the document.
     *
     * @param embedImages  If false, encodedImageBlobs is left empty
     *                     (imageOptionsArray still records the URL / name).
     */
    json(embedImages?: boolean): ExportDocumentData;
    download(fileName: string, compress: boolean, opts?: {
        embedImages: boolean;
    }): Promise<void>;
    /**
     * Deserialize mesh data objects
     */
    static deserializeMeshDataObjects(document: NVDocument): void;
    /**
     * Factory method to return an instance of NVDocument from a URL
     */
    static loadFromUrl(url: string): Promise<NVDocument>;
    /**
     * Factory method to return an instance of NVDocument from a File object
     */
    static loadFromFile(file: Blob): Promise<NVDocument>;
    /**
     * Factory method to return an instance of NVDocument from JSON.
     *
     * This will merge any saved configuration options (`opts`) with the DEFAULT_OPTIONS,
     * ensuring any missing values are filled with defaults. It also restores special-case
     * fields like `meshThicknessOn2D` when serialized as the string "infinity".
     *
     * @param data - A serialized DocumentData object
     * @returns A reconstructed NVDocument instance
     */
    static loadFromJSON(data: DocumentData): NVDocument;
    /**
     * Factory method to return an instance of NVDocument from JSON
     */
    static oldloadFromJSON(data: DocumentData): NVDocument;
    /**
     * Sets the callback function to be called when opts properties change
     */
    setOptsChangeCallback(callback: (propertyName: keyof NVConfigOptions, newValue: NVConfigOptions[keyof NVConfigOptions], oldValue: NVConfigOptions[keyof NVConfigOptions]) => void): void;
    /**
     * Removes the opts change callback
     */
    removeOptsChangeCallback(): void;
    /**
     * Creates a Proxy wrapper around the opts object to detect changes
     */
    private _createOptsProxy;
}

type NiftiHeader = {
    littleEndian: boolean;
    dim_info: number;
    dims: number[];
    pixDims: number[];
    intent_p1: number;
    intent_p2: number;
    intent_p3: number;
    intent_code: number;
    datatypeCode: number;
    numBitsPerVoxel: number;
    slice_start: number;
    vox_offset: number;
    scl_slope: number;
    scl_inter: number;
    slice_end: number;
    slice_code: number;
    xyzt_units: number;
    cal_max: number;
    cal_min: number;
    slice_duration: number;
    toffset: number;
    description: string;
    aux_file: string;
    qform_code: number;
    sform_code: number;
    quatern_b: number;
    quatern_c: number;
    quatern_d: number;
    qoffset_x: number;
    qoffset_y: number;
    qoffset_z: number;
    affine: number[][];
    intent_name: string;
    magic: string;
};
type Volume = Record<string, any>;
type Point = {
    comments: Array<{
        text: string;
        prefilled?: string;
    }>;
    coordinates: {
        x: number;
        y: number;
        z: number;
    };
};
/**
 * Represents the vertices of a connectome
 * @ignore
 */
type NVConnectomeNode = {
    name: string;
    x: number;
    y: number;
    z: number;
    colorValue: number;
    sizeValue: number;
    label?: NVLabel3D;
};
/**
 * Represents edges between connectome nodes
 * @ignore
 */
type NVConnectomeEdge = {
    first: number;
    second: number;
    colorValue: number;
};
type ConnectomeOptions = {
    name: string;
    nodeColormap: string;
    nodeColormapNegative: string;
    nodeMinColor: number;
    nodeMaxColor: number;
    nodeScale: number;
    edgeColormap: string;
    edgeColormapNegative: string;
    edgeMin: number;
    edgeMax: number;
    edgeScale: number;
    legendLineThickness?: number;
    showLegend?: boolean;
};
type Connectome = ConnectomeOptions & {
    nodes: NVConnectomeNode[];
    edges: NVConnectomeEdge[];
};
type LegacyNodes = {
    names: string[];
    prefilled: unknown[];
    X: number[];
    Y: number[];
    Z: number[];
    Color: number[];
    Size: number[];
};
type LegacyConnectome = Partial<ConnectomeOptions> & {
    nodes: LegacyNodes;
    edges: number[];
};
type DragReleaseParams = {
    fracStart: vec3;
    fracEnd: vec3;
    voxStart: vec3;
    voxEnd: vec3;
    mmStart: vec4;
    mmEnd: vec4;
    mmLength: number;
    tileIdx: number;
    axCorSag: SLICE_TYPE;
};
type NiiVueLocationValue = {
    id: string;
    mm: vec4;
    name: string;
    value: number;
    vox: vec3;
};
type NiiVueLocation = {
    axCorSag: number;
    frac: vec3;
    mm: vec4;
    string: string;
    values: NiiVueLocationValue[];
    vox: vec3;
    xy: [number, number];
};
type SyncOpts = {
    '3d'?: boolean;
    '2d'?: boolean;
    zoomPan?: boolean;
    cal_min?: boolean;
    cal_max?: boolean;
    gamma?: boolean;
    useSliceOffset?: boolean;
    sliceType?: boolean;
    crosshair?: boolean;
    clipPlane?: boolean;
};

type ValuesArray = Array<{
    id: string;
    vals: Float32Array;
    global_min?: number;
    global_max?: number;
    cal_min?: number;
    cal_max?: number;
}>;
type AnyNumberArray = number[] | Float64Array | Float32Array | Uint32Array | Uint16Array | Uint8Array | Int32Array | Int16Array | Int8Array;
type DefaultMeshType = {
    positions: Float32Array;
    indices: Uint32Array;
    colors?: Float32Array;
};
type TRACT = {
    pts: Float32Array;
    offsetPt0: Uint32Array;
    dps: ValuesArray;
};
type TT = {
    pts: Float32Array;
    offsetPt0: Uint32Array;
};
type TRX = {
    pts: Float32Array;
    offsetPt0: Uint32Array;
    dpg: ValuesArray;
    dps: ValuesArray;
    dpv: ValuesArray;
    header: unknown;
};
type TRK = {
    pts: Float32Array;
    offsetPt0: Uint32Array;
    dps: ValuesArray;
    dpv: ValuesArray;
};
type TCK = {
    pts: Float32Array;
    offsetPt0: Uint32Array;
};
type VTK = DefaultMeshType | {
    pts: Float32Array;
    offsetPt0: Uint32Array;
};
type ANNOT = Uint32Array | {
    scalars: Float32Array;
    colormapLabel: LUT;
};
type MZ3 = {
    positions: Float32Array | null;
    indices: Uint32Array | null;
    scalars: Float32Array;
    colors: Float32Array | null;
} | {
    scalars: Float32Array;
    colormapLabel: LUT;
} | {
    scalars: Float32Array;
};
type GII = {
    scalars: Float32Array;
    positions?: Float32Array;
    indices?: Uint32Array;
    colormapLabel?: LUT;
    anatomicalStructurePrimary: string;
};
type MGH = AnyNumberArray | {
    scalars: AnyNumberArray;
    colormapLabel: LUT;
};
type X3D = {
    positions: Float32Array;
    indices: Uint32Array;
    rgba255: Uint8Array;
};

/** Enum for text alignment
 */
declare enum MeshType {
    MESH = "mesh",
    CONNECTOME = "connectome",
    FIBER = "fiber"
}
type NVMeshLayer = {
    name?: string;
    key?: string;
    url?: string;
    headers?: Record<string, string>;
    opacity: number;
    colormap: string;
    colormapNegative?: string;
    colormapInvert?: boolean;
    colormapLabel?: ColorMap | LUT;
    useNegativeCmap?: boolean;
    global_min?: number;
    global_max?: number;
    cal_min: number;
    cal_max: number;
    cal_minNeg: number;
    cal_maxNeg: number;
    isAdditiveBlend?: boolean;
    frame4D: number;
    nFrame4D: number;
    values: AnyNumberArray;
    outlineBorder?: number;
    isTransparentBelowCalMin?: boolean;
    colormapType?: number;
    base64?: string;
    colorbarVisible?: boolean;
    showLegend?: boolean;
    labels?: NVLabel3D[];
    atlasValues?: AnyNumberArray;
};
declare const NVMeshLayerDefaults: {
    colormap: string;
    opacity: number;
    nFrame4D: number;
    frame4D: number;
    outlineBorder: number;
    cal_min: number;
    cal_max: number;
    cal_minNeg: number;
    cal_maxNeg: number;
    colormapType: COLORMAP_TYPE;
    values: number[];
    useNegativeCmap: boolean;
    showLegend: boolean;
};
declare class NVMeshFromUrlOptions {
    url: string;
    gl: WebGL2RenderingContext | null;
    name: string;
    opacity: number;
    rgba255: Uint8Array;
    visible: boolean;
    layers: NVMeshLayer[];
    colorbarVisible: boolean;
    constructor(url?: string, gl?: any, name?: string, opacity?: number, rgba255?: Uint8Array, visible?: boolean, layers?: any[], colorbarVisible?: boolean);
}
/**
 * Parameters for loading a base mesh or volume.
 */
type BaseLoadParams = {
    /** WebGL rendering context. */
    gl: WebGL2RenderingContext;
    /** Name for this image. Default is an empty string. */
    name: string;
    /** Opacity for this image. Default is 1. */
    opacity: number;
    /** Base color of the mesh in RGBA [0-255]. Default is white. */
    rgba255: number[] | Uint8Array;
    /** Whether this image is visible. */
    visible: boolean;
    /** Layers of the mesh to load. */
    layers: NVMeshLayer[];
};
type LoadFromUrlParams = Partial<BaseLoadParams> & {
    url: string;
    headers?: Record<string, string>;
    buffer?: ArrayBuffer;
};
type LoadFromFileParams = BaseLoadParams & {
    file: Blob;
};
type LoadFromBase64Params = BaseLoadParams & {
    base64: string;
};
/**
 * a NVMesh encapsulates some mesh data and provides methods to query and operate on meshes
 */
declare class NVMesh {
    id: string;
    name: string;
    anatomicalStructurePrimary: string;
    colorbarVisible: boolean;
    furthestVertexFromOrigin: number;
    extentsMin: number | number[];
    extentsMax: number | number[];
    opacity: number;
    visible: boolean;
    meshShaderIndex: number;
    offsetPt0: Uint32Array | null;
    colormapInvert: boolean;
    fiberGroupColormap: ColorMap | null;
    indexBuffer: WebGLBuffer;
    vertexBuffer: WebGLBuffer;
    vao: WebGLVertexArrayObject;
    vaoFiber: WebGLVertexArrayObject;
    pts: Float32Array;
    tris?: Uint32Array;
    layers: NVMeshLayer[];
    type: MeshType;
    data_type?: string;
    rgba255: Uint8Array;
    fiberLength?: number;
    fiberLengths?: Uint32Array;
    fiberDensity?: Float32Array;
    fiberDither: number;
    fiberColor: string;
    fiberDecimationStride: number;
    fiberSides: number;
    fiberRadius: number;
    fiberOcclusion: number;
    f32PerVertex: number;
    fiberMask?: unknown[];
    colormap?: ColorMap | LegacyConnectome | string | null;
    dpg?: ValuesArray | null;
    dps?: ValuesArray | null;
    dpv?: ValuesArray | null;
    hasConnectome: boolean;
    connectome?: LegacyConnectome | string;
    indexCount?: number;
    vertexCount: number;
    nodeScale: number;
    edgeScale: number;
    legendLineThickness: number;
    showLegend: boolean;
    nodeColormap: string;
    edgeColormap: string;
    nodeColormapNegative?: string;
    edgeColormapNegative?: string;
    nodeMinColor?: number;
    nodeMaxColor?: number;
    edgeMin?: number;
    edgeMax?: number;
    nodes?: LegacyNodes | NVConnectomeNode[];
    edges?: number[] | NVConnectomeEdge[];
    points?: Point[];
    /**
     * @param pts - a 3xN array of vertex positions (X,Y,Z coordinates).
     * @param tris - a 3xN array of triangle indices (I,J,K; indexed from zero). Each triangle generated from three vertices.
     * @param name - a name for this image. Default is an empty string
     * @param rgba255 - the base color of the mesh. RGBA values from 0 to 255. Default is white
     * @param opacity - the opacity for this mesh. default is 1
     * @param visible - whether or not this image is to be visible
     * @param gl - WebGL rendering context
     * @param connectome - specify connectome edges and nodes. Default is null (not a connectome).
     * @param dpg - Data per group for tractography, see TRK format. Default is null (not tractograpgy)
     * @param dps - Data per streamline for tractography, see TRK format.  Default is null (not tractograpgy)
     * @param dpv - Data per vertex for tractography, see TRK format.  Default is null (not tractograpgy)
     * @param colorbarVisible - does this mesh display a colorbar
     * @param anatomicalStructurePrimary - region for mesh. Default is an empty string
     */
    constructor(pts: Float32Array, tris: Uint32Array, name: string, rgba255: Uint8Array, opacity: number, visible: boolean, gl: WebGL2RenderingContext, connectome?: LegacyConnectome | string | null, dpg?: ValuesArray | null, dps?: ValuesArray | null, dpv?: ValuesArray | null, colorbarVisible?: boolean, anatomicalStructurePrimary?: string);
    initValuesArray(va: ValuesArray): ValuesArray;
    linesToCylinders(gl: WebGL2RenderingContext, posClrF32: Float32Array, indices: number[]): void;
    createFiberDensityMap(): void;
    updateFibers(gl: WebGL2RenderingContext): void;
    indexNearestXYZmm(Xmm: number, Ymm: number, Zmm: number): number[];
    unloadMesh(gl: WebGL2RenderingContext): void;
    scalars2RGBA(rgba: Uint8ClampedArray, layer: NVMeshLayer, scalars: AnyNumberArray, isNegativeCmap?: boolean): Uint8ClampedArray;
    blendColormap(u8: Uint8Array, additiveRGBA: Uint8Array, layer: NVMeshLayer, mn: number, mx: number, lut: Uint8ClampedArray, invert?: boolean): void;
    updateMesh(gl: WebGL2RenderingContext): void;
    reverseFaces(gl: WebGL2RenderingContext): void;
    hierarchicalOrder(): number;
    decimateFaces(n: number, ntarget: number): void;
    decimateHierarchicalMesh(gl: WebGL2RenderingContext, order?: number): boolean;
    setLayerProperty(id: number, key: keyof NVMeshLayer, val: number | string | boolean, gl: WebGL2RenderingContext): Promise<void>;
    setProperty(key: keyof this, val: number | string | boolean | Uint8Array | number[] | ColorMap | LegacyConnectome | Float32Array, gl: WebGL2RenderingContext): void;
    generatePosNormClr(pts: Float32Array, tris: Uint32Array, rgba255: Uint8Array): Float32Array;
    static readMesh(buffer: ArrayBuffer, name: string, gl: WebGL2RenderingContext, opacity?: number, rgba255?: Uint8Array, visible?: boolean): Promise<NVMesh>;
    static loadLayer(layer: NVMeshLayer, nvmesh: NVMesh): Promise<void>;
    /**
     * factory function to load and return a new NVMesh instance from a given URL
     */
    static loadFromUrl({ url, headers, gl, name, opacity, rgba255, visible, layers, buffer }?: Partial<LoadFromUrlParams>): Promise<NVMesh>;
    static readFileAsync(file: Blob): Promise<ArrayBuffer>;
    /**
     * factory function to load and return a new NVMesh instance from a file in the browser
     *
     * @returns NVMesh instance
     */
    static loadFromFile({ file, gl, name, opacity, rgba255, visible, layers }?: Partial<LoadFromFileParams>): Promise<NVMesh>;
    /**
     * load and return a new NVMesh instance from a base64 encoded string
     */
    loadFromBase64({ base64, gl, name, opacity, rgba255, visible, layers }?: Partial<LoadFromBase64Params>): Promise<NVMesh>;
}

type TypedNumberArray = Float64Array | Float32Array | Uint32Array | Uint16Array | Uint8Array | Int32Array | Int16Array | Int8Array;
declare class NVUtilities {
    static arrayBufferToBase64(arrayBuffer: ArrayBuffer): string;
    static decompress(data: Uint8Array): Promise<Uint8Array>;
    static decompressToBuffer(data: Uint8Array): Promise<ArrayBuffer>;
    static readMatV4(buffer: ArrayBuffer, isReplaceDots?: boolean): Promise<Record<string, TypedNumberArray>>;
    static b64toUint8(base64: string): Uint8Array;
    static uint8tob64(bytes: Uint8Array): string;
    static download(content: string | ArrayBuffer, fileName: string, contentType: string): void;
    static readFileAsync(file: Blob): Promise<ArrayBuffer>;
    static blobToBase64(blob: Blob): Promise<string>;
    static decompressBase64String(base64: string): Promise<string>;
    static compressToBase64String(string: string): Promise<string>;
    /**
     * Converts a string into a Uint8Array for use with compression/decompression methods (101arrowz/fflate: MIT License)
     * @param str The string to encode
     * @param latin1 Whether or not to interpret the data as Latin-1. This should
     *               not need to be true unless decoding a binary string.
     * @returns The string encoded in UTF-8/Latin-1 binary
     */
    static strToU8(str: string, latin1?: boolean): Uint8Array;
    static compress(data: Uint8Array, format?: CompressionFormat): Promise<ArrayBuffer>;
    static compressStringToArrayBuffer(input: string): Promise<ArrayBuffer>;
    static isArrayBufferCompressed(buffer: ArrayBuffer): boolean;
    /**
     * Converts a Uint8Array to a string (101arrowz/fflate: MIT License)
     * @param dat The data to decode to string
     * @param latin1 Whether or not to interpret the data as Latin-1. This should
     *               not need to be true unless encoding to binary string.
     * @returns The original UTF-8/Latin-1 string
     */
    static strFromU8(dat: Uint8Array, latin1?: boolean): string;
    static decompressArrayBuffer(buffer: ArrayBuffer): Promise<string>;
    static arraysAreEqual(a: unknown[], b: unknown[]): boolean;
    /**
     * Generate a pre-filled number array.
     *
     * @param start - start value
     * @param stop - stop value
     * @param step - step value
     * @returns filled number array
     */
    static range(start: number, stop: number, step: number): number[];
    /**
     * convert spherical AZIMUTH, ELEVATION to Cartesian
     * @param azimuth - azimuth number
     * @param elevation - elevation number
     * @returns the converted [x, y, z] coordinates
     * @example
     * xyz = NVUtilities.sph2cartDeg(42, 42)
     */
    static sph2cartDeg(azimuth: number, elevation: number): number[];
    static vox2mm(XYZ: number[], mtx: mat4): vec3;
}

/**
 * Class to load different mesh formats
 * @ignore
 */
declare class NVMeshLoaders {
    static readTRACT(buffer: ArrayBuffer): TRACT;
    static readTT(buffer: ArrayBuffer): Promise<TT>;
    static readTRX(buffer: ArrayBuffer): Promise<TRX>;
    static readTSF(buffer: ArrayBuffer, n_vert?: number): Float32Array;
    static readTCK(buffer: ArrayBuffer): TCK;
    static readTRK(buffer: ArrayBuffer): Promise<TRK>;
    static readTxtVTK(buffer: ArrayBuffer): VTK;
    static readLayer(name: string, buffer: ArrayBuffer, nvmesh: NVMesh, opacity?: number, colormap?: string, colormapNegative?: string, useNegativeCmap?: boolean, cal_min?: number | null, cal_max?: number | null, outlineBorder?: number): Promise<NVMeshLayer | undefined>;
    static readSMP(buffer: ArrayBuffer, n_vert: number): Promise<Float32Array>;
    static readSTC(buffer: ArrayBuffer, n_vert: number): Float32Array;
    static isCurv(buffer: ArrayBuffer): boolean;
    static readCURV(buffer: ArrayBuffer, n_vert: number): Float32Array;
    static readANNOT(buffer: ArrayBuffer, n_vert: number, isReadColortables?: boolean): ANNOT;
    static readNV(buffer: ArrayBuffer): DefaultMeshType;
    static readASC(buffer: ArrayBuffer): DefaultMeshType;
    static readVTK(buffer: ArrayBuffer): VTK;
    static readWRL(buffer: ArrayBuffer): DefaultMeshType;
    static readDFS(buffer: ArrayBuffer): DefaultMeshType;
    static readMZ3(buffer: ArrayBuffer, n_vert?: number): Promise<MZ3>;
    static readPLY(buffer: ArrayBuffer): DefaultMeshType;
    static readICO(buffer: ArrayBuffer): DefaultMeshType;
    static readGEO(buffer: ArrayBuffer, isFlipWinding?: boolean): DefaultMeshType;
    static readOFF(buffer: ArrayBuffer): DefaultMeshType;
    static readOBJMNI(buffer: ArrayBuffer): DefaultMeshType;
    static readOBJ(buffer: ArrayBuffer): Promise<DefaultMeshType>;
    static readFreeSurfer(buffer: ArrayBuffer): DefaultMeshType;
    static readSRF(buffer: ArrayBuffer): Promise<DefaultMeshType>;
    static readTxtSTL(buffer: ArrayBuffer): DefaultMeshType;
    static readSTL(buffer: ArrayBuffer): DefaultMeshType;
    static decimateLayerVertices(nVertLayer: number, nVertMesh: number): number;
    static readNII2(buffer: ArrayBuffer, n_vert?: number, anatomicalStructurePrimary?: string): Promise<Int32Array | Float32Array | Int16Array | Uint8Array>;
    static readNII(buffer: ArrayBuffer, n_vert?: number, anatomicalStructurePrimary?: string): Promise<Float32Array | Uint8Array | Int32Array | Int16Array>;
    static readMGH(buffer: ArrayBuffer, n_vert?: number, isReadColortables?: boolean): Promise<MGH>;
    static readX3D(buffer: ArrayBuffer): X3D;
    static readGII(buffer: ArrayBuffer, n_vert?: number): Promise<GII>;
}

type Extents = {
    mxDx: number;
    extentsMin: number | number[];
    extentsMax: number | number[];
};
/**
 * Utilities class for common mesh functions
 */
declare class NVMeshUtilities {
    static getClusterBoundaryU8(u8: Uint8Array, faces: number[] | Uint32Array): boolean[];
    static gzip(data: Uint8Array): Promise<Uint8Array>;
    static createMZ3(vertices: Float32Array, indices: Uint32Array, compress?: boolean, colors?: Uint8Array | null): ArrayBuffer;
    static createMZ3Async(vertices: Float32Array, indices: Uint32Array, compress?: boolean, colors?: Uint8Array | null): Promise<ArrayBuffer>;
    static createOBJ(vertices: Float32Array, indices: Uint32Array): ArrayBuffer;
    static createSTL(vertices: Float32Array, indices: Uint32Array): ArrayBuffer;
    static downloadArrayBuffer(buffer: ArrayBuffer, filename: string): void;
    static saveMesh(vertices: Float32Array, indices: Uint32Array, filename?: string, compress?: boolean): Promise<ArrayBuffer>;
    static getClusterBoundary(rgba8: Uint8Array, faces: number[] | Uint32Array): boolean[];
    static getExtents(pts: number[] | Float32Array): Extents;
    static generateNormals(pts: number[] | Float32Array, tris: number[] | Uint32Array): Float32Array;
}

/**
 * Entry representing a single colormap with display properties.
 */
type ColormapListEntry = {
    name: string;
    min: number;
    max: number;
    isColorbarFromZero: boolean;
    negative: boolean;
    visible: boolean;
    invert: boolean;
};
type Graph = {
    LTWH: number[];
    plotLTWH?: number[];
    opacity: number;
    vols: number[];
    autoSizeMultiplanar: boolean;
    normalizeValues: boolean;
    isRangeCalMinMax: boolean;
    backColor?: number[];
    lineColor?: number[];
    textColor?: number[];
    lineThickness?: number;
    gridLineThickness?: number;
    lineAlpha?: number;
    lines?: number[][];
    selectedColumn?: number;
    lineRGB?: number[][];
};
type Descriptive = {
    mean: number;
    stdev: number;
    nvox: number;
    volumeMM3: number;
    volumeML: number;
    min: number;
    max: number;
    meanNot0: number;
    stdevNot0: number;
    nvoxNot0: number;
    minNot0: number;
    maxNot0: number;
    cal_min: number;
    cal_max: number;
    robust_min: number;
    robust_max: number;
    area: number | null;
};
type SliceScale = {
    volScale: number[];
    vox: number[];
    longestAxis: number;
    dimsMM: vec3;
};
type MvpMatrix2D = {
    modelViewProjectionMatrix: mat4;
    modelMatrix: mat4;
    normalMatrix: mat4;
    leftTopMM: number[];
    fovMM: number[];
};
type MM = {
    mnMM: vec3;
    mxMM: vec3;
    rotation: mat4;
    fovMM: vec3;
};
type UIData = {
    mousedown: boolean;
    touchdown: boolean;
    mouseButtonLeftDown: boolean;
    mouseButtonCenterDown: boolean;
    mouseButtonRightDown: boolean;
    mouseDepthPicker: boolean;
    clickedTile: number;
    pan2DxyzmmAtMouseDown: vec4;
    prevX: number;
    prevY: number;
    currX: number;
    currY: number;
    currentTouchTime: number;
    lastTouchTime: number;
    touchTimer: NodeJS.Timeout | null;
    doubleTouch: boolean;
    isDragging: boolean;
    dragStart: number[];
    dragEnd: number[];
    dragClipPlaneStartDepthAziElev: number[];
    lastTwoTouchDistance: number;
    multiTouchGesture: boolean;
    dpr?: number;
    max2D?: number;
    max3D?: number;
    windowX: number;
    windowY: number;
    angleFirstLine: number[];
    angleState: 'none' | 'drawing_first_line' | 'drawing_second_line' | 'complete';
};
type SaveImageOptions = {
    filename: string;
    isSaveDrawing: boolean;
    volumeByIndex: number;
};
type DicomLoaderInput = ArrayBuffer | ArrayBuffer[] | File[];
type DicomLoader = {
    loader: (data: DicomLoaderInput) => Promise<Array<{
        name: string;
        data: ArrayBuffer;
    }>>;
    toExt: string;
};
/**
 * Niivue can be attached to a canvas. An instance of Niivue contains methods for
 * loading and rendering NIFTI image data in a WebGL 2.0 context.
 *
 * @example
 * let niivue = new Niivue({crosshairColor: [0,1,0,0.5], textHeight: 0.5}) // a see-through green crosshair, and larger text labels
 */
declare class Niivue {
    loaders: {};
    dicomLoader: DicomLoader | null;
    canvas: HTMLCanvasElement | null;
    _gl: WebGL2RenderingContext | null;
    isBusy: boolean;
    needsRefresh: boolean;
    colormapTexture: WebGLTexture | null;
    colormapLists: ColormapListEntry[];
    volumeTexture: WebGLTexture | null;
    gradientTexture: WebGLTexture | null;
    gradientTextureAmount: number;
    useCustomGradientTexture: boolean;
    renderGradientValues: boolean;
    drawTexture: WebGLTexture | null;
    drawUndoBitmaps: Uint8Array[];
    drawLut: LUT;
    drawOpacity: number;
    clickToSegmentIsGrowing: boolean;
    clickToSegmentGrowingBitmap: Uint8Array | null;
    clickToSegmentXY: number[];
    renderDrawAmbientOcclusion: number;
    colorbarHeight: number;
    drawPenLocation: number[];
    drawPenAxCorSag: number;
    drawFillOverwrites: boolean;
    drawPenFillPts: number[][];
    overlayTexture: WebGLTexture | null;
    overlayTextureID: WebGLTexture | null;
    sliceMMShader?: Shader;
    slice2DShader?: Shader;
    sliceV1Shader?: Shader;
    orientCubeShader?: Shader;
    orientCubeShaderVAO: WebGLVertexArrayObject | null;
    rectShader?: Shader;
    rectOutlineShader?: Shader;
    renderShader?: Shader;
    lineShader?: Shader;
    line3DShader?: Shader;
    passThroughShader?: Shader;
    renderGradientShader?: Shader;
    renderGradientValuesShader?: Shader;
    renderSliceShader?: Shader;
    renderVolumeShader?: Shader;
    pickingMeshShader?: Shader;
    pickingImageShader?: Shader;
    colorbarShader?: Shader;
    customSliceShader: Shader | null;
    fontShader: Shader | null;
    fiberShader?: Shader;
    fontTexture: WebGLTexture | null;
    circleShader?: Shader;
    matCapTexture: WebGLTexture | null;
    bmpShader: Shader | null;
    bmpTexture: WebGLTexture | null;
    thumbnailVisible: boolean;
    bmpTextureWH: number;
    growCutShader?: Shader;
    orientShaderAtlasU: Shader | null;
    orientShaderAtlasI: Shader | null;
    orientShaderU: Shader | null;
    orientShaderI: Shader | null;
    orientShaderF: Shader | null;
    orientShaderRGBU: Shader | null;
    orientShaderSPARQ: Shader | null;
    surfaceShader: Shader | null;
    blurShader: Shader | null;
    sobelBlurShader: Shader | null;
    sobelFirstOrderShader: Shader | null;
    sobelSecondOrderShader: Shader | null;
    genericVAO: WebGLVertexArrayObject | null;
    unusedVAO: any;
    crosshairs3D: NiivueObject3D | null;
    private DEFAULT_FONT_GLYPH_SHEET;
    private DEFAULT_FONT_METRICS;
    private fontMetrics?;
    private fontMets;
    private fontPx;
    private legendFontScaling;
    backgroundMasksOverlays: number;
    overlayOutlineWidth: number;
    overlayAlphaShader: number;
    position?: vec3;
    extentsMin?: vec3;
    extentsMax?: vec3;
    private resizeObserver;
    private resizeEventListener;
    private canvasObserver;
    syncOpts: SyncOpts;
    readyForSync: boolean;
    uiData: UIData;
    back: NVImage | null;
    overlays: NVImage[];
    deferredVolumes: ImageFromUrlOptions[];
    deferredMeshes: LoadFromUrlParams[];
    furthestVertexFromOrigin: number;
    volScale: number[];
    vox: number[];
    mousePos: number[];
    screenSlices: Array<{
        leftTopWidthHeight: number[];
        axCorSag: SLICE_TYPE;
        sliceFrac: number;
        AxyzMxy: number[];
        leftTopMM: number[];
        fovMM: number[];
        screen2frac?: number[];
    }>;
    cuboidVertexBuffer?: WebGLBuffer;
    otherNV: Niivue[] | null;
    volumeObject3D: NiivueObject3D | null;
    pivot3D: number[];
    furthestFromPivot: number;
    currentClipPlaneIndex: number;
    lastCalled: number;
    selectedObjectId: number;
    CLIP_PLANE_ID: number;
    VOLUME_ID: number;
    DISTANCE_FROM_CAMERA: number;
    graph: Graph;
    customLayout: Array<{
        sliceType: SLICE_TYPE;
        position: [number, number, number, number];
        sliceMM?: number;
    }>;
    meshShaders: Array<{
        Name: string;
        Frag: string;
        shader?: Shader;
    }>;
    dragModes: {
        contrast: DRAG_MODE;
        measurement: DRAG_MODE;
        angle: DRAG_MODE;
        none: DRAG_MODE;
        pan: DRAG_MODE;
        slicer3D: DRAG_MODE;
        callbackOnly: DRAG_MODE;
    };
    sliceTypeAxial: SLICE_TYPE;
    sliceTypeCoronal: SLICE_TYPE;
    sliceTypeSagittal: SLICE_TYPE;
    sliceTypeMultiplanar: SLICE_TYPE;
    sliceTypeRender: SLICE_TYPE;
    /**
     * callback function to run when the right mouse button is released after dragging
     * @example
     * niivue.onDragRelease = () => {
     *   console.log('drag ended')
     * }
     */
    onDragRelease: (params: DragReleaseParams) => void;
    /**
     * callback function to run when the left mouse button is released
     * @example
     * niivue.onMouseUp = () => {
     *   console.log('mouse up')
     * }
     */
    onMouseUp: (data: Partial<UIData>) => void;
    /**
     * callback function to run when the crosshair location changes
     * @example
     * niivue.onLocationChange = (data) => {
     * console.log('location changed')
     * console.log('mm: ', data.mm)
     * console.log('vox: ', data.vox)
     * console.log('frac: ', data.frac)
     * console.log('values: ', data.values)
     * }
     */
    onLocationChange: (location: unknown) => void;
    /**
     * callback function to run when the user changes the intensity range with the selection box action (right click)
     * @example
     * niivue.onIntensityChange = (volume) => {
     * console.log('intensity changed')
     * console.log('volume: ', volume)
     * }
     */
    onIntensityChange: (volume: NVImage) => void;
    /**
     * callback function when clickToSegment is enabled and the user clicks on the image. data contains the volume of the segmented region in mm3 and mL
     * @example
     * niivue.onClickToSegment = (data) => {
     * console.log('clicked to segment')
     * console.log('volume mm3: ', data.mm3)
     * console.log('volume mL: ', data.mL)
     * }
     */
    onClickToSegment: (data: {
        mm3: number;
        mL: number;
    }) => void;
    /**
     * callback function to run when a new volume is loaded
     * @example
     * niivue.onImageLoaded = (volume) => {
     * console.log('volume loaded')
     * console.log('volume: ', volume)
     * }
     */
    onImageLoaded: (volume: NVImage) => void;
    /**
     * callback function to run when a new mesh is loaded
     * @example
     * niivue.onMeshLoaded = (mesh) => {
     * console.log('mesh loaded')
     * console.log('mesh: ', mesh)
     * }
     */
    onMeshLoaded: (mesh: NVMesh) => void;
    /**
     * callback function to run when the user changes the volume when a 4D image is loaded
     * @example
     * niivue.onFrameChange = (volume, frameNumber) => {
     * console.log('frame changed')
     * console.log('volume: ', volume)
     * console.log('frameNumber: ', frameNumber)
     * }
     */
    onFrameChange: (volume: NVImage, index: number) => void;
    /**
     * callback function to run when niivue reports an error
     * @example
     * niivue.onError = (error) => {
     * console.log('error: ', error)
     * }
     */
    onError: () => void;
    onColormapChange: () => void;
    /**
     * callback function to run when niivue reports detailed info
     * @example
     * niivue.onInfo = (info) => {
     * console.log('info: ', info)
     * }
     */
    onInfo: () => void;
    /**
     * callback function to run when niivue reports a warning
     * @example
     * niivue.onWarn = (warn) => {
     * console.log('warn: ', warn)
     * }
     */
    onWarn: () => void;
    /**
     * callback function to run when niivue reports a debug message
     * @example
     * niivue.onDebug = (debug) => {
     * console.log('debug: ', debug)
     * }
     */
    onDebug: () => void;
    /**
     * callback function to run when a volume is added from a url
     * @example
     * niivue.onVolumeAddedFromUrl = (imageOptions, volume) => {
     * console.log('volume added from url')
     * console.log('imageOptions: ', imageOptions)
     * console.log('volume: ', volume)
     * }
     */
    onVolumeAddedFromUrl: (imageOptions: ImageFromUrlOptions, volume: NVImage) => void;
    onVolumeWithUrlRemoved: (url: string) => void;
    /**
     * callback function to run when updateGLVolume is called (most users will not need to use
     * @example
     * niivue.onVolumeUpdated = () => {
     * console.log('volume updated')
     * }
     */
    onVolumeUpdated: () => void;
    /**
     * callback function to run when a mesh is added from a url
     * @example
     * niivue.onMeshAddedFromUrl = (meshOptions, mesh) => {
     * console.log('mesh added from url')
     * console.log('meshOptions: ', meshOptions)
     * console.log('mesh: ', mesh)
     * }
     */
    onMeshAddedFromUrl: (meshOptions: LoadFromUrlParams, mesh: NVMesh) => void;
    onMeshAdded: () => void;
    onMeshWithUrlRemoved: (url: string) => void;
    onZoom3DChange: (zoom: number) => void;
    /**
     * callback function to run when the user changes the rotation of the 3D rendering
     * @example
     * niivue.onAzimuthElevationChange = (azimuth, elevation) => {
     * console.log('azimuth: ', azimuth)
     * console.log('elevation: ', elevation)
     * }
     */
    onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
    /**
     * callback function to run when the user changes the clip plane
     * @example
     * niivue.onClipPlaneChange = (clipPlane) => {
     * console.log('clipPlane: ', clipPlane)
     * }
     */
    onClipPlaneChange: (clipPlane: number[]) => void;
    onCustomMeshShaderAdded: (fragmentShaderText: string, name: string) => void;
    onMeshShaderChanged: (meshIndex: number, shaderIndex: number) => void;
    onMeshPropertyChanged: (meshIndex: number, key: string, val: unknown) => void;
    onDicomLoaderFinishedWithImages: (files: NVImage[] | NVMesh[]) => void;
    /**
     * callback function to run when the user loads a new NiiVue document
     * @example
     * niivue.onDocumentLoaded = (document) => {
     * console.log('document: ', document)
     * }
     */
    onDocumentLoaded: (document: NVDocument) => void;
    /**
     * Callback for when any configuration option changes.
     * @param propertyName - The name of the option that changed.
     * @param newValue - The new value of the option.
     * @param oldValue - The previous value of the option.
     */
    onOptsChange: (propertyName: keyof NVConfigOptions, newValue: NVConfigOptions[keyof NVConfigOptions], oldValue: NVConfigOptions[keyof NVConfigOptions]) => void;
    document: NVDocument;
    /** Get the current scene configuration. */
    get scene(): Scene;
    /** Get the current visualization options. */
    get opts(): NVConfigOptions;
    /** Get the slice mosaic layout string. */
    get sliceMosaicString(): string;
    /** Set the slice mosaic layout string. */
    set sliceMosaicString(newSliceMosaicString: string);
    /**
     * Get whether voxels below minimum intensity are drawn as dark or transparent.
     * @returns {boolean} True if dark voxels are opaque, false if transparent.
     */
    get isAlphaClipDark(): boolean;
    /**
     * Set whether voxels below minimum intensity are drawn as dark or transparent.
     * @param {boolean} newVal - True to make dark voxels opaque, false for transparent.
     * @see {@link https://niivue.com/demos/features/segment.html | live demo usage}
     */
    set isAlphaClipDark(newVal: boolean);
    mediaUrlMap: Map<NVImage | NVMesh, string>;
    initialized: boolean;
    currentDrawUndoBitmap: number;
    /**
     * @param options  - options object to set modifiable Niivue properties
     */
    constructor(options?: Partial<NVConfigOptions>);
    /**
     * Clean up event listeners and observers
     * Call this when the Niivue instance is no longer needed.
     * This will be called when the canvas is detached from the DOM
     * @example niivue.cleanup();
     */
    cleanup(): void;
    get volumes(): NVImage[];
    set volumes(volumes: NVImage[]);
    get meshes(): NVMesh[];
    set meshes(meshes: NVMesh[]);
    get drawBitmap(): Uint8Array | null;
    set drawBitmap(drawBitmap: Uint8Array | null);
    get volScaleMultiplier(): number;
    set volScaleMultiplier(scale: number);
    /**
     * save webgl2 canvas as png format bitmap
     * @param filename - filename for screen capture
     * @example niivue.saveScene('test.png');
     * @see {@link https://niivue.com/demos/features/ui.html | live demo usage}
     */
    saveScene(filename?: string): Promise<void>;
    /**
     * attach the Niivue instance to the webgl2 canvas by element id
     * @param id - the id of an html canvas element
     * @param isAntiAlias - determines if anti-aliasing is requested (if not specified, AA usage depends on hardware)
     * @example niivue = new Niivue().attachTo('gl')
     * @example await niivue.attachTo('gl')
     * @see {@link https://niivue.com/demos/features/basic.multiplanar.html | live demo usage}
     */
    attachTo(id: string, isAntiAlias?: any): Promise<this>;
    /**
     * attach the Niivue instance to a canvas element directly
     * @param canvas - the canvas element reference
     * @example
     * niivue = new Niivue()
     * await niivue.attachToCanvas(document.getElementById(id))
     * @see {@link https://niivue.com/demos/features/dsistudio.html | live demo usage}
     */
    attachToCanvas(canvas: HTMLCanvasElement, isAntiAlias?: boolean | null): Promise<this>;
    /**
     * Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to another. useful for using one canvas to drive another.
     * @param otherNV - the other Niivue instance that is the main controller
     * @example
     * niivue1 = new Niivue()
     * niivue2 = new Niivue()
     * niivue2.syncWith(niivue1)
     * @deprecated use broadcastTo instead
     * @see {@link https://niivue.com/demos/features/sync.mesh.html | live demo usage}
     */
    syncWith(otherNV: Niivue | Niivue[], syncOpts?: {
        '2d': boolean;
        '3d': boolean;
    }): void;
    /**
     * Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to others. useful for using one canvas to drive another.
     * @param otherNV - the other Niivue instance(s)
     * @example
     * niivue1 = new Niivue()
     * niivue2 = new Niivue()
     * niivue3 = new Niivue()
     * niivue1.broadcastTo(niivue2)
     * niivue1.broadcastTo([niivue2, niivue3])
     * @see {@link https://niivue.com/demos/features/sync.mesh.html | live demo usage}
     */
    broadcastTo(otherNV: Niivue | Niivue[], syncOpts?: {
        '2d': boolean;
        '3d': boolean;
    }): void;
    /**
     * Synchronizes 3D view settings (azimuth, elevation, scale) with another Niivue instance.
     * @internal
     */
    doSync3d(otherNV: Niivue): void;
    /**
     * Synchronizes 2D crosshair position and pan settings with another Niivue instance.
     * @internal
     */
    doSync2d(otherNV: Niivue): void;
    doSyncGamma(otherNV: Niivue): void;
    /**
     * Synchronizes gamma correction setting with another Niivue instance.
     * @internal
     */
    doSyncZoomPan(otherNV: Niivue): void;
    /**
     * Synchronizes crosshair position with another Niivue instance.
     * @internal
     */
    doSyncCrosshair(otherNV: Niivue): void;
    /**
     * Synchronizes cal_min with another Niivue instance, updating GPU volume only if needed.
     * @internal
     */
    doSyncCalMin(otherNV: Niivue): void;
    /**
     * Synchronizes cal_max with another Niivue instance, updating GPU volume only if needed.
     * @internal
     */
    doSyncCalMax(otherNV: Niivue): void;
    /**
     * Synchronizes slice view type with another Niivue instance.
     * @internal
     */
    doSyncSliceType(otherNV: Niivue): void;
    /**
     * Synchronizes clip plane settings with another Niivue instance.
     * @internal
     */
    doSyncClipPlane(otherNV: Niivue): void;
    /**
     * Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to another. useful for using one canvas to drive another.
     * @internal
     * @example
     * niivue1 = new Niivue()
     * niivue2 = new Niivue()
     * niivue2.syncWith(niivue1)
     * niivue2.sync()
     */
    sync(): void;
    /** Not documented publicly for now
     * @internal
     * test if two arrays have equal values for each element
     * @param a - the first array
     * @param b - the second array
     * @example Niivue.arrayEquals(a, b)
     *
     * TODO this should maybe just use array-equal from NPM
     */
    arrayEquals(a: unknown[], b: unknown[]): boolean;
    /**
     * @internal
     * Compute point size for screen text that scales with resolution and screen size.
     * - Keeps physical font size consistent across different DPIs.
     * - Uses fontSizeScaling to scale with canvas size above a reference threshold.
     */
    textSizePoints(): void;
    /**
     * callback function to handle resize window events, redraws the scene.
     * @internal
     */
    resizeListener(): void;
    /**
     * callback to handle mouse move events relative to the canvas
     * @internal
     * @returns the mouse position relative to the canvas
     */
    getRelativeMousePosition(event: MouseEvent, target?: EventTarget | null): {
        x: number;
        y: number;
    } | undefined;
    /**
     * Returns mouse position relative to the canvas, excluding padding and borders.
     * @internal
     */
    getNoPaddingNoBorderCanvasRelativeMousePosition(event: MouseEvent, target: EventTarget): {
        x: number;
        y: number;
    } | undefined;
    /**
     * Disables the default context menu to allow custom right-click behavior.
     * @internal
     */
    mouseContextMenuListener(e: MouseEvent): void;
    /**
     * Handles mouse down events for interaction, segmentation, and connectome label selection.
     * Routes to appropriate button handler based on click type.
     * @internal
     */
    mouseDownListener(e: MouseEvent): void;
    /**
     * Handles left mouse button actions for crosshair or windowing mode.
     * @internal
     */
    mouseLeftButtonHandler(e: MouseEvent): void;
    /**
     * Handles center mouse button drag to initiate 2D panning or clip plane adjustment.
     * @internal
     */
    mouseCenterButtonHandler(e: MouseEvent): void;
    /**
     * Handles right mouse button drag to enable 2D panning or clip plane control.
     * @internal
     */
    mouseRightButtonHandler(e: MouseEvent): void;
    /**
     * calculate the the min and max voxel indices from an array of two values (used in selecting intensities with the selection box)
     * @internal
     * @param array - an array of two values
     * @returns an array of two values representing the min and max voxel indices
     */
    calculateMinMaxVoxIdx(array: number[]): number[];
    /**
     * Updates cal_min and cal_max based on intensity range within the drag-selected voxel region.
     * Skips if no drag occurred, volume is missing, or selection has no variation.
     * @internal
     */
    calculateNewRange({ volIdx }?: {
        volIdx?: number;
    }): void;
    /**
     * Triggers a drag-release callback with voxel, mm, and tile info from the drag gesture.
     * @internal
     */
    generateMouseUpCallback(fracStart: vec3, fracEnd: vec3): void;
    /**
     * Handles mouse up events, finalizing drag actions, invoking callbacks, and updating contrast if needed.
     * @internal
     */
    mouseUpListener(): void;
    /**
     * Handles initial touch event to simulate mouse click if not in a multi-touch gesture.
     * @internal
     */
    checkMultitouch(e: TouchEvent): void;
    /**
     * Handles touch start events, detecting double taps and preparing for gesture or contrast reset.
     * @internal
     */
    touchStartListener(e: TouchEvent): void;
    /**
     * Handles touch end events, finalizing gestures and contrast adjustments, then triggers mouse up logic.
     * @internal
     */
    touchEndListener(e: TouchEvent): void;
    /**
     * Adjusts window/level (cal_min and cal_max) based on mouse or touch drag direction.
     * @internal
     */
    windowingHandler(x: number, y: number, volIdx?: number): void;
    /**
     * Handles mouse leaving the canvas, resetting segmentation, drawing, and drag states.
     * @internal
     */
    mouseLeaveListener(): void;
    /**
     * Handles mouse move events for dragging, crosshair movement, windowing, and click-to-segment preview.
     * @internal
     */
    mouseMoveListener(e: MouseEvent): void;
    /**
     * Resets brightness and contrast to robust min/max unless in render mode or during interaction.
     * @internal
     */
    resetBriCon(msg?: TouchEvent | MouseEvent | null): void;
    /**
     * Sets the drag start position in canvas coordinates.
     * @internal
     */
    setDragStart(x: number, y: number): void;
    /**
     * Sets the drag end position in canvas coordinates.
     * @internal
     */
    setDragEnd(x: number, y: number): void;
    /**
     * Handles touch movement for crosshair, windowing, and pinch-to-zoom interactions.
     * @internal
     */
    touchMoveListener(e: TouchEvent): void;
    /**
     * Handles pinch-to-zoom gestures for scrolling 2D slices.
     * @internal
     */
    handlePinchZoom(e: TouchEvent): void;
    /**
     * Handles keyboard shortcuts for toggling clip planes and slice view modes with debounce logic.
     * @internal
     */
    keyUpListener(e: KeyboardEvent): void;
    /**
     * Handles key down events for navigation, rendering controls, slice movement, and mode switching.
     * @internal
     */
    keyDownListener(e: KeyboardEvent): void;
    /**
     * Handles scroll wheel events for slice scrolling, ROI box resizing, zooming, or segmentation thresholding.
     * @internal
     */
    wheelListener(e: WheelEvent): void;
    /**
     * Registers all mouse, touch, keyboard, and drag event listeners for canvas interaction.
     * n.b. any event listeners registered here should also be removed in `cleanup()`
     * @internal
     */
    registerInteractions(): void;
    /**
     * Prevents default behavior when a dragged item enters the canvas.
     * @internal
     */
    dragEnterListener(e: MouseEvent): void;
    /**
     * Prevents default behavior when a dragged item is over the canvas.
     * @internal
     */
    dragOverListener(e: MouseEvent): void;
    /**
     * Extracts and normalizes the file extension, handling special cases like .gz and .cbor.
     * @internal
     */
    getFileExt(fullname: string, upperCase?: boolean): string;
    /**
     * Add an image and notify subscribers
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    addVolumeFromUrl(imageOptions: ImageFromUrlOptions): Promise<NVImage>;
    addVolumesFromUrl(imageOptionsArray: ImageFromUrlOptions[]): Promise<NVImage[]>;
    /**
     * Returns the media object associated with the given URL, if any.
     * @internal
     */
    getMediaByUrl(url: string): NVImage | NVMesh | undefined;
    /**
     * Remove volume by url
     * @param url - Volume added by url to remove
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    removeVolumeByUrl(url: string): void;
    /**
     * Recursively traverses a file tree, populating file paths for directory uploads.
     * Adds `_webkitRelativePath` to each file for compatibility with tools like dcm2niix.
     * @internal
     */
    traverseFileTree(item: any, path: string, fileArray: any): Promise<File[]>;
    /**
     * Recursively reads a directory and logs the File objects contained within.
     * Used for processing dropped folders via drag-and-drop.
     * @internal
     */
    readDirectory(directory: FileSystemDirectoryEntry): FileSystemEntry[];
    /**
     * Returns boolean: true if filename ends with mesh extension (TRK, pial, etc)
     * @param url - filename
     * @internal
     */
    isMeshExt(url: string): boolean;
    /**
     * Load an image or mesh from an array buffer
     * @param buffer - ArrayBuffer with the entire contents of a mesh or volume
     * @param name - string of filename, extension used to infer type (NIfTI, MGH, MZ3, etc)
     * @see {@link http://192.168.0.150:8080/features/draganddrop.html | live demo usage}
     */
    loadFromArrayBuffer(buffer: ArrayBuffer, name: string): Promise<void>;
    /**
     * Load a mesh or image volume from a File object
     * @param file - File object selected by the user (e.g. from an HTML input element)
     * @returns a Promise that resolves when the file has been loaded and added to the scene
     * @see {@link https://niivue.com/demos/features/selectfont.html | live demo usage}
     */
    loadFromFile(file: File): Promise<void>;
    /**
     * Registers a custom external file loader for handling specific file types in Niivue.
     *
     * This method allows you to define how certain file extensions are handled when loaded into Niivue.
     * The provided `loader` function should return an object containing an `ArrayBuffer` of the file's contents
     * and the file extension (used for inferring how Niivue should process the data).
     *
     * Optionally, `positions` and `indices` can be returned to support loading mesh data (e.g. `.mz3` format).
     *
     * @example
     * const myCustomLoader = async (file) => {
     *   const arrayBuffer = await file.arrayBuffer()
     *   return {
     *     arrayBuffer,
     *     fileExt: 'iwi.cbor',
     *     positions: new Float32Array(...),
     *     indices: new Uint32Array(...)
     *   }
     * }
     *
     * nv.useLoader(myCustomLoader, 'iwi.cbor', 'nii')
     *
     * @param loader - A function that accepts a `File` or `ArrayBuffer` and returns an object with `arrayBuffer` and `fileExt` properties. May also return `positions` and `indices` for meshes.
     * @param fileExt - The original file extension (e.g. 'iwi.cbor') to associate with this loader.
     * @param toExt - The target file extension Niivue should treat the file as (e.g. 'nii' or 'mz3').
     */
    useLoader(loader: unknown, fileExt: string, toExt: string): void;
    /**
     * Set a custom loader for handling DICOM files.
     */
    useDicomLoader(loader: DicomLoader): void;
    /**
     * Get the currently assigned DICOM loader.
     */
    getDicomLoader(): DicomLoader;
    /**
     * Handles file and URL drag-and-drop events on the canvas.
     * Supports loading of volumes, meshes, NVD documents, and DICOM directories.
     * Honors modifier keys (e.g., Shift to replace, Alt for drawing overlays).
     * @internal
     */
    dropListener(e: DragEvent): Promise<void>;
    /**
     * insert a gap between slices of a mutliplanar view.
     * @param pixels - spacing between tiles of multiplanar view
     * @example niivue.setMultiplanarPadPixels(4)
     * @see {@link https://niivue.com/demos/features/atlas.html | live demo usage}
     */
    setMultiplanarPadPixels(pixels: number): void;
    /**
     * control placement of 2D slices.
     * @param layout - AUTO: 0, COLUMN: 1, GRID: 2, ROW: 3,
     * @example niivue.setMultiplanarLayout(2)
     * @see {@link https://niivue.com/demos/features/layout.html | live demo usage}
     */
    setMultiplanarLayout(layout: number): void;
    /**
     * determine if text appears at corner (true) or sides of 2D slice.
     * @param isCornerOrientationText - controls position of text
     * @example niivue.setCornerOrientationText(true)
     * @see {@link https://niivue.com/demos/features/worldspace2.html | live demo usage}
     */
    setCornerOrientationText(isCornerOrientationText: boolean): void;
    /**
     * Show or hide orientation labels (e.g., L/R, A/P) in 2D slice views
     * @param isOrientationTextVisible - whether orientation text should be displayed
     * @example niivue.setIsOrientationTextVisible(false)
     * @see {@link https://niivue.com/demos/features/basic.multiplanar.html | live demo usage}
     */
    setIsOrientationTextVisible(isOrientationTextVisible: boolean): void;
    /**
     * determine proportion of screen real estate devoted to rendering in multiplanar view.
     * @param fraction - proportion of screen devoted to primary (hero) image (0 to disable)
     * @example niivue.setHeroImage(0.5)
     * @see {@link https://niivue.com/demos/features/layout.html | live demo usage}
     */
    setHeroImage(fraction: number): void;
    /**
     * Set a custom slice layout. This overrides the built-in layouts.
     * @param layout - Array of layout specifications for each slice view
     * @example
     * niivue.setCustomLayout([
     *     // Left 50% - Sag
     *     {sliceType: 2, position: [0, 0, 0.5, 1.0]},
     *     // Top right - Cor
     *     {sliceType: 1, position: [0.5, 0, 0.5, 0.5]},
     *     // Bottom right - Ax
     *     {sliceType: 0, position: [0.5, 0.5, 0.5, 0.5]}
     *   ])
     *
     * produces:
     * +----------------+----------------+
     * |                |                |
     * |                |     coronal    |
     * |                |                |
     * |                |                |
     * |   sagittal     +----------------+
     * |                |                |
     * |                |     axial      |
     * |                |                |
     * |                |                |
     * +----------------+----------------+
     */
    setCustomLayout(layout: Array<{
        sliceType: SLICE_TYPE;
        position: [number, number, number, number];
        sliceMM?: number;
    }>): void;
    /**
     * Clear custom layout and rely on built-in layouts
     */
    clearCustomLayout(): void;
    /**
     * Get the current custom layout if set
     * @returns The current custom layout or null if using built-in layouts
     */
    getCustomLayout(): Array<{
        sliceType: SLICE_TYPE;
        position: [number, number, number, number];
        sliceMM?: number;
    }> | null;
    /**
     * control whether 2D slices use radiological or neurological convention.
     * @param isRadiologicalConvention - new display convention
     * @example niivue.setRadiologicalConvention(true)
     * @see {@link https://niivue.com/demos/features/worldspace.html | live demo usage}
     */
    setRadiologicalConvention(isRadiologicalConvention: boolean): void;
    /**
     * Reset scene to default settings.
     * @param options - @see NiiVueOptions
     * @param resetBriCon - also reset contrast (default false).
     * @example niivue.nv1.setDefaults(opts, true);
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    setDefaults(options?: Partial<NVConfigOptions>, resetBriCon?: boolean): void;
    /**
     * Limit visibility of mesh in front of a 2D image. Requires world-space mode.
     * @param meshThicknessOn2D - distance from voxels for clipping mesh. Use Infinity to show entire mesh or 0.0 to hide mesh.
     * @example niivue.setMeshThicknessOn2D(42)
     * @see {@link https://niivue.com/demos/features/worldspace2.html | live demo usage}
     */
    setMeshThicknessOn2D(meshThicknessOn2D: number): void;
    /**
     * Create a custom multi-slice mosaic (aka lightbox, montage) view.
     * @param str - description of mosaic.
     * @example niivue.setSliceMosaicString("A 0 20 C 30 S 42")
     * @see {@link https://niivue.com/demos/features/mosaics.html | live demo usage}
     */
    setSliceMosaicString(str: string): void;
    /**
     * control 2D slice view mode.
     * @param isSliceMM - control whether 2D slices use world space (true) or voxel space (false). Beware that voxel space mode limits properties like panning, zooming and mesh visibility.
     * @example niivue.setSliceMM(true)
     * @see {@link https://niivue.com/demos/features/worldspace2.html | live demo usage}
     */
    setSliceMM(isSliceMM: boolean): void;
    /**
     * control whether voxel overlays are combined using additive (emission) or traditional (transmission) blending.
     * @param isAdditiveBlend - emission (true) or transmission (false) mixing
     * @example niivue.isAdditiveBlend(true)
     * @see {@link https://niivue.com/demos/features/additive.voxels.html | live demo usage}
     */
    setAdditiveBlend(isAdditiveBlend: boolean): void;
    /**
     * Detect if display is using radiological or neurological convention.
     * @returns radiological convention status
     * @example let rc = niivue.getRadiologicalConvention()
     */
    getRadiologicalConvention(): boolean;
    /**
     * Force WebGL canvas to use high resolution display, regardless of browser defaults.
     * @param forceDevicePixelRatio - -1: block high DPI; 0= allow high DPI: >0 use specified pixel ratio
     * @example niivue.setHighResolutionCapable(true);
     * @see {@link https://niivue.com/demos/features/sync.mesh.html | live demo usage}
     */
    setHighResolutionCapable(forceDevicePixelRatio: number | boolean): void;
    /**
     * Start watching for changes to configuration options.
     * This is a convenience method that sets up the onOptsChange callback.
     * @param callback - Function to call when any option changes
     * @example
     * niivue.watchOptsChanges((propertyName, newValue, oldValue) => {
     *   console.log(`Option ${propertyName} changed from ${oldValue} to ${newValue}`)
     * })
     * @see {@link https://niivue.com/demos/ | live demo usage}
     */
    watchOptsChanges(callback: (propertyName: keyof NVConfigOptions, newValue: NVConfigOptions[keyof NVConfigOptions], oldValue: NVConfigOptions[keyof NVConfigOptions]) => void): void;
    /**
     * Stop watching for changes to configuration options.
     * This removes the current onOptsChange callback.
     * @example niivue.unwatchOptsChanges()
     * @see {@link https://niivue.com/demos/ | live demo usage}
     */
    unwatchOptsChanges(): void;
    /**
     * add a new volume to the canvas
     * @param volume - the new volume to add to the canvas
     * @example
     * niivue = new Niivue()
     * niivue.addVolume(NVImage.loadFromUrl({url:'../someURL.nii.gz'}))
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */
    addVolume(volume: NVImage): void;
    /**
     * add a new mesh to the canvas
     * @param mesh - the new mesh to add to the canvas
     * @example
     * niivue = new Niivue()
     * niivue.addMesh(NVMesh.loadFromUrl({url:'../someURL.gii'}))
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    addMesh(mesh: NVMesh): void;
    /**
     * get the index of a volume by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.
     * @param id - the id string to search for
     * @example
     * niivue = new Niivue()
     * niivue.getVolumeIndexByID(someVolume.id)
     */
    getVolumeIndexByID(id: string): number;
    /**
     * Saves the current drawing state as an RLE-compressed bitmap for undo history.
     * Uses a circular buffer to limit undo memory usage.
     * @internal
     */
    drawAddUndoBitmap(): void;
    /**
     * Clears all stored drawing undo bitmaps and resets the undo index.
     * @internal
     */
    drawClearAllUndoBitmaps(): void;
    /**
     * Restore drawing to previous state
     * @example niivue.drawUndo();
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    drawUndo(): void;
    /**
     * Loads a drawing overlay and aligns it with the current background image.
     * Converts the input image to match the background's orientation and stores it as a drawable bitmap.
     * Initializes the undo history and prepares the drawing texture.
     *
     * @param drawingBitmap - A `NVImage` object representing the drawing to load. Must match the dimensions of the background image.
     * @returns `true` if the drawing was successfully loaded and aligned; `false` if dimensions are incompatible.
     */
    loadDrawing(drawingBitmap: NVImage): boolean;
    /**
     * Binarize a volume by converting all non-zero voxels to 1
     * @param volume - the image volume to modify in place
     * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
     */
    binarize(volume: NVImage): void;
    /**
     * Open drawing
     * @param fnm - filename of NIfTI format drawing
     * @param isBinarize - if true will force drawing voxels to be either 0 or 1.
     * @example niivue.loadDrawingFromUrl("../images/lesion.nii.gz");
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    loadDrawingFromUrl(fnm: string, isBinarize?: boolean): Promise<boolean>;
    /**
     * Computes one or more Otsu threshold levels for the primary volume.
     * Returns raw intensity values corresponding to bin-based thresholds.
     * @internal
     */
    findOtsu(mlevel?: number): number[];
    /**
     * remove dark voxels in air
     * @param levels - (2-4) segment brain into this many types. For example drawOtsu(2) will create a binary drawing where bright voxels are colored and dark voxels are clear.
     * @example niivue.drawOtsu(3);
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    drawOtsu(levels?: number): void;
    /**
     * remove dark voxels in air
     * @param level - (1-5) larger values for more preserved voxels
     * @param volIndex - volume to dehaze
     * @example niivue.removeHaze(3, 0);
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    removeHaze(level?: number, volIndex?: number): void;
    /**
     * Save voxel-based image to disk.
     *
     * @param options - configuration object with the following fields:
     *   - `filename`: name of the NIfTI image to create
     *   - `isSaveDrawing`: whether to save the drawing layer or the background image
     *   - `volumeByIndex`: which image layer to save (0 for background)
     * @returns `true` if successful when writing to disk, or a `Uint8Array` if exported as binary data
     *
     * @example
     * niivue.saveImage({ filename: "myimage.nii.gz", isSaveDrawing: true });
     * niivue.saveImage({ filename: "myimage.nii.gz", isSaveDrawing: true });
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    saveImage(options?: SaveImageOptions): Promise<boolean | Uint8Array>;
    /**
     * Returns the index of a mesh given its ID or index.
     *
     * @param id - The mesh ID as a string, or an index number.
     * @returns The mesh index, or -1 if not found or out of range.
     */
    getMeshIndexByID(id: string | number): number;
    /**
     * change property of mesh, tractogram or connectome
     * @param id - identity of mesh to change
     * @param key - attribute to change
     * @param val - for attribute
     * @example niivue.setMeshProperty(niivue.meshes[0].id, 'fiberLength', 42)
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    setMeshProperty(id: number, key: keyof NVMesh, val: number | string | boolean | Uint8Array | number[] | ColorMap | LegacyConnectome | Float32Array): void;
    /**
     * returns the index of the mesh vertex that is closest to the provided coordinates
     * @param mesh - identity of mesh to change
     * @param Xmm - location in left/right dimension
     * @param Ymm - location in posterior/anterior dimension
     * @param Zmm - location in foot/head dimension
     * @returns the an array where ret[0] is the mesh index and ret[1] is distance from vertex to coordinates
     * @example niivue.indexNearestXYZmm(niivue.meshes[0].id, -22, 42, 13)
     * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
     */
    indexNearestXYZmm(mesh: number, Xmm: number, Ymm: number, Zmm: number): number[];
    /**
     * reduce complexity of FreeSurfer mesh
     * @param mesh - identity of mesh to change
     * @param order - decimation order 0..6
     * @example niivue.decimateHierarchicalMesh(niivue.meshes[0].id, 4)
     * @returns boolean false if mesh is not hierarchical or of lower order
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    decimateHierarchicalMesh(mesh: number, order?: number): boolean;
    /**
     * reverse triangle winding of mesh (swap front and back faces)
     * @param mesh - identity of mesh to change
     * @example niivue.reverseFaces(niivue.meshes[0].id)
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    reverseFaces(mesh: number): void;
    /**
     * reverse triangle winding of mesh (swap front and back faces)
     * @param mesh - identity of mesh to change
     * @param layer - selects the mesh overlay (e.g. GIfTI or STC file)
     * @param key - attribute to change
     * @param val - value for attribute
     * @example niivue.setMeshLayerProperty(niivue.meshes[0].id, 0, 'frame4D', 22)
     * @see {@link https://niivue.com/demos/features/mesh.4D.html | live demo usage}
     */
    setMeshLayerProperty(mesh: number, layer: number, key: keyof NVMeshLayer, val: number): Promise<void>;
    /**
     * adjust offset position and scale of 2D sliceScale
     * @param xyzmmZoom - first three components are spatial, fourth is scaling
     * @example niivue.setPan2Dxyzmm([5,-4, 2, 1.5])
     */
    setPan2Dxyzmm(xyzmmZoom: vec4): void;
    /**
     * set rotation of 3D render view
     * @example niivue.setRenderAzimuthElevation(45, 15)
     * @see {@link https://niivue.com/demos/features/mask.html | live demo usage}
     */
    setRenderAzimuthElevation(a: number, e: number): void;
    /**
     * get the index of an overlay by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.
     * @param id - the id string to search for
     * @see NiiVue#getVolumeIndexByID
     * @example
     * niivue = new Niivue()
     * niivue.getOverlayIndexByID(someVolume.id)
     */
    getOverlayIndexByID(id: string): number;
    /**
     * set the index of a volume. This will change it's ordering and appearance if there are multiple volumes loaded.
     * @param volume - the volume to update
     * @param toIndex - the index to move the volume to. The default is the background (0 index)
     * @example
     * niivue = new Niivue()
     * niivue.setVolume(someVolume, 1) // move it to the second position in the array of loaded volumes (0 is the first position)
     */
    setVolume(volume: NVImage, toIndex?: number): void;
    /**
     * Reorders a mesh within the internal mesh list.
     *
     * @param mesh - The `NVMesh` instance to reposition.
     * @param toIndex - Target index to move the mesh to.
     *   - If `0`, moves mesh to the front.
     *   - If `< 0`, removes the mesh.
     *   - If within bounds, inserts mesh at the specified index.
     */
    setMesh(mesh: NVMesh, toIndex?: number): void;
    /**
     * Remove a volume
     * @param volume - volume to delete
     * @example
     * niivue = new Niivue()
     * niivue.removeVolume(this.volumes[3])
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    removeVolume(volume: NVImage): void;
    /**
     * Remove a volume from the scene by its index
     * @param index - index of the volume to remove
     * @throws if the index is out of bounds
     * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
     */
    removeVolumeByIndex(index: number): void;
    /**
     * Remove a triangulated mesh, connectome or tractogram
     * @param mesh - mesh to delete
     * @example
     * niivue = new Niivue()
     * niivue.removeMesh(this.meshes[3])
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    removeMesh(mesh: NVMesh): void;
    /**
     * Remove a triangulated mesh, connectome or tractogram
     * @param url - URL of mesh to delete
     * @example
     * niivue.removeMeshByUrl('../images/cit168.mz3')
     */
    removeMeshByUrl(url: string): void;
    /**
     * Move a volume to the bottom of the stack of loaded volumes. The volume will become the background
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeToBottom(this.volumes[3]) // move the 4th volume to the 0 position. It will be the new background
     */
    moveVolumeToBottom(volume: NVImage): void;
    /**
     * Move a volume up one index position in the stack of loaded volumes. This moves it up one layer
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeUp(this.volumes[0]) // move the background image to the second index position (it was 0 index, now will be 1)
     */
    moveVolumeUp(volume: NVImage): void;
    /**
     * Move a volume down one index position in the stack of loaded volumes. This moves it down one layer
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeDown(this.volumes[1]) // move the second image to the background position (it was 1 index, now will be 0)
     */
    moveVolumeDown(volume: NVImage): void;
    /**
     * Move a volume to the top position in the stack of loaded volumes. This will be the top layer
     * @param volume - the volume to move
     * @example
     * niivue = new Niivue()
     * niivue.moveVolumeToTop(this.volumes[0]) // move the background image to the top layer position
     */
    moveVolumeToTop(volume: NVImage): void;
    /**
     * Records the current mouse position in screen space (adjusted for device pixel ratio).
     * @internal
     */
    mouseDown(x: number, y: number): void;
    /**
     * Updates mouse position and modifies 3D render view if the pointer is in the render tile.
     *
     * @internal
     */
    mouseMove(x: number, y: number): void;
    /**
     * convert spherical AZIMUTH, ELEVATION to Cartesian
     * @param azimuth - azimuth number
     * @param elevation - elevation number
     * @returns the converted [x, y, z] coordinates
     * @example
     * niivue = new Niivue()
     * xyz = niivue.sph2cartDeg(42, 42)
     */
    sph2cartDeg(azimuth: number, elevation: number): number[];
    /**
     * Update the clip plane orientation in 3D view mode.
     * @param depthAzimuthElevation - a 3-component array:
     *   - `depth`: distance of clip plane from center of volume (0 to ~1.73, or >2.0 to disable clipping)
     *   - `azimuth`: camera angle around the object in degrees (0–360 or -180–180)
     *   - `elevation`: camera height in degrees (-90 to 90)
     * @example
     * niivue = new Niivue()
     * niivue.setClipPlane([42, 42])
     * @see {@link https://niivue.com/demos/features/mask.html | live demo usage}
     */
    setClipPlane(depthAzimuthElevation: number[]): void;
    /**
     * set the crosshair and colorbar outline color
     * @param color - an RGBA array. values range from 0 to 1
     * @example
     * niivue = new Niivue()
     * niivue.setCrosshairColor([0, 1, 0, 0.5]) // set crosshair to transparent green
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setCrosshairColor(color: number[]): void;
    /**
     * set thickness of crosshair
     * @example niivue.crosshairWidth(2)
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setCrosshairWidth(crosshairWidth: number): void;
    setDrawColormap(name: string): void;
    /**
     * does dragging over a 2D slice create a drawing?
     * @param trueOrFalse - enabled (true) or not (false)
     * @example niivue.setDrawingEnabled(true)
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    setDrawingEnabled(trueOrFalse: boolean): void;
    /**
     * determine color and style of drawing
     * @param penValue - sets the color of the pen
     * @param isFilledPen - determines if dragging creates flood-filled shape
     * @example niivue.setPenValue(1, true)
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    setPenValue(penValue: number, isFilledPen?: boolean): void;
    /**
     * control whether drawing is transparent (0), opaque (1) or translucent (between 0 and 1).
     * @param opacity - translucency of drawing
     * @example niivue.setDrawOpacity(0.7)
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    setDrawOpacity(opacity: number): void;
    /**
     * set the selection box color. A selection box is drawn when you right click and drag to change image contrast
     * @param color - an RGBA array. values range from 0 to 1
     * @example
     * niivue = new Niivue()
     * niivue.setSelectionBoxColor([0, 1, 0, 0.5]) // set to transparent green
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setSelectionBoxColor(color: number[]): void;
    /**
     * Handles mouse wheel or trackpad scroll to change slices, zoom, or frame depending on context.
     * @internal
     */
    sliceScroll2D(posChange: number, x: number, y: number, isDelta?: boolean): void;
    /**
     * set the slice type. This changes the view mode
     * @param st - sliceType is an enum of slice types to use
     * @example
     * niivue = new Niivue()
     * niivue.setSliceType(Niivue.sliceTypeMultiplanar)
     * @see {@link https://niivue.com/demos/features/basic.multiplanar.html | live demo usage}
     */
    setSliceType(st: SLICE_TYPE): this;
    /**
     * set the opacity of a volume given by volume index
     * @param volIdx - the volume index of the volume to change
     * @param newOpacity - the opacity value. valid values range from 0 to 1. 0 will effectively remove a volume from the scene
     * @example
     * niivue = new Niivue()
     * niivue.setOpacity(0, 0.5) // make the first volume transparent
     * @see {@link https://niivue.com/demos/features/atlas.html | live demo usage}
     */
    setOpacity(volIdx: number, newOpacity: number): void;
    /**
     * set the scale of the 3D rendering. Larger numbers effectively zoom.
     * @param scale - the new scale value
     * @example
     * niivue.setScale(2) // zoom some
     * @see {@link https://niivue.com/demos/features/shiny.volumes.html | live demo usage}
     */
    setScale(scale: number): void;
    /**
     * set the color of the 3D clip plane
     * @param color - the new color. expects an array of RGBA values. values can range from 0 to 1
     * @example
     * niivue.setClipPlaneColor([1, 1, 1, 0.5]) // white, transparent
     * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
     */
    setClipPlaneColor(color: number[]): void;
    /**
     * adjust thickness of the 3D clip plane
     * @param thick - thickness of slab. Value 0..1.73 (cube opposite corner length is sqrt(3)).
     * @example
     * niivue.setClipPlaneThick(0.3) // thin slab
     * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
     */
    setClipPlaneThick(thick: number): void;
    /**
     * set the clipping region for volume rendering
     * @param low - 3-component array specifying the lower bound of the clipping region along the X, Y, and Z axes. Values range from 0 (start) to 1 (end of volume).
     * @param high - 3-component array specifying the upper bound of the clipping region along the X, Y, and Z axes. Values range from 0 to 1.
     * @example
     * niivue.setClipPlaneColor([0.0, 0.0, 0.2], [1.0, 1.0, 0.7]) // remove inferior 20% and superior 30%
     * @see {@link https://niivue.com/demos/features/clipplanes.html | live demo usage}
     */
    setClipVolume(low: number[], high: number[]): void;
    /**
     * set proportion of volume rendering influenced by selected matcap.
     * @param gradientAmount - amount of matcap (NaN or 0..1), default 0 (matte, surface normal does not influence color). NaN renders the gradients.
     * @example
     * niivue.setVolumeRenderIllumination(0.6);
     * @see {@link https://niivue.com/demos/features/shiny.volumes.html | live demo usage}
     * @see {@link https://niivue.com/demos/features/gradient.order.html | live demo usage}
     */
    setVolumeRenderIllumination(gradientAmount?: number): Promise<void>;
    /**
     * set volume rendering opacity influence of the gradient magnitude
     * @param gradientOpacity - amount of gradient magnitude influence on opacity (0..1), default 0 (no-influence)
     * @param renderSilhouette - make core transparent to enhance rims (0..1), default 0 (no-influence)
     * @example
     * niivue.setGradientOpacity(0.6);
     * @see {@link https://niivue.com/demos/features/gradient.opacity.html | live demo usage}
     */
    setGradientOpacity(gradientOpacity?: number, renderSilhouette?: number): Promise<void>;
    /**
     * Generates a placeholder RGBA overlay of a green sphere for testing purposes only.
     * @internal
     * @remarks Marked for future removal — creates a test sphere, not intended for production use.
     */
    overlayRGBA(volume: NVImage): Uint8ClampedArray;
    /**
     * Convert voxel coordinates to millimeters using a transformation matrix.
     * @internal
     */
    vox2mm(XYZ: number[], mtx: mat4): vec3;
    /**
     * clone a volume and return a new volume
     * @param index - the index of the volume to clone
     * @returns new volume to work with, but that volume is not added to the canvas
     * @example
     * niivue = new Niivue()
     * niivue.cloneVolume(0)
     */
    cloneVolume(index: number): NVImage;
    /**
     * Loads an NVDocument from a URL and integrates it into the scene.
     */
    loadDocumentFromUrl(url: string): Promise<void>;
    /**
     * Loads an NVDocument
     * @returns  Niivue instance
     * @see {@link https://niivue.com/demos/features/document.load.html | live demo usage}
     */
    loadDocument(document: NVDocument): Promise<this>;
    /**
   * generates JavaScript to load the current scene as a document
   * @param canvasId - id of canvas NiiVue will be attached to
   * @param esm - bundled version of NiiVue
   * @example
   * const javascript = this.generateLoadDocumentJavaScript("gl1");
   * const html = `<html><body><canvas id="gl1"></canvas><script type="module" async>
          ${javascript}</script></body></html>`;
   * @see {@link https://niivue.com/demos/features/save.custom.html.html | live demo usage}
   */
    generateLoadDocumentJavaScript(canvasId: string, esm: string): Promise<string>;
    /**
     * generates HTML of current scene
     * @param canvasId - id of canvas NiiVue will be attached to
     * @param esm - bundled version of NiiVue
     * @returns HTML with javascript of the current scene
     * @example
     * const template = `<html><body><canvas id="gl1"></canvas><script type="module" async>
     *       %%javascript%%</script></body></html>`;
     * nv1.generateHTML("page.html", esm);
     */
    generateHTML(canvasId: string, esm: string): Promise<string>;
    /**
     * Save the current scene as a standalone HTML file
     * @param fileName - name of the HTML file to save (default: "untitled.html")
     * @param canvasId - ID of the canvas element NiiVue will attach to
     * @param esm - bundled ES module source for NiiVue
     * @returns a Promise that resolves when the file is downloaded
     * @see {@link https://niivue.com/demos/features/save.html.html | live demo usage}
     */
    saveHTML(fileName: string, canvasId: string, esm: string): Promise<void>;
    /**
     * Converts NiiVue scene to JSON
     */
    json(): ExportDocumentData;
    /**
     * Save the current scene as an .nvd document.
     *
     * @param fileName  Name of the file to create (default "untitled.nvd")
     * @param compress  If true, gzip-compress the JSON (default true)
     * @param options   Fine-grained switches:
     *                  • embedImages  – store encodedImageBlobs  (default true)
     *                  • embedPreview – store previewImageDataURL (default true)
     *
     * @example
     * // smallest possible file – no preview, just metadata
     * await nv.saveDocument('scene.nvd', true, { embedImages:false, embedPreview:false });
     * @see {@link https://niivue.com/demos/features/document.3d.html | live demo usage}
     */
    saveDocument(fileName?: string, compress?: boolean, options?: {
        embedImages?: boolean;
        embedPreview?: boolean;
    }): Promise<void>;
    /**
     * Load an array of image or mesh URLs using appropriate handlers
     * @param images - array of image or mesh descriptors (with URL and optional name)
     * @returns a Promise resolving to the current NiiVue instance after loading completes
     * @remarks Automatically dispatches each item to either volume or mesh loader based on file extension or registered custom loader
     * @see {@link https://niivue.com/demos/features/timeseries2.html | live demo usage}
     */
    loadImages(images: Array<ImageFromUrlOptions | LoadFromUrlParams>): Promise<this>;
    loadDicoms(dicomList: ImageFromUrlOptions[]): Promise<this>;
    /**
     * load an array of volume objects
     * @param volumeList - the array of objects to load. each object must have a resolvable "url" property at a minimum
     * @returns returns the Niivue instance
     * @example
     * niivue = new Niivue()
     * niivue.loadVolumes([{url: 'someImage.nii.gz}, {url: 'anotherImage.nii.gz'}])
     * @see {@link https://niivue.com/demos/features/mask.html | live demo usage}
     */
    loadVolumes(volumeList: ImageFromUrlOptions[]): Promise<this>;
    /**
     * Add mesh and notify subscribers
     */
    addMeshFromUrl(meshOptions: LoadFromUrlParams): Promise<NVMesh>;
    /**
     * Add mesh and notify subscribers
     */
    addMeshesFromUrl(meshOptions: LoadFromUrlParams[]): Promise<NVMesh[]>;
    /**
     * load an array of meshes
     * @param meshList - the array of objects to load. each object must have a resolvable "url" property at a minimum
     * @returns Niivue instance
     * @example
     * niivue = new Niivue()
     * niivue.loadMeshes([{url: 'someMesh.gii'}])
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    loadMeshes(meshList: LoadFromUrlParams[]): Promise<this>;
    /**
     * Load a connectome from a given URL and initialize it.
     *
     * @param url - the URL to a JSON-formatted connectome definition
     * @param headers - optional HTTP headers to include with the request (e.g. for authorization)
     * @returns the `Niivue` instance (for method chaining)
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    loadConnectomeFromUrl(url: string, headers?: {}): Promise<this>;
    /**
     * Load a FreeSurfer-style connectome from a given URL and initialize it.
     * @param url - the URL of the JSON-formatted connectome file
     * @param headers - optional HTTP headers to include in the fetch request (e.g. for authorization)
     * @returns the `Niivue` instance (for method chaining)
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    loadFreeSurferConnectomeFromUrl(url: string, headers?: {}): Promise<this>;
    /**
     * load a connectome specified by json
     * @param json - freesurfer model
     * @returns Niivue instance
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    loadFreeSurferConnectome(json: FreeSurferConnectome): Promise<this>;
    /**
     * Handles addition of a connectome node by adding a corresponding label and redrawing.
     * @internal
     */
    handleNodeAdded(event: {
        detail: {
            node: NVConnectomeNode;
        };
    }): void;
    /**
     * Converts various connectome JSON formats to a standardized mesh representation.
     *
     * @param json - Connectome data in current or legacy format.
     * @returns The connectome as an `NVMesh`.
     * @internal
     */
    loadConnectomeAsMesh(json: Connectome | LegacyConnectome | FreeSurferConnectome): NVMesh;
    /**
     * load a connectome specified by json
     * @param json - connectome model
     * @returns Niivue instance
     * @see {@link https://niivue.com/demos/features/connectome.html | live demo usage}
     */
    loadConnectome(json: Connectome | LegacyConnectome): this;
    /**
     * generate a blank canvas for the pen tool
     * @example niivue.createEmptyDrawing()
     * @see {@link https://niivue.com/demos/features/cactus.html | live demo usage}
     */
    createEmptyDrawing(): void;
    /**
     * Creates or updates a 1-component 16-bit signed integer 3D texture on the GPU.
     * @internal
     */
    r16Tex(texID: WebGLTexture | null, activeID: number, dims: number[], img16: Int16Array): WebGLTexture;
    /**
     * dilate drawing so all voxels are colored.
     * works on drawing with multiple colors
     * @example niivue.drawGrowCut();
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    drawGrowCut(): void;
    /**
     * Sets the color value of a voxel and its neighbors in the drawing bitmap.
     * @internal
     */
    drawPt(x: number, y: number, z: number, penValue: number, drawBitmap?: Uint8Array | null): void;
    /**
     * Draws a 3D line between two voxels in the drawing bitmap using Bresenham's algorithm.
     * @internal
     */
    drawPenLine(ptA: number[], ptB: number[], penValue: number): void;
    /**
     * Performs a 1-voxel binary dilation on a connected cluster within the drawing mask using the drawFloodFillCore function.
     *
     * @param seedXYZ -  voxel index of the seed voxel in the mask array.
     * @param neighbors - Number of neighbors to consider for connectivity and dilation (6, 18, or 26).
     */
    drawingBinaryDilationWithSeed(seedXYZ: number[], // seed voxel x,y,z
    neighbors?: 6 | 18 | 26): void;
    /**
     * Flood fill to cluster connected voxels based on neighbor connectivity (6, 18, or 26 neighbors).
     * Voxels with value 1 are included in the cluster and set to 2.
     * Uses a queue-based breadth-first search.
     *
     * @internal
     */
    drawFloodFillCore(img: Uint8Array, seedVx: number, neighbors?: number): void;
    /**
     * Performs a flood fill on the drawing bitmap starting from a seed voxel, recoloring all connected voxels
     * based on spatial connectivity, intensity constraints, and other parameters.
     * Supports 2D or 3D fills, cluster growing, distance constraints, and preview mode for clickToSegment.
     *
     * @internal
     */
    drawFloodFill(seedXYZ: number[], newColor?: number, growSelectedCluster?: number, forceMin?: number, forceMax?: number, neighbors?: number, maxDistanceMM?: number, is2D?: boolean, targetBitmap?: Uint8Array | null, isGrowClusterTool?: boolean): void;
    /**
     * Connects and fills the interior of drawn line segments in 2D slice space.
     * @internal
     */
    drawPenFilled(): void;
    /**
     * close drawing: make sure you have saved any changes before calling this!
     * @example niivue.closeDrawing();
     * @see {@link https://niivue.com/demos/features/draw.ui.html | live demo usage}
     */
    closeDrawing(): void;
    /**
     * copy drawing bitmap from CPU to GPU storage and redraw the screen
     * @param isForceRedraw - refreshes scene immediately (default true)
     * @example niivue.refreshDrawing();
     * @see {@link https://niivue.com/demos/features/cactus.html | live demo usage}
     */
    refreshDrawing(isForceRedraw?: boolean, useClickToSegmentBitmap?: boolean): void;
    /**
     * Creates a 2D 1-component uint8 texture on the GPU with given dimensions.
     * @internal
     */
    r8Tex2D(texID: WebGLTexture | null, activeID: number, dims: number[], isInit?: boolean): WebGLTexture | null;
    /**
     * Creates a 3D 1-component uint8 texture on the GPU with given dimensions.
     * @internal
     */
    r8Tex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit?: boolean): WebGLTexture | null;
    /**
     * Creates a 2D 4-component (RGBA) uint8 texture on the GPU with optional vertical flip.
     * @internal
     */
    rgbaTex2D(texID: WebGLTexture | null, activeID: number, dims: number[], data?: Uint8Array | null, isFlipVertical?: boolean): WebGLTexture | null;
    /**
     * Creates a 3D 4-component (RGBA) uint8 texture on the GPU, optionally initializing with empty data.
     * @internal
     */
    rgbaTex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit?: boolean): WebGLTexture | null;
    /**
     * Create or recreate a 3D RGBA16UI texture on the GPU with given dimensions.
     * Deletes existing texture if provided, then allocates storage and optionally initializes with zeros.
     * @internal
     */
    rgba16Tex(texID: WebGLTexture | null, activeID: number, dims: number[], isInit?: boolean): WebGLTexture | null;
    /**
     * Remove cross-origin attribute from image if its URL is not from the same origin as the current page.
     * @internal
     */
    requestCORSIfNotSameOrigin(img: HTMLImageElement, url: string): void;
    /**
     * Loads a PNG image from a URL and creates a 4-component (RGBA) uint8 WebGL texture.
     * Binds texture to a specific texture unit depending on textureNum and sets texture parameters.
     * Automatically handles CORS and draws scene if needed.
     * @internal
     */
    loadPngAsTexture(pngUrl: string, textureNum: number): Promise<WebGLTexture | null>;
    /**
     * Loads a font stored as a PNG bitmap into texture unit 3.
     * @internal
     */
    loadFontTexture(fontUrl: string): Promise<WebGLTexture | null>;
    /**
     * Loads a PNG bitmap into texture unit 4.
     * @internal
     */
    loadBmpTexture(bmpUrl: string): Promise<WebGLTexture | null>;
    /**
     * Load matcap for illumination model.
     * @param bmpUrl - name of matcap to load ("Shiny", "Cortex", "Cream")
     * @example
     * niivue.loadMatCapTexture("Cortex");
     * @see {@link https://niivue.com/demos/features/shiny.volumes.html | live demo usage}
     */
    loadMatCapTexture(bmpUrl: string): Promise<WebGLTexture | null>;
    /**
     * Initializes font metrics from loaded font data.
     * @internal
     */
    initFontMets(): void;
    /**
     * Load typeface for colorbars, measurements and orientation text.
     * @param fontSheetUrl - URL to a bitmap font sheet image (e.g., a PNG atlas of glyphs)
     * @param metricsUrl - URL to the corresponding font metrics JSON (defines character bounds and spacing)
     * @returns a Promise that resolves when the font is loaded
     * @example
     * niivue.loadFont("./Roboto.png","./Roboto.json")
     * @see {@link https://niivue.com/demos/features/selectfont.html | live demo usage}
     */
    loadFont(fontSheetUrl?: any, metricsUrl?: {
        atlas: {
            type: string;
            distanceRange: number;
            size: number;
            width: number;
            height: number;
            yOrigin: string;
        };
        metrics: {
            emSize: number;
            lineHeight: number;
            ascender: number;
            descender: number;
            underlineY: number;
            underlineThickness: number;
        };
        glyphs: ({
            unicode: number;
            advance: number;
            planeBounds?: undefined;
            atlasBounds?: undefined;
        } | {
            unicode: number;
            advance: number;
            planeBounds: {
                left: number;
                bottom: number;
                right: number;
                top: number;
            };
            atlasBounds: {
                left: number;
                bottom: number;
                right: number;
                top: number;
            };
        })[];
        kerning: any[];
    }): Promise<void>;
    /**
     * Loads the default MatCap texture.
     * @internal
     */
    loadDefaultMatCap(): Promise<WebGLTexture | null>;
    /**
     * Loads the default font texture and initializes font metrics.
     * @internal
     */
    loadDefaultFont(): Promise<void>;
    /**
     * Initializes text rendering by setting up font shader, loading default font and matcap texture,
     * and drawing the loading text.
     * @internal
     */
    initText(): Promise<void>;
    /**
     * Maps a mesh shader name to its corresponding index number.
     * @internal
     */
    meshShaderNameToNumber(meshShaderName?: string): number | undefined;
    /**
     * select new shader for triangulated meshes and connectomes. Note that this function requires the mesh is fully loaded: you may want use `await` with loadMeshes (as seen in live demo).
     * @param id - id of mesh to change
     * @param meshShaderNameOrNumber - identify shader for usage
     * @example niivue.setMeshShader('toon');
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    setMeshShader(id: number, meshShaderNameOrNumber?: number): void;
    /**
     *
     * @param fragmentShaderText - custom fragment shader.
     * @param name - title for new shader.
     * @returns created custom mesh shader
     */
    createCustomMeshShader(fragmentShaderText: string, name?: string): {
        Name: string;
        Frag: string;
        shader: Shader;
    };
    /**
     * Install a special shader for 2D slice views
     * @param fragmentShaderText - custom fragment shader.
     * @if not text is provided, the default shader will be used
     * @internal
     */
    setCustomSliceShader(fragmentShaderText?: string): void;
    /**
     * Define a new GLSL shader program to influence mesh coloration
     * @param fragmentShaderText - the GLSL source code for the custom fragment shader
     * @param name - a descriptive label for the shader (used in menus or debugging)
     * @returns the index of the new shader (use with {@link setMeshShader})
     * @see {@link https://niivue.com/demos/features/mesh.atlas.html | live demo usage}
     */
    setCustomMeshShader(fragmentShaderText?: string, name?: string): number;
    /**
     * retrieve all currently loaded meshes
     * @param sort - sort output alphabetically
     * @returns list of available mesh shader names
     * @example niivue.meshShaderNames();
     * @see {@link https://niivue.com/demos/features/meshes.html | live demo usage}
     */
    meshShaderNames(sort?: boolean): string[];
    /**
     * Initializes a rendering shader with texture units and uniforms.
     * @internal
     */
    initRenderShader(shader: Shader, gradientAmount?: number): void;
    /**
     * Initializes WebGL state, shaders, textures, buffers, and sets up the rendering pipeline.
     * Also loads default fonts, matcap textures, and thumbnail if specified.
     * @internal
     * @returns {Promise<this>} Resolves to this instance after initialization completes.
     */
    init(): Promise<this>;
    /**
     * Generates gradient texture from volume data using GPU shaders and framebuffers.
     * @internal
     */
    gradientGL(hdr: NiftiHeader): void;
    /**
     * Get the gradient texture produced by gradientGL as a TypedArray
     * @returns Float32Array containing the gradient texture data, or null if no gradient texture exists
     * @example
     * niivue = new Niivue()
     * niivue.loadVolumes([{url: './someImage.nii'}])
     * // ... after volume is loaded and gradient is computed
     * const gradientData = niivue.getGradientTextureData()
     * if (gradientData) {
     *   console.log('Gradient texture dimensions:', gradientData.length)
     * }
     * @see {@link https://niivue.com/demos/features/gradient.custom.html | live demo usage}
     */
    getGradientTextureData(): Float32Array | null;
    /**
     * Set a custom gradient texture to use instead of the one produced by gradientGL
     * When a custom gradient texture is set, the useCustomGradientTexture flag is set to true
     * to prevent gradientGL from overwriting the custom texture during volume updates.
     * @param data - Float32Array or Uint8Array containing RGBA gradient data, or null to revert to auto-generated gradient
     * @param dims - Optional dimensions array [width, height, depth]. If not provided, uses current volume dimensions
     * @example
     * niivue = new Niivue()
     * niivue.loadVolumes([{url: './someImage.nii'}])
     * // Create custom gradient data
     * const customGradient = new Float32Array(256 * 256 * 256 * 4) // example dimensions
     * // ... fill customGradient with desired values
     * niivue.setCustomGradientTexture(customGradient, [256, 256, 256])
     *
     * // To revert to auto-generated gradient:
     * niivue.setCustomGradientTexture(null)
     * @see {@link https://niivue.com/demos/features/gradient.custom.html | live demo usage}
     */
    setCustomGradientTexture(data: Float32Array | Uint8Array | null, dims?: number[]): void;
    /**
     * update the webGL 2.0 scene after making changes to the array of volumes. It's always good to call this method after altering one or more volumes manually (outside of Niivue setter methods)
     * @example
     * niivue = new Niivue()
     * niivue.updateGLVolume()
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    updateGLVolume(): void;
    /**
     * basic statistics for selected voxel-based image
     * @param options - an object containing the following properties:
     *   - layer: selects image to describe
     *   - masks: optional binary images to filter voxels
     *   - drawingIsMask: a boolean indicating if the drawing is used as a mask
     *   - roiIsMask: a boolean indicating if the ROI is used as a mask
     *   - startVox: the starting voxel coordinates
     *   - endVox: the ending voxel coordinates
     * @returns numeric values to describe image or regions of images
     * @example
     * niivue.getDescriptives({
     *   layer: 0,
     *   masks: [],
     *   drawingIsMask: true, // drawingIsMask and roiIsMask are mutually exclusive
     *   roiIsMask: false,
     *   startVox: [10, 20, 30], // ignored if roiIsMask is false
     *   endVox: [40, 50, 60] // ignored if roiIsMask is false
     * });
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    getDescriptives(options: {
        layer?: number;
        masks?: number[];
        drawingIsMask?: boolean;
        roiIsMask?: boolean;
        startVox?: number[];
        endVox?: number[];
    }): Descriptive;
    /**
     * Updates textures, shaders, and GPU state for a given overlay layer based on image properties and rendering options.
     * @internal
     */
    refreshLayers(overlayItem: NVImage, layer: number): void;
    /**
     * query all available color maps that can be applied to volumes
     * @returns an array of colormap strings
     * @example
     * niivue = new Niivue()
     * colormaps = niivue.colormaps()
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    colormaps(): string[];
    /**
     * create a new colormap
     * @param key - name of new colormap
     * @param cmap - colormap properties (Red, Green, Blue, Alpha and Indices)
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    addColormap(key: string, cmap: ColorMap): void;
    /**
     * update the colormap of an image given its ID
     * @param id - the ID of the NVImage
     * @param colormap - the name of the colormap to use
     * @example
     * niivue.setColormap(niivue.volumes[0].id,, 'red')
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setColormap(id: string, colormap: string): void;
    /**
     * Computes the linear voxel index from 3D coordinates using image dimensions.
     * @internal
     */
    idx(A: number, B: number, C: number, DIM: Uint32Array): number;
    /**
     * Checks if voxels below the given voxel have labels matching its value, returning the first matching label or 0.
     * @internal
     */
    check_previous_slice(bw: Uint32Array, il: Uint32Array, r: number, c: number, sl: number, dim: Uint32Array, conn: number, tt: Uint32Array): number;
    /**
     * Performs provisional labeling of connected voxels in a volume using specified connectivity.
     * @internal
     */
    do_initial_labelling(bw: Uint32Array, dim: Uint32Array, conn: number): [number, Uint32Array, Uint32Array];
    /**
     * Merges multiple provisional labels into a unified class using a translation table.
     * @internal
     */
    fill_tratab(tt: Uint32Array, nabo: Uint32Array, nr_set: number): void;
    /**
     * Removes gaps in label indices to produce a dense labeling.
     * @internal
     */
    translate_labels(il: Uint32Array, dim: Uint32Array, tt: Uint32Array, ttn: number): [number, Uint32Array];
    /**
     * Retains only the largest cluster for each region in a labeled volume.
     * @internal
     */
    largest_original_cluster_labels(bw: Uint32Array, cl: number, ls: Uint32Array): [number, Uint32Array];
    /**
     * Computes connected components labeling on a 3D image.
     * @internal
     */
    bwlabel(img: Uint32Array, dim: Uint32Array, conn?: number, binarize?: boolean, onlyLargestClusterPerClass?: boolean): [number, Uint32Array];
    /**
     * Create a connected component label map from a volume
     * @param id - ID of the input volume
     * @param conn - connectivity for clustering (6 = faces, 18 = faces + edges, 26 = faces + edges + corners)
     * @param binarize - whether to binarize the volume before labeling
     * @param onlyLargestClusterPerClass - retain only the largest cluster for each label
     * @returns a new NVImage with labeled clusters, using random colormap
     * @see {@link https://niivue.com/demos/features/clusterize.html | live demo usage}
     */
    createConnectedLabelImage(id: string, conn?: number, binarize?: boolean, onlyLargestClusterPerClass?: boolean): Promise<NVImage>;
    /**
     * Scales and crops a Float32 image to Uint8 range.
     * @internal
     */
    scalecropUint8(img32: Float32Array, dst_min: number, dst_max: number, src_min: number, scale: number): Promise<Uint8Array>;
    /**
     * Scales and crops a Float32 image to a specified range.
     * @internal
     */
    scalecropFloat32(img32: Float32Array, dst_min: number, dst_max: number, src_min: number, scale: number): Promise<Float32Array>;
    /**
     * Computes offset and scale to robustly rescale image intensities to a target range.
     * @internal
     */
    getScale(volume: NVImage, dst_min?: number, dst_max?: number, f_low?: number, f_high?: number): [number, number];
    /**
     * Computes output affine, voxel-to-voxel transform, and its inverse for resampling.
     * @internal
     */
    conformVox2Vox(inDims: number[], inAffine: number[], outDim?: number, outMM?: number, toRAS?: boolean): [mat4, mat4, mat4];
    /**
     * Create a binary NIfTI file as a Uint8Array, including header and image data
     * @param dims - image dimensions [x, y, z]
     * @param pixDims - voxel dimensions in mm [x, y, z]
     * @param affine - 4×4 affine transformation matrix in row-major order
     * @param datatypeCode - NIfTI datatype code (e.g., DT_UINT8, DT_FLOAT32)
     * @param img - image data buffer (optional)
     * @returns a Uint8Array representing a complete NIfTI file
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */
    createNiftiArray(dims?: number[], pixDims?: number[], affine?: number[], datatypeCode?: NiiDataType, img?: Uint8Array): Promise<Uint8Array>;
    /**
     * Convert a binary NIfTI file (as a Uint8Array) to an NVImage object
     * @param bytes - binary contents of a NIfTI file
     * @returns a Promise resolving to an NVImage object
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */ niftiArray2NVImage(bytes?: Uint8Array): Promise<NVImage>;
    /**
     * Load a NIfTI image from a URL and convert it to an NVImage object
     * @param fnm - URL of the NIfTI file to load
     * @returns a Promise resolving to an NVImage (not yet added to GPU or scene)
     * @see {@link https://niivue.com/demos/features/conform.html | live demo usage}
     */
    loadFromUrl(fnm: string): Promise<NVImage>;
    /**
     * FreeSurfer-style conform reslices any image to a 256x256x256 volume with 1mm voxels
     * @param volume - input volume to be re-oriented, intensity-scaled and resliced
     * @param toRAS - reslice to row, column slices to right-anterior-superior not left-inferior-anterior (default false).
     * @param isLinear - reslice with linear rather than nearest-neighbor interpolation (default true).
     * @param asFloat32 - use Float32 datatype rather than Uint8 (default false).
     * @param isRobustMinMax - clamp intensity with robust min max (~2%..98%) instead of FreeSurfer (0%..99.99%) (default false).
     * @see {@link https://niivue.com/demos/features/torso.html | live demo usage}
     */
    conform(volume: NVImage, toRAS?: boolean, isLinear?: boolean, asFloat32?: boolean, isRobustMinMax?: boolean): Promise<NVImage>;
    /**
     * darken crevices and brighten corners when 3D rendering drawings.
     * @param ao - amount of ambient occlusion (default 0.4)
     * @see {@link https://niivue.com/demos/features/torso.html | live demo usage}
     */
    setRenderDrawAmbientOcclusion(ao: number): void;
    /**
     * @deprecated Use {@link setColormap} instead. This alias is retained for compatibility with NiiVue < 0.35.
     * @param id - ID of the volume
     * @param colormap - name of the colormap to apply
     */
    setColorMap(id: string, colormap: string): void;
    /**
     * use given color map for negative voxels in image
     * @param id - the ID of the NVImage
     * @param colormapNegative - the name of the colormap to use
     * @example
     * niivue = new Niivue()
     * niivue.setColormapNegative(niivue.volumes[1].id,"winter");
     * @see {@link https://niivue.com/demos/features/mosaics2.html | live demo usage}
     */
    setColormapNegative(id: string, colormapNegative: string): void;
    /**
     * modulate intensity of one image based on intensity of another
     * @param idTarget - the ID of the NVImage to be biased
     * @param idModulation - the ID of the NVImage that controls bias (empty string to disable modulation)
     * @param modulateAlpha - does the modulation influence alpha transparency (values greater than 1).
     * @example niivue.setModulationImage(niivue.volumes[0].id, niivue.volumes[1].id);
     * @see {@link https://niivue.com/demos/features/modulate.html | live demo scalar usage}
     * @see {@link https://niivue.com/demos/features/modulateAfni.html | live demo usage}
     */
    setModulationImage(idTarget: string, idModulation: string, modulateAlpha?: number): void;
    /**
     * adjust screen gamma. Low values emphasize shadows but can appear flat, high gamma hides shadow details.
     * @param gamma - selects luminance, default is 1
     * @example niivue.setGamma(1.0);
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    setGamma(gamma?: number): void;
    /** Load all volumes for image opened with `limitFrames4D`, the user can also click the `...` on a 4D timeline to load deferred volumes
     * @param id - the ID of the 4D NVImage
     **/
    loadDeferred4DVolumes(id: string): Promise<void>;
    /**
     * show desired 3D volume from 4D time series
     * @param id - the ID of the 4D NVImage
     * @param frame4D - frame to display (indexed from zero)
     * @example nv1.setFrame4D(nv1.volumes[0].id, 42);
     * @see {@link https://niivue.com/demos/features/timeseries.html | live demo usage}
     */
    setFrame4D(id: string, frame4D: number): void;
    /**
     * determine active 3D volume from 4D time series
     * @param id - the ID of the 4D NVImage
     * @returns currently selected volume (indexed from 0)
     * @example nv1.getFrame4D(nv1.volumes[0].id);
     * @see {@link https://niivue.com/demos/features/timeseries.html | live demo usage}
     */
    getFrame4D(id: string): number;
    /**
     * Returns a colormap by its name key.
     * @internal
     */
    colormapFromKey(name: string): ColorMap;
    /**
     * Retrieve a colormap with optional inversion
     * @param lutName - name of the lookup table (LUT) colormap
     * @param isInvert - whether to invert the colormap
     * @returns the RGBA colormap as a Uint8ClampedArray
     * @see {@link https://niivue.com/demos/features/colormaps.html | live demo usage}
     */
    colormap(lutName?: string, isInvert?: boolean): Uint8ClampedArray;
    /**
     * Creates or recreates a 2D RGBA colormap texture with specified rows and columns.
     * @internal
     */
    createColormapTexture(texture?: WebGLTexture | null, nRow?: number, nCol?: number): WebGLTexture | null;
    /**
     * Adds a colormap configuration to the internal list with given parameters.
     * @internal
     */
    addColormapList(nm?: string, mn?: number, mx?: number, alpha?: boolean, neg?: boolean, vis?: boolean, inv?: boolean): void;
    /**
     * Rebuild and upload all colormap textures for volumes and meshes
     * @returns the current NiiVue instance, or undefined if no colormaps are used
     * @see {@link https://niivue.com/demos/features/mesh.stats.html | live demo usage}
     */
    refreshColormaps(): this | undefined;
    /**
     * Calculates volume scaling factors and voxel dimensions for rendering.
     * @internal
     */
    sliceScale(forceVox?: boolean): SliceScale;
    /**
     * Returns the index of the tile containing the given (x, y) screen coordinates.
     * Returns -1 if the coordinates are outside all tiles.
     * @internal
     */
    tileIndex(x: number, y: number): number;
    /**
     * Returns the index of the render tile containing (x, y) screen coordinates, or -1 if none.
     * @internal
     */
    inRenderTile(x: number, y: number): number;
    /**
     * Adjusts clip plane depth if active, else zooms render size.
     * @internal
     */
    sliceScroll3D(posChange?: number): void;
    /**
     * Deletes loaded thumbnail texture and frees memory.
     * @internal
     */
    deleteThumbnail(): void;
    /**
     * Checks if (x,y) is within the visible graph plotting area.
     * @internal
     */
    inGraphTile(x: number, y: number): boolean;
    /**
     * Updates drawBitmap to match clickToSegmentGrowingBitmap if they differ in content and size.
     * @internal
     */
    updateBitmapFromClickToSegment(): void;
    /**
     * Calculates the sum of all voxel values in the given bitmap.
     * @internal
     */
    sumBitmap(img: Uint8Array): number;
    /**
     * Performs click-to-segment operation based on user click within a specified tile.
     * Validates input, computes voxel coordinates from screen position, and applies flood fill
     * with intensity-based thresholding and optional growing mask.
     * Updates drawing bitmaps and triggers redraw and descriptive stats calculation.
     * @internal
     */
    doClickToSegment(options: {
        x: number;
        y: number;
        tileIndex: number;
    }): void;
    /**
     * Handles mouse click on canvas by updating crosshair position, drawing, or segmenting based on current mode and location.
     * Supports thumbnail loading, graph interaction, 3D slice scrolling, and click-to-segment with flood fill.
     * @internal
     */
    mouseClick(x: number, y: number, posChange?: number, isDelta?: boolean): void;
    /**
     * Draws a 10cm ruler on a 2D slice tile based on screen FOV and slice dimensions.
     * @internal
     */
    drawRuler(): void;
    /**
     * Draws a 10cm ruler at specified coordinates with given color and width.
     * @internal
     */
    drawRuler10cm(startXYendXY: number[], rulerColor: number[], rulerWidth?: number): void;
    /**
     * Returns vec4 with XYZ millimeter coordinates and tile index for given screen XY.
     * @internal
     */
    screenXY2mm(x: number, y: number, forceSlice?: number): vec4;
    /**
     * Update scene pan position during drag based on start and end screen coordinates.
     * @internal
     */
    dragForPanZoom(startXYendXY: number[]): void;
    /**
     * Handle center-button drag as pan and zoom.
     * @internal
     */
    dragForCenterButton(startXYendXY: number[]): void;
    /**
     * Update 3D slicer zoom and pan based on drag movement.
     * @internal
     */
    dragForSlicer3D(startXYendXY: number[]): void;
    /**
     * Draw a measurement line with end caps and length text on a 2D tile.
     * @internal
     */
    drawMeasurementTool(startXYendXY: number[], isDrawText?: boolean): void;
    /**
     * Draw angle measurement tool with two lines and angle display.
     * @internal
     */
    drawAngleMeasurementTool(): void;
    /**
     * Calculate and draw angle text at the intersection of two lines.
     * @internal
     */
    drawAngleText(): void;
    /**
     * Calculate angle between two lines in degrees.
     * @internal
     */
    calculateAngleBetweenLines(line1: number[], line2: number[]): number;
    /**
     * Reset the angle measurement state.
     * @internal
     */
    resetAngleMeasurement(): void;
    /**
     * Set the drag mode for mouse interactions.
     * @param mode - The drag mode to set ('none', 'contrast', 'measurement', 'angle', 'pan', 'slicer3D', 'callbackOnly', 'roiSelection')
     */
    setDragMode(mode: string | DRAG_MODE): void;
    /**
     * Draw a rectangle or outline at given position with specified color or default crosshair color.
     * @internal
     */
    drawRect(leftTopWidthHeight: number[], lineColor?: number[]): void;
    /**
     * Draw a circle or outline at given position with specified color or default crosshair color.
     * @internal
     */
    drawCircle(leftTopWidthHeight: number[], circleColor?: Float32List, fillPercent?: number): void;
    /**
     * Draw selection box: circle if ROI selection mode, else rectangle.
     * @internal
     */
    drawSelectionBox(leftTopWidthHeight: number[]): void;
    /**
     * Get canvas height available for tiles (excludes colorbar).
     * @internal
     */
    effectiveCanvasHeight(): number;
    /**
     * Get canvas width available for tiles (excludes legend panel).
     * @internal
     */
    effectiveCanvasWidth(): number;
    /**
     * Get all 3D labels from document and connectome meshes.
     * @internal
     */
    getAllLabels(): NVLabel3D[];
    /**
     * Get all visible connectome and non-anchored mesh labels.
     * @internal
     */
    getConnectomeLabels(): NVLabel3D[];
    /**
     * Calculate bullet margin width based on widest bullet scale and tallest label height.
     * @internal
     */
    getBulletMarginWidth(): number;
    /**
     * Calculate width of legend panel based on labels and bullet margin.
     * Returns 0 if legend is hidden or too wide for canvas.
     * @internal
     */
    getLegendPanelWidth(): number;
    /**
     * Calculate legend panel height based on labels and scale.
     * @internal
     */
    getLegendPanelHeight(panelScale?: number): number;
    /**
     * Calculate and reserve canvas area for colorbar panel.
     * @internal
     */
    reserveColorbarPanel(): number[];
    /**
     * Render a single colorbar with optional negative coloring and alpha threshold ticks.
     * @internal
     */
    drawColorbarCore(layer: number, leftTopWidthHeight: number[], isNegativeColor: boolean, min: number, max: number, isAlphaThreshold: boolean): void;
    /**
     * Draw all visible colorbars side by side in the reserved colorbar panel area.
     * @internal
     */
    drawColorbar(): void;
    /**
     * Calculate pixel width of text string based on glyph advances at given scale.
     * @internal
     */
    textWidth(scale: number, str: string): number;
    /**
     * Calculate pixel height of text based on tallest glyph at given scale.
     * @internal
     */
    textHeight(scale: number, str: string): number;
    /**
     * Render a single character glyph at specified position and scale; returns advance width.
     * @internal
     */
    drawChar(xy: number[], scale: number, char: number): number;
    /**
     * Render loading text centered on the canvas.
     * @internal
     */
    drawLoadingText(text: string): void;
    /**
     * Render a string of text at specified canvas coordinates with scaling and optional color.
     * @internal
     */
    drawText(xy: number[], str: string, scale?: number, color?: Float32List | null): void;
    /**
     * Draw text right-aligned to the given coordinates, vertically centered on y.
     * @internal
     */
    drawTextRight(xy: number[], str: string, scale?: number, color?: number[] | null): void;
    /**
     * Draw text left-aligned to the given coordinates, vertically centered on y.
     * @internal
     */
    drawTextLeft(xy: number[], str: string, scale?: number, color?: number[] | null): void;
    /**
     * Draw text right-aligned and below the given coordinates.
     * @internal
     */
    drawTextRightBelow(xy: number[], str: string, scale?: number, color?: number[] | null): void;
    /**
     * Draw text horizontally centered between start and end points with a semi-transparent background.
     * @internal
     */
    drawTextBetween(startXYendXY: number[], str: string, scale?: number, color?: number[] | null): void;
    /**
     * Draw text horizontally centered below a specified (x,y) position with canvas boundary clamping.
     * @internal
     */
    drawTextBelow(xy: number[], str: string, scale?: number, color?: number[] | null): void;
    /**
     * Update texture interpolation mode (nearest or linear) for background or overlay layer.
     * @internal
     */
    updateInterpolation(layer: number, isForceLinear?: boolean): void;
    /**
     * Enable or disable atlas outline overlay
     * @param isOutline - number 0 to 1 for outline opacity
     * @see {@link https://niivue.com/demos/features/atlas.sparse.html | live demo usage}
     */
    setAtlasOutline(isOutline: number): void;
    /**
     * select between nearest and linear interpolation for voxel based images
     * @param isNearest - whether nearest neighbor interpolation is used, else linear interpolation
     * @example niivue.setInterpolation(true);
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    setInterpolation(isNearest: boolean): void;
    /**
     * Computes 2D model-view-projection and related matrices for rendering a slice of a 3D volume.
     * Configures viewport and accounts for radiological orientation, depth clipping, and camera rotation.
     * @internal
     */
    calculateMvpMatrix2D(leftTopWidthHeight: number[], mn: vec3, mx: vec3, clipTolerance: number, clipDepth: number, azimuth: number, elevation: number, isRadiolgical: boolean): MvpMatrix2D;
    /**
     * Reorders the components of a 3D vector based on the slice orientation (axial, coronal, or sagittal).
     * @internal
     */
    swizzleVec3MM(v3: vec3, axCorSag: SLICE_TYPE): vec3;
    /**
     * Returns the swizzled field of view for the given slice orientation.
     * @internal
     */
    screenFieldOfViewVox(axCorSag?: number): vec3;
    /**
     * Returns the field of view in millimeters for the given slice orientation.
     * @internal
     */
    screenFieldOfViewMM(axCorSag?: number, forceSliceMM?: boolean): vec3;
    /**
     * Returns extended voxel-aligned field of view and bounds for the given slice orientation.
     * @internal
     */
    screenFieldOfViewExtendedVox(axCorSag?: number): MM;
    /**
     * Returns extended millimeter-aligned field of view and bounds for the given slice orientation.
     * @internal
     */
    screenFieldOfViewExtendedMM(axCorSag?: number): MM;
    /**
     * Draws anatomical orientation labels (e.g., A/P/L/R) for the given slice view.
     * @internal
     */
    drawSliceOrientationText(leftTopWidthHeight: number[], axCorSag: SLICE_TYPE, padLeftTop?: number[]): void;
    /**
     * Computes a plane in mm space for a given slice orientation and depth.
     * @internal
     */
    xyMM2xyzMM(axCorSag: SLICE_TYPE, sliceFrac: number): number[];
    /**
     * Draw a 2D slice tile with appropriate orientation, zoom, pan, and optional mesh overlay.
     * @internal
     */
    draw2DMain(leftTopWidthHeight: number[], axCorSag: SLICE_TYPE, customMM?: number): void;
    /**
     * Draw a 2D slice tile with optional custom size and orientation text.
     * @internal
     */
    draw2D(leftTopWidthHeight: number[], axCorSag: SLICE_TYPE, customMM?: number, imageWidthHeight?: number[]): void;
    /**
     * Computes 3D model-view-projection matrices based on view angles and canvas size.
     * @internal
     */
    calculateMvpMatrix(_unused: unknown, leftTopWidthHeight: number[], azimuth: number, elevation: number): mat4[];
    /**
     * Computes the model transformation matrix for the given azimuth and elevation.
     * Applies optional oblique RAS rotation if available.
     * @internal
     */
    calculateModelMatrix(azimuth: number, elevation: number): mat4;
    /**
     * Returns the normalized near-to-far ray direction for the given view angles.
     * Ensures components are nonzero to avoid divide-by-zero errors.
     * @internal
     */
    calculateRayDirection(azimuth: number, elevation: number): vec3;
    /**
     * Returns the scene's min, max, and range extents in mm or voxel space.
     * Includes both volume and mesh geometry.
     * @internal
     */
    sceneExtentsMinMax(isSliceMM?: boolean): vec3[];
    /**
     * Sets the 3D pivot point and scene scale based on volume and mesh extents.
     * @internal
     */
    setPivot3D(): void;
    /**
     * Returns the maximum number of 4D volumes across all loaded images.
     * @internal
     */
    getMaxVols(): number;
    /**
     * Returns true if any loaded 4D volume is missing frames.
     * @internal
     */
    detectPartialllyLoaded4D(): boolean;
    /**
     * Draws a graph of 4D volume intensity over time at the current crosshair position.
     * Skips if volume is 3D, region is too small, or graph opacity is zero.
     * @internal
     */
    drawGraph(): void;
    /**
     * Updates crosshair position using depth-based mouse picking from screen pixel color.
     * Only active when depth picking is enabled.
     * @internal
     */
    depthPicker(leftTopWidthHeight: number[], mvpMatrix: mat4): void;
    /**
     * Render a 3D volume visualization of the current NVImage using provided transformation matrices and angles.
     * @internal
     */
    drawImage3D(mvpMatrix: mat4, azimuth: number, elevation: number): void;
    /**
     * Draw a small orientation cube indicating L/R, A/P, I/S directions in the given tile area with specified azimuth and elevation.
     * @internal
     */
    drawOrientationCube(leftTopWidthHeight: number[], azimuth?: number, elevation?: number): void;
    /**
     * Internal utility to generate human-readable location strings for the onLocationChange callback
     * @param axCorSag - optional axis index for coordinate interpretation (NaN by default)
     * @remarks Computes string representation of current crosshair position in mm (and frame if 4D).
     * @see {@link https://niivue.com/demos/features/modulateAfni.html | live demo usage}
     */
    createOnLocationChange(axCorSag?: number): void;
    /**
     * Add a 3D Label
     * @param text - the text content of the label
     * @param style - visual styling options for the label (e.g., color, scale, line width)
     * @param points - a 3D point `[x, y, z]` or array of points to anchor the label in space
     * @param anchor - optional label anchor position (e.g., top-left, center, etc.)
     * @param onClick - optional callback function to invoke when the label is clicked
     * @returns the created `NVLabel3D` instance
     * @see {@link https://niivue.com/demos/features/labels.html | live demo usage}
     */
    addLabel(text: string, style: NVLabel3DStyle, points?: number[] | number[][], anchor?: LabelAnchorPoint, onClick?: (label: NVLabel3D) => void): NVLabel3D;
    /**
     * Calculate the 2D screen coordinates of a 3D point using the provided MVP matrix and tile position/size.
     * @internal
     */
    calculateScreenPoint(point: [number, number, number], mvpMatrix: mat4, leftTopWidthHeight: number[]): vec4;
    /**
     * Return the label located at the given screen coordinates, or null if none found.
     * @internal
     */
    getLabelAtPoint(screenPoint: [number, number]): NVLabel3D | null;
    /**
     * Draw lines from a 2D label position to its associated 3D points; supports solid and dotted lines.
     * @internal
     */
    drawLabelLine(label: NVLabel3D, pos: vec2, mvpMatrix: mat4, leftTopWidthHeight: number[], secondPass?: boolean): void;
    /**
     * Render a 3D label with optional leader lines, bullet markers, and text alignment within a legend.
     * @internal
     */
    draw3DLabel(label: NVLabel3D, pos: vec2, mvpMatrix?: mat4, leftTopWidthHeight?: number[], bulletMargin?: number, legendWidth?: number, secondPass?: boolean, scaling?: number): void;
    /**
     * Render all visible 3D labels in the legend panel, handling font scaling and layering.
     * @internal
     */
    draw3DLabels(mvpMatrix: mat4, leftTopWidthHeight: number[], secondPass?: boolean): void;
    /**
     * Draw all labels anchored to screen edges or corners with background rectangles.
     * @internal
     */
    drawAnchoredLabels(): void;
    /**
     * Render the 3D scene including volume, meshes, labels, crosshairs, and orientation cube.
     * @internal
     */
    draw3D(leftTopWidthHeight?: number[], mvpMatrix?: mat4 | null, modelMatrix?: mat4 | null, normalMatrix?: mat4 | null, azimuth?: number | null, elevation?: number): string | undefined;
    /**
     * Render all visible 3D meshes with proper blending, depth, and shader settings.
     * @internal
     */
    drawMesh3D(isDepthTest?: boolean, alpha?: number, m?: mat4, modelMtx?: mat4, normMtx?: mat4): void;
    /**
     * Render 3D crosshairs at the current crosshair position with optional depth testing and transparency.
     * @internal
     */
    drawCrosshairs3D(isDepthTest?: boolean, alpha?: number, mvpMtx?: mat4 | null, is2DView?: boolean, isSliceMM?: boolean): void;
    /**
     * Convert millimeter coordinates to fractional volume coordinates for the specified volume.
     * @internal
     */
    mm2frac(mm: vec3 | vec4, volIdx?: number, isForceSliceMM?: boolean): vec3;
    /**
     * Convert voxel coordinates to fractional volume coordinates for the specified volume.
     * @internal
     */
    vox2frac(vox: vec3, volIdx?: number): vec3;
    /**
     * Convert fractional volume coordinates to voxel coordinates for the specified volume.
     * @internal
     */
    frac2vox(frac: vec3, volIdx?: number): vec3;
    /**
     * move crosshair a fixed number of voxels (not mm)
     * @param x - translate left (-) or right (+)
     * @param y - translate posterior (-) or +anterior (+)
     * @param z - translate inferior (-) or superior (+)
     * @example niivue.moveCrosshairInVox(1, 0, 0)
     * @see {@link https://niivue.com/demos/features/draw2.html | live demo usage}
     */
    moveCrosshairInVox(x: number, y: number, z: number): void;
    /**
     * Convert fractional volume coordinates to millimeter space for the specified volume.
     * @internal
     */
    frac2mm(frac: vec3, volIdx?: number, isForceSliceMM?: boolean): vec4;
    /**
     * Convert screen pixel coordinates to texture fractional coordinates for the given slice index.
     * @internal
     */
    screenXY2TextureFrac(x: number, y: number, i: number, restrict0to1?: boolean): vec3;
    /**
     * Converts a canvas position to fractional texture coordinates.
     * @internal
     */
    canvasPos2frac(canvasPos: number[]): vec3;
    /**
     * Calculates scaled slice dimensions and position within the canvas.
     * n.b. beware of similarly named `sliceScale` method.
     * @internal
     */
    scaleSlice(w: number, h: number, padPixelsWH?: [number, number], canvasWH?: [number, number]): number[];
    /**
     * Renders a centered thumbnail image using the bitmap shader.
     * @internal
     */
    drawThumbnail(): void;
    /**
     * Draws a 2D line with specified thickness and color on the canvas.
     * If alpha < 0, uses the default crosshair color.
     * @internal
     */
    drawLine(startXYendXY: number[], thickness?: number, lineColor?: number[]): void;
    /**
     * Draws a 3D line from screen to world space with specified thickness and color.
     * If alpha < 0, uses the default crosshair color.
     * @internal
     */
    draw3DLine(startXY: vec2, endXYZ: vec3, thickness?: number, lineColor?: number[]): void;
    /**
     * Draws a dotted 2D line with specified thickness and color.
     * If alpha < 0, uses the default crosshair color with reduced opacity.
     * @internal
     */
    drawDottedLine(startXYendXY: number[], thickness?: number, lineColor?: number[]): void;
    /**
     * Draw a colored line on the graph using given coordinates, color, and thickness.
     * @internal
     */
    drawGraphLine(LTRB: number[], color?: number[], thickness?: number): void;
    /**
     * Draw crosshair lines in millimeters on a given 2D slice tile.
     * @internal
     */
    drawCrossLinesMM(sliceIndex: number, axCorSag: SLICE_TYPE, axiMM: number[], corMM: number[], sagMM: number[]): void;
    /**
     * Draw crosshair lines on 2D slice tile, delegating to mm-based drawing if appropriate.
     * @internal
     */
    drawCrossLines(sliceIndex: number, axCorSag: SLICE_TYPE, axiMM: number[], corMM: number[], sagMM: number[]): void;
    /**
     * display a lightbox or montage view
     * @param mosaicStr - specifies orientation (A,C,S) and location of slices.
     * @example niivue.setSliceMosaicString("A -10 0 20");
     * @see {@link https://niivue.com/demos/features/mosaics.html | live demo usage}
     */
    drawMosaic(mosaicStr: string): void;
    /**
     * Calculate width and height to fit a slice within a container, preserving aspect ratio based on slice type and volume scaling.
     * @internal
     */
    calculateWidthHeight(sliceType: number, volScale: number[], containerWidth: number, containerHeight: number): [number, number];
    /**
     * Core function to draw the entire scene including volumes, meshes, slices, overlays, colorbars, graphs, and handle user interaction like dragging.
     * @internal
     */
    drawSceneCore(): string | void;
    /**
     * Manage draw calls to prevent concurrency issues, calling drawSceneCore and handling refresh flags.
     * @internal
     */
    drawScene(): string | void;
    /**
     * Getter for WebGL2 rendering context; throws error if context is unavailable.
     * @internal
     */
    get gl(): WebGL2RenderingContext;
    /**
     * Setter for WebGL2 rendering context.
     * @internal
     */
    set gl(gl: WebGL2RenderingContext | null);
}

export { COLORMAP_TYPE, type Connectome, type ConnectomeOptions, DEFAULT_OPTIONS, DRAG_MODE, DRAG_MODE_PRIMARY, DRAG_MODE_SECONDARY, type DicomLoader, type DicomLoaderInput, type DocumentData, type DragReleaseParams, type ExportDocumentData, INITIAL_SCENE_DATA, LabelAnchorPoint, LabelLineTerminator, LabelTextAlignment, type LegacyConnectome, type LegacyNodes, MULTIPLANAR_TYPE, type NVConfigOptions, type NVConnectomeEdge, type NVConnectomeNode, NVDocument, NVImage, NVImageFromUrlOptions, NVLabel3D, NVLabel3DStyle, NVMesh, NVMeshFromUrlOptions, NVMeshLayerDefaults, NVMeshLoaders, NVMeshUtilities, NVUtilities, type NiftiHeader, type NiiVueLocation, type NiiVueLocationValue, Niivue, type Point, SHOW_RENDER, SLICE_TYPE, type Scene, type SyncOpts, type Volume, cmapper, ColorTables as colortables };
