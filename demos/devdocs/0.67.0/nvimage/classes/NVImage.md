# Class: NVImage

Defined in: [nvimage/index.ts:28](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L28)

a NVImage encapsulates some image data and provides methods to query and operate on images

## Constructors

### Constructor

```ts
new NVImage(
   dataBuffer: ArrayBufferLike | ArrayBuffer[],
   name: string,
   colormap: string,
   opacity: number,
   pairedImgData: ArrayBuffer,
   cal_min: number,
   cal_max: number,
   trustCalMinMax: boolean,
   percentileFrac: number,
   ignoreZeroVoxels: boolean,
   useQFormNotSForm: boolean,
   colormapNegative: string,
   frame4D: number,
   imageType: ImageType,
   cal_minNeg: number,
   cal_maxNeg: number,
   colorbarVisible: boolean,
   colormapLabel: LUT,
   colormapType: number): NVImage;
```

Defined in: [nvimage/index.ts:106](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L106)

#### Parameters

| Parameter          | Type                                           | Default value          |
| ------------------ | ---------------------------------------------- | ---------------------- |
| `dataBuffer`       | `ArrayBufferLike` \| `ArrayBuffer`[]           | `null`                 |
| `name`             | `string`                                       | `''`                   |
| `colormap`         | `string`                                       | `'gray'`               |
| `opacity`          | `number`                                       | `1.0`                  |
| `pairedImgData`    | `ArrayBuffer`                                  | `null`                 |
| `cal_min`          | `number`                                       | `NaN`                  |
| `cal_max`          | `number`                                       | `NaN`                  |
| `trustCalMinMax`   | `boolean`                                      | `true`                 |
| `percentileFrac`   | `number`                                       | `0.02`                 |
| `ignoreZeroVoxels` | `boolean`                                      | `false`                |
| `useQFormNotSForm` | `boolean`                                      | `false`                |
| `colormapNegative` | `string`                                       | `''`                   |
| `frame4D`          | `number`                                       | `0`                    |
| `imageType`        | [`ImageType`](../enumerations/ImageType.md)    | `NVIMAGE_TYPE.UNKNOWN` |
| `cal_minNeg`       | `number`                                       | `NaN`                  |
| `cal_maxNeg`       | `number`                                       | `NaN`                  |
| `colorbarVisible`  | `boolean`                                      | `true`                 |
| `colormapLabel`    | [`LUT`](../../colortables/type-aliases/LUT.md) | `null`                 |
| `colormapType`     | `number`                                       | `0`                    |

#### Returns

`NVImage`

## Properties

| Property                                         | Type                                                    | Default value | Defined in                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| <a id="_colormap"></a> `_colormap`               | `string`                                                | `undefined`   | [nvimage/index.ts:33](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L33)   |
| <a id="_opacity"></a> `_opacity`                 | `number`                                                | `undefined`   | [nvimage/index.ts:34](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L34)   |
| <a id="cal_max"></a> `cal_max?`                  | `number`                                                | `undefined`   | [nvimage/index.ts:95](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L95)   |
| <a id="cal_maxneg"></a> `cal_maxNeg`             | `number`                                                | `undefined`   | [nvimage/index.ts:46](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L46)   |
| <a id="cal_min"></a> `cal_min?`                  | `number`                                                | `undefined`   | [nvimage/index.ts:94](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L94)   |
| <a id="cal_minneg"></a> `cal_minNeg`             | `number`                                                | `undefined`   | [nvimage/index.ts:45](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L45)   |
| <a id="colorbarvisible"></a> `colorbarVisible`   | `boolean`                                               | `true`        | [nvimage/index.ts:47](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L47)   |
| <a id="colormapinvert"></a> `colormapInvert?`    | `boolean`                                               | `undefined`   | [nvimage/index.ts:41](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L41)   |
| <a id="colormaplabel"></a> `colormapLabel`       | [`LUT`](../../colortables/type-aliases/LUT.md)          | `undefined`   | [nvimage/index.ts:40](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L40)   |
| <a id="colormapnegative"></a> `colormapNegative` | `string`                                                | `undefined`   | [nvimage/index.ts:38](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L38)   |
| <a id="colormaptype"></a> `colormapType?`        | `number`                                                | `undefined`   | [nvimage/index.ts:58](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L58)   |
| <a id="dims"></a> `dims?`                        | `number`[]                                              | `undefined`   | [nvimage/index.ts:84](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L84)   |
| <a id="dimsras"></a> `dimsRAS?`                  | `number`[]                                              | `undefined`   | [nvimage/index.ts:64](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L64)   |
| <a id="extensions"></a> `extensions?`            | `NIFTIEXTENSION`[]                                      | `undefined`   | [nvimage/index.ts:78](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L78)   |
| <a id="extentsmaxortho"></a> `extentsMaxOrtho?`  | `number`[]                                              | `undefined`   | [nvimage/index.ts:74](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L74)   |
| <a id="extentsminortho"></a> `extentsMinOrtho?`  | `number`[]                                              | `undefined`   | [nvimage/index.ts:73](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L73)   |
| <a id="fileobject"></a> `fileObject?`            | `File` \| `File`[]                                      | `undefined`   | [nvimage/index.ts:83](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L83)   |
| <a id="frac2mm"></a> `frac2mm?`                  | `mat4`                                                  | `undefined`   | [nvimage/index.ts:71](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L71)   |
| <a id="frac2mmortho"></a> `frac2mmOrtho?`        | `mat4`                                                  | `undefined`   | [nvimage/index.ts:72](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L72)   |
| <a id="frame4d"></a> `frame4D`                   | `number`                                                | `undefined`   | [nvimage/index.ts:43](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L43)   |
| <a id="global_max"></a> `global_max?`            | `number`                                                | `undefined`   | [nvimage/index.ts:99](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L99)   |
| <a id="global_min"></a> `global_min?`            | `number`                                                | `undefined`   | [nvimage/index.ts:98](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L98)   |
| <a id="hdr"></a> `hdr`                           | `NIFTI1` \| `NIFTI2`                                    | `null`        | [nvimage/index.ts:77](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L77)   |
| <a id="headers"></a> `headers?`                  | `Record`\<`string`, `string`\>                          | `undefined`   | [nvimage/index.ts:32](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L32)   |
| <a id="id"></a> `id`                             | `string`                                                | `undefined`   | [nvimage/index.ts:30](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L30)   |
| <a id="ignorezerovoxels"></a> `ignoreZeroVoxels` | `boolean`                                               | `undefined`   | [nvimage/index.ts:36](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L36)   |
| <a id="imagetype"></a> `imageType?`              | [`ImageType`](../enumerations/ImageType.md)             | `undefined`   | [nvimage/index.ts:79](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L79)   |
| <a id="imaginary"></a> `imaginary?`              | `Float32Array`                                          | `undefined`   | [nvimage/index.ts:81](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L81)   |
| <a id="img"></a> `img?`                          | [`TypedVoxelArray`](../type-aliases/TypedVoxelArray.md) | `undefined`   | [nvimage/index.ts:80](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L80)   |
| <a id="img2rasstart"></a> `img2RASstart?`        | `number`[]                                              | `undefined`   | [nvimage/index.ts:67](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L67)   |
| <a id="img2rasstep"></a> `img2RASstep?`          | `number`[]                                              | `undefined`   | [nvimage/index.ts:66](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L66)   |
| <a id="ismanifest"></a> `isManifest?`            | `boolean`                                               | `undefined`   | [nvimage/index.ts:103](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L103) |
| <a id="limitframes4d"></a> `limitFrames4D?`      | `number`                                                | `undefined`   | [nvimage/index.ts:104](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L104) |
| <a id="matras"></a> `matRAS?`                    | `mat4`                                                  | `undefined`   | [nvimage/index.ts:61](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L61)   |
| <a id="maxsheardeg"></a> `maxShearDeg?`          | `number`                                                | `undefined`   | [nvimage/index.ts:55](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L55)   |
| <a id="mm000"></a> `mm000?`                      | `vec3`                                                  | `undefined`   | [nvimage/index.ts:89](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L89)   |
| <a id="mm001"></a> `mm001?`                      | `vec3`                                                  | `undefined`   | [nvimage/index.ts:92](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L92)   |
| <a id="mm010"></a> `mm010?`                      | `vec3`                                                  | `undefined`   | [nvimage/index.ts:91](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L91)   |
| <a id="mm100"></a> `mm100?`                      | `vec3`                                                  | `undefined`   | [nvimage/index.ts:90](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L90)   |
| <a id="mm2ortho"></a> `mm2ortho?`                | `mat4`                                                  | `undefined`   | [nvimage/index.ts:75](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L75)   |
| <a id="modulatealpha"></a> `modulateAlpha`       | `number`                                                | `0`           | [nvimage/index.ts:49](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L49)   |
| <a id="modulationimage"></a> `modulationImage`   | `number`                                                | `null`        | [nvimage/index.ts:48](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L48)   |
| <a id="name"></a> `name`                         | `string`                                                | `undefined`   | [nvimage/index.ts:29](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L29)   |
| <a id="nframe4d"></a> `nFrame4D?`                | `number`                                                | `undefined`   | [nvimage/index.ts:42](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L42)   |
| <a id="ntotalframe4d"></a> `nTotalFrame4D?`      | `number`                                                | `undefined`   | [nvimage/index.ts:44](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L44)   |
| <a id="nvox3d"></a> `nVox3D?`                    | `number`                                                | `undefined`   | [nvimage/index.ts:53](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L53)   |
| <a id="oblique_angle"></a> `oblique_angle?`      | `number`                                                | `undefined`   | [nvimage/index.ts:54](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L54)   |
| <a id="obliqueras"></a> `obliqueRAS?`            | `mat4`                                                  | `undefined`   | [nvimage/index.ts:63](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L63)   |
| <a id="oncolormapchange"></a> `onColormapChange` | (`img`: `NVImage`) => `void`                            | `undefined`   | [nvimage/index.ts:86](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L86)   |
| <a id="onopacitychange"></a> `onOpacityChange`   | (`img`: `NVImage`) => `void`                            | `undefined`   | [nvimage/index.ts:87](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L87)   |
| <a id="percentilefrac"></a> `percentileFrac`     | `number`                                                | `undefined`   | [nvimage/index.ts:35](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L35)   |
| <a id="permras"></a> `permRAS?`                  | `number`[]                                              | `undefined`   | [nvimage/index.ts:65](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L65)   |
| <a id="pixdims"></a> `pixDims?`                  | `number`[]                                              | `undefined`   | [nvimage/index.ts:60](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L60)   |
| <a id="pixdimsras"></a> `pixDimsRAS?`            | `number`[]                                              | `undefined`   | [nvimage/index.ts:62](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L62)   |
| <a id="robust_max"></a> `robust_max?`            | `number`                                                | `undefined`   | [nvimage/index.ts:97](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L97)   |
| <a id="robust_min"></a> `robust_min?`            | `number`                                                | `undefined`   | [nvimage/index.ts:96](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L96)   |
| <a id="series"></a> `series`                     | `any`                                                   | `[]`          | [nvimage/index.ts:52](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L52)   |
| <a id="toras"></a> `toRAS?`                      | `mat4`                                                  | `undefined`   | [nvimage/index.ts:68](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L68)   |
| <a id="torasvox"></a> `toRASvox?`                | `mat4`                                                  | `undefined`   | [nvimage/index.ts:69](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L69)   |
| <a id="trustcalminmax"></a> `trustCalMinMax`     | `boolean`                                               | `undefined`   | [nvimage/index.ts:37](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L37)   |
| <a id="url"></a> `url?`                          | `string`                                                | `undefined`   | [nvimage/index.ts:31](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L31)   |
| <a id="urlimgdata"></a> `urlImgData?`            | `string`                                                | `undefined`   | [nvimage/index.ts:102](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L102) |
| <a id="useqformnotsform"></a> `useQFormNotSForm` | `boolean`                                               | `undefined`   | [nvimage/index.ts:56](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L56)   |
| <a id="v1"></a> `v1?`                            | `Float32Array`                                          | `undefined`   | [nvimage/index.ts:82](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L82)   |

## Accessors

### colormap

#### Get Signature

```ts
get colormap(): string;
```

Defined in: [nvimage/index.ts:693](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L693)

##### Returns

`string`

#### Set Signature

```ts
set colormap(cm: string): void;
```

Defined in: [nvimage/index.ts:702](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L702)

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `cm`      | `string` |

##### Returns

`void`

---

### colorMap

#### Get Signature

```ts
get colorMap(): string;
```

Defined in: [nvimage/index.ts:697](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L697)

##### Returns

`string`

#### Set Signature

```ts
set colorMap(cm: string): void;
```

Defined in: [nvimage/index.ts:706](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L706)

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `cm`      | `string` |

##### Returns

`void`

---

### opacity

#### Get Signature

```ts
get opacity(): number;
```

Defined in: [nvimage/index.ts:710](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L710)

##### Returns

`number`

#### Set Signature

```ts
set opacity(opacity: number): void;
```

Defined in: [nvimage/index.ts:714](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L714)

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `opacity` | `number` |

##### Returns

`void`

## Methods

### applyOptionsUpdate()

```ts
applyOptionsUpdate(options: ImageFromUrlOptions): void;
```

Defined in: [nvimage/index.ts:1216](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1216)

Update options for image

#### Parameters

| Parameter | Type                                                            |
| --------- | --------------------------------------------------------------- |
| `options` | [`ImageFromUrlOptions`](../type-aliases/ImageFromUrlOptions.md) |

#### Returns

`void`

---

### arrayEquals()

```ts
arrayEquals(a: unknown[], b: unknown[]): boolean;
```

Defined in: [nvimage/index.ts:671](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L671)

#### Parameters

| Parameter | Type        |
| --------- | ----------- |
| `a`       | `unknown`[] |
| `b`       | `unknown`[] |

#### Returns

`boolean`

---

### calculateOblique()

```ts
calculateOblique(): void;
```

Defined in: [nvimage/index.ts:430](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L430)

#### Returns

`void`

---

### calculateRAS()

```ts
calculateRAS(): void;
```

Defined in: [nvimage/index.ts:638](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L638)

#### Returns

`void`

---

### calMinMax()

```ts
calMinMax(vol: number, isBorder: boolean): number[];
```

Defined in: [nvimage/index.ts:725](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L725)

set contrast/brightness to robust range (2%..98%)

#### Parameters

| Parameter  | Type      | Default value              | Description                                                                                         |
| ---------- | --------- | -------------------------- | --------------------------------------------------------------------------------------------------- |
| `vol`      | `number`  | `Number.POSITIVE_INFINITY` | volume for estimate (use -1 to use estimate on all loaded volumes; use INFINITY for current volume) |
| `isBorder` | `boolean` | `true`                     | if true (default) only center of volume used for estimate                                           |

#### Returns

`number`[]

volume brightness and returns array [pct2, pct98, mnScale, mxScale]

#### See

[live demo usage](https://niivue.com/demos/features/timeseries2.html)

---

### clone()

```ts
clone(): NVImage;
```

Defined in: [nvimage/index.ts:1143](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1143)

make a clone of a NVImage instance and return a new NVImage

#### Returns

`NVImage`

#### Example

```ts
myImage = NVImage.loadFromFile(SomeFileObject); // files can be from dialogs or drag and drop
clonedImage = myImage.clone();
```

---

### computeObliqueAngle()

```ts
computeObliqueAngle(mtx44: mat4): number;
```

Defined in: [nvimage/index.ts:416](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L416)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `mtx44`   | `mat4` |

#### Returns

`number`

---

### convertFrac2MM()

```ts
convertFrac2MM(frac: vec3, isForceSliceMM: boolean): vec4;
```

Defined in: [nvimage/index.ts:1245](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1245)

#### Parameters

| Parameter        | Type      | Default value |
| ---------------- | --------- | ------------- |
| `frac`           | `vec3`    | `undefined`   |
| `isForceSliceMM` | `boolean` | `false`       |

#### Returns

`vec4`

---

### convertFrac2Vox()

```ts
convertFrac2Vox(frac: vec3): vec3;
```

Defined in: [nvimage/index.ts:1240](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1240)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `frac`    | `vec3` |

#### Returns

`vec3`

---

### convertMM2Frac()

```ts
convertMM2Frac(mm:
  | [number, number, number, number]
  | Float32Array
  | [number, number, number], isForceSliceMM: boolean): vec3;
```

Defined in: [nvimage/index.ts:1250](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1250)

#### Parameters

| Parameter        | Type                                                                                                | Default value |
| ---------------- | --------------------------------------------------------------------------------------------------- | ------------- |
| `mm`             | \| \[`number`, `number`, `number`, `number`\] \| `Float32Array` \| \[`number`, `number`, `number`\] | `undefined`   |
| `isForceSliceMM` | `boolean`                                                                                           | `false`       |

#### Returns

`vec3`

---

### convertVox2Frac()

```ts
convertVox2Frac(vox: vec3): vec3;
```

Defined in: [nvimage/index.ts:1235](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1235)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `vox`     | `vec3` |

#### Returns

`vec3`

---

### float32V1asRGBA()

```ts
float32V1asRGBA(inImg: Float32Array): Uint8Array;
```

Defined in: [nvimage/index.ts:420](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L420)

#### Parameters

| Parameter | Type           |
| --------- | -------------- |
| `inImg`   | `Float32Array` |

#### Returns

`Uint8Array`

---

### getImageMetadata()

```ts
getImageMetadata(): ImageMetadata;
```

Defined in: [nvimage/index.ts:1169](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1169)

get nifti specific metadata about the image

#### Returns

[`ImageMetadata`](../type-aliases/ImageMetadata.md)

---

### getImageOptions()

```ts
getImageOptions(): ImageFromUrlOptions;
```

Defined in: [nvimage/index.ts:1220](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1220)

#### Returns

[`ImageFromUrlOptions`](../type-aliases/ImageFromUrlOptions.md)

---

### getValue()

```ts
getValue(
   x: number,
   y: number,
   z: number,
   frame4D: number,
   isReadImaginary: boolean): number;
```

Defined in: [nvimage/index.ts:1201](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1201)

Returns voxel intensity at specific native coordinates.
Delegates to VolumeUtils.getValue.

#### Parameters

| Parameter         | Type      | Default value |
| ----------------- | --------- | ------------- |
| `x`               | `number`  | `undefined`   |
| `y`               | `number`  | `undefined`   |
| `z`               | `number`  | `undefined`   |
| `frame4D`         | `number`  | `0`           |
| `isReadImaginary` | `boolean` | `false`       |

#### Returns

`number`

---

### getValues()

```ts
getValues(
   x: number,
   y: number,
   z: number,
   frame4D: number,
   isReadImaginary: boolean): number[];
```

Defined in: [nvimage/index.ts:1209](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1209)

Returns voxel intensities at specific native coordinates.
Delegates to VolumeUtils.getValue.

#### Parameters

| Parameter         | Type      | Default value |
| ----------------- | --------- | ------------- |
| `x`               | `number`  | `undefined`   |
| `y`               | `number`  | `undefined`   |
| `z`               | `number`  | `undefined`   |
| `frame4D`         | `number`  | `0`           |
| `isReadImaginary` | `boolean` | `false`       |

#### Returns

`number`[]

---

### getVolumeData()

```ts
getVolumeData(
   voxStart: number[],
   voxEnd: number[],
   dataType: string): [TypedVoxelArray, number[]];
```

Defined in: [nvimage/index.ts:1058](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1058)

read a 3D slab of voxels from a volume, specified in RAS coordinates.
Delegates to VolumeUtils.getVolumeData.

#### Parameters

| Parameter  | Type       | Default value |
| ---------- | ---------- | ------------- |
| `voxStart` | `number`[] | `...`         |
| `voxEnd`   | `number`[] | `...`         |
| `dataType` | `string`   | `'same'`      |

#### Returns

\[[`TypedVoxelArray`](../type-aliases/TypedVoxelArray.md), `number`[]\]

---

### hdr2RAS()

```ts
hdr2RAS(nVolumes: number): Promise<NIFTI1 | NIFTI2>;
```

Defined in: [nvimage/index.ts:645](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L645)

#### Parameters

| Parameter  | Type     | Default value |
| ---------- | -------- | ------------- |
| `nVolumes` | `number` | `1`           |

#### Returns

`Promise`\<`NIFTI1` \| `NIFTI2`\>

---

### imageDataFromArrayBuffer()

```ts
imageDataFromArrayBuffer(buffer: ArrayBuffer): Promise<ImageData>;
```

Defined in: [nvimage/index.ts:583](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L583)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`Promise`\<`ImageData`\>

---

### img2RAS()

```ts
img2RAS(nVolume: number): TypedVoxelArray;
```

Defined in: [nvimage/index.ts:652](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L652)

#### Parameters

| Parameter | Type     | Default value |
| --------- | -------- | ------------- |
| `nVolume` | `number` | `0`           |

#### Returns

[`TypedVoxelArray`](../type-aliases/TypedVoxelArray.md)

---

### init()

```ts
init(
   dataBuffer: ArrayBufferLike | ArrayBuffer[],
   name: string,
   colormap: string,
   opacity: number,
   _pairedImgData: ArrayBuffer,
   cal_min: number,
   cal_max: number,
   trustCalMinMax: boolean,
   percentileFrac: number,
   ignoreZeroVoxels: boolean,
   useQFormNotSForm: boolean,
   colormapNegative: string,
   frame4D: number,
   imageType: ImageType,
   cal_minNeg: number,
   cal_maxNeg: number,
   colorbarVisible: boolean,
   colormapLabel: LUT,
   colormapType: number,
   imgRaw: ArrayBufferLike): void;
```

Defined in: [nvimage/index.ts:153](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L153)

#### Parameters

| Parameter          | Type                                           | Default value          |
| ------------------ | ---------------------------------------------- | ---------------------- |
| `dataBuffer`       | `ArrayBufferLike` \| `ArrayBuffer`[]           | `null`                 |
| `name`             | `string`                                       | `''`                   |
| `colormap`         | `string`                                       | `''`                   |
| `opacity`          | `number`                                       | `1.0`                  |
| `_pairedImgData`   | `ArrayBuffer`                                  | `null`                 |
| `cal_min`          | `number`                                       | `NaN`                  |
| `cal_max`          | `number`                                       | `NaN`                  |
| `trustCalMinMax`   | `boolean`                                      | `true`                 |
| `percentileFrac`   | `number`                                       | `0.02`                 |
| `ignoreZeroVoxels` | `boolean`                                      | `false`                |
| `useQFormNotSForm` | `boolean`                                      | `false`                |
| `colormapNegative` | `string`                                       | `''`                   |
| `frame4D`          | `number`                                       | `0`                    |
| `imageType`        | [`ImageType`](../enumerations/ImageType.md)    | `NVIMAGE_TYPE.UNKNOWN` |
| `cal_minNeg`       | `number`                                       | `NaN`                  |
| `cal_maxNeg`       | `number`                                       | `NaN`                  |
| `colorbarVisible`  | `boolean`                                      | `true`                 |
| `colormapLabel`    | [`LUT`](../../colortables/type-aliases/LUT.md) | `null`                 |
| `colormapType`     | `number`                                       | `0`                    |
| `imgRaw`           | `ArrayBufferLike`                              | `null`                 |

#### Returns

`void`

---

### intensityRaw2Scaled()

```ts
intensityRaw2Scaled(raw: number): number;
```

Defined in: [nvimage/index.ts:731](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L731)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `raw`     | `number` |

#### Returns

`number`

---

### intensityScaled2Raw()

```ts
intensityScaled2Raw(scaled: number): number;
```

Defined in: [nvimage/index.ts:736](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L736)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `scaled`  | `number` |

#### Returns

`number`

---

### loadImgV1()

```ts
loadImgV1(
   isFlipX: boolean,
   isFlipY: boolean,
   isFlipZ: boolean): boolean;
```

Defined in: [nvimage/index.ts:424](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L424)

#### Parameters

| Parameter | Type      | Default value |
| --------- | --------- | ------------- |
| `isFlipX` | `boolean` | `false`       |
| `isFlipY` | `boolean` | `false`       |
| `isFlipZ` | `boolean` | `false`       |

#### Returns

`boolean`

---

### mm2vox()

```ts
mm2vox(mm: number[], frac: boolean): vec3;
```

Defined in: [nvimage/index.ts:664](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L664)

#### Parameters

| Parameter | Type       | Default value |
| --------- | ---------- | ------------- |
| `mm`      | `number`[] | `undefined`   |
| `frac`    | `boolean`  | `false`       |

#### Returns

`vec3`

---

### readBMP()

```ts
readBMP(buffer: ArrayBuffer): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:587](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L587)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readECAT()

```ts
readECAT(buffer: ArrayBuffer): ArrayBuffer;
```

Defined in: [nvimage/index.ts:567](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L567)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`ArrayBuffer`

---

### readFIB()

```ts
readFIB(buffer: ArrayBuffer): Promise<[ArrayBuffer, Float32Array]>;
```

Defined in: [nvimage/index.ts:605](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L605)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`Promise`\<\[`ArrayBuffer`, `Float32Array`\]\>

---

### readHEAD()

```ts
readHEAD(dataBuffer: ArrayBuffer, pairedImgData: ArrayBuffer): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:618](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L618)

#### Parameters

| Parameter       | Type          |
| --------------- | ------------- |
| `dataBuffer`    | `ArrayBuffer` |
| `pairedImgData` | `ArrayBuffer` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readMHA()

```ts
readMHA(buffer: ArrayBuffer, pairedImgData: ArrayBuffer): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:625](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L625)

#### Parameters

| Parameter       | Type          |
| --------------- | ------------- |
| `buffer`        | `ArrayBuffer` |
| `pairedImgData` | `ArrayBuffer` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readMIF()

```ts
readMIF(buffer: ArrayBuffer, pairedImgData: ArrayBuffer): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:632](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L632)

#### Parameters

| Parameter       | Type          |
| --------------- | ------------- |
| `buffer`        | `ArrayBuffer` |
| `pairedImgData` | `ArrayBuffer` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readNPY()

```ts
readNPY(buffer: ArrayBuffer): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:575](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L575)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readNPZ()

```ts
readNPZ(buffer: ArrayBuffer): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:579](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L579)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readSRC()

```ts
readSRC(buffer: ArrayBuffer): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:612](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L612)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readV16()

```ts
readV16(buffer: ArrayBuffer): ArrayBuffer;
```

Defined in: [nvimage/index.ts:571](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L571)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`ArrayBuffer`

---

### readVMR()

```ts
readVMR(buffer: ArrayBuffer): ArrayBuffer;
```

Defined in: [nvimage/index.ts:598](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L598)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`ArrayBuffer`

---

### readZARR()

```ts
readZARR(buffer: ArrayBuffer, zarrData: unknown): Promise<ArrayBufferLike>;
```

Defined in: [nvimage/index.ts:591](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L591)

#### Parameters

| Parameter  | Type          |
| ---------- | ------------- |
| `buffer`   | `ArrayBuffer` |
| `zarrData` | `unknown`     |

#### Returns

`Promise`\<`ArrayBufferLike`\>

---

### saveToDisk()

```ts
saveToDisk(fnm: string, drawing8: Uint8Array): Promise<Uint8Array>;
```

Defined in: [nvimage/index.ts:753](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L753)

save image as NIfTI volume and trigger download.
Delegates to ImageWriter.saveToDisk.

#### Parameters

| Parameter  | Type         | Default value |
| ---------- | ------------ | ------------- |
| `fnm`      | `string`     | `''`          |
| `drawing8` | `Uint8Array` | `null`        |

#### Returns

`Promise`\<`Uint8Array`\>

---

### saveToUint8Array()

```ts
saveToUint8Array(fnm: string, drawing8: Uint8Array): Promise<Uint8Array>;
```

Defined in: [nvimage/index.ts:744](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L744)

Converts NVImage to NIfTI compliant byte array, potentially compressed.
Delegates to ImageWriter.saveToUint8Array.

#### Parameters

| Parameter  | Type         | Default value |
| ---------- | ------------ | ------------- |
| `fnm`      | `string`     | `undefined`   |
| `drawing8` | `Uint8Array` | `null`        |

#### Returns

`Promise`\<`Uint8Array`\>

---

### setColormap()

```ts
setColormap(cm: string): void;
```

Defined in: [nvimage/index.ts:678](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L678)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `cm`      | `string` |

#### Returns

`void`

---

### setColormapLabel()

```ts
setColormapLabel(cm: ColorMap): void;
```

Defined in: [nvimage/index.ts:685](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L685)

#### Parameters

| Parameter | Type                                                     |
| --------- | -------------------------------------------------------- |
| `cm`      | [`ColorMap`](../../colortables/type-aliases/ColorMap.md) |

#### Returns

`void`

---

### setColormapLabelFromUrl()

```ts
setColormapLabelFromUrl(url: string): Promise<void>;
```

Defined in: [nvimage/index.ts:689](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L689)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `url`     | `string` |

#### Returns

`Promise`\<`void`\>

---

### setVolumeData()

```ts
setVolumeData(
   voxStart: number[],
   voxEnd: number[],
   img: TypedVoxelArray): void;
```

Defined in: [nvimage/index.ts:1072](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1072)

write a 3D slab of voxels from a volume, specified in RAS coordinates.
Delegates to VolumeUtils.setVolumeData.
Input slabData is assumed to be in the correct raw data type for the target image.

#### Parameters

| Parameter  | Type                                                    |
| ---------- | ------------------------------------------------------- |
| `voxStart` | `number`[]                                              |
| `voxEnd`   | `number`[]                                              |
| `img`      | [`TypedVoxelArray`](../type-aliases/TypedVoxelArray.md) |

#### Returns

`void`

---

### toUint8Array()

```ts
toUint8Array(drawingBytes: Uint8Array): Uint8Array;
```

Defined in: [nvimage/index.ts:1229](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1229)

Converts NVImage to NIfTI compliant byte array.
Handles potential re-orientation of drawing data.
Delegates to ImageWriter.toUint8Array.

#### Parameters

| Parameter      | Type         | Default value |
| -------------- | ------------ | ------------- |
| `drawingBytes` | `Uint8Array` | `null`        |

#### Returns

`Uint8Array`

---

### vox2mm()

```ts
vox2mm(XYZ: number[], mtx: mat4): vec3;
```

Defined in: [nvimage/index.ts:658](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L658)

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `XYZ`     | `number`[] |
| `mtx`     | `mat4`     |

#### Returns

`vec3`

---

### zeroImage()

```ts
zeroImage(): void;
```

Defined in: [nvimage/index.ts:1162](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1162)

fill a NVImage instance with zeros for the image data

#### Returns

`void`

#### Example

```ts
myImage = NVImage.loadFromFile(SomeFileObject); // files can be from dialogs or drag and drop
clonedImageWithZeros = myImage.clone().zeroImage();
```

---

### createNiftiArray()

```ts
static createNiftiArray(
   dims: number[],
   pixDims: number[],
   affine: number[],
   datatypeCode: NiiDataType,
   img: TypedVoxelArray): Uint8Array;
```

Defined in: [nvimage/index.ts:1026](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1026)

Creates a Uint8Array representing a NIFTI file (header + optional image data).
Delegates to ImageWriter.createNiftiArray.

#### Parameters

| Parameter      | Type                                                    | Default value          |
| -------------- | ------------------------------------------------------- | ---------------------- |
| `dims`         | `number`[]                                              | `...`                  |
| `pixDims`      | `number`[]                                              | `...`                  |
| `affine`       | `number`[]                                              | `...`                  |
| `datatypeCode` | [`NiiDataType`](../enumerations/NiiDataType.md)         | `NiiDataType.DT_UINT8` |
| `img`          | [`TypedVoxelArray`](../type-aliases/TypedVoxelArray.md) | `...`                  |

#### Returns

`Uint8Array`

---

### createNiftiHeader()

```ts
static createNiftiHeader(
   dims: number[],
   pixDims: number[],
   affine: number[],
   datatypeCode: NiiDataType): NIFTI1;
```

Defined in: [nvimage/index.ts:1040](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1040)

Creates a NIFTI1 header object with basic properties.
Delegates to ImageWriter.createNiftiHeader.

#### Parameters

| Parameter      | Type                                            | Default value          |
| -------------- | ----------------------------------------------- | ---------------------- |
| `dims`         | `number`[]                                      | `...`                  |
| `pixDims`      | `number`[]                                      | `...`                  |
| `affine`       | `number`[]                                      | `...`                  |
| `datatypeCode` | [`NiiDataType`](../enumerations/NiiDataType.md) | `NiiDataType.DT_UINT8` |

#### Returns

`NIFTI1`

---

### extractFilenameFromUrl()

```ts
static extractFilenameFromUrl(url: string): string;
```

Defined in: [nvimage/index.ts:766](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L766)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `url`     | `string` |

#### Returns

`string`

---

### fetchDicomData()

```ts
static fetchDicomData(url: string, headers: Record<string, string>): Promise<object[]>;
```

Defined in: [nvimage/index.ts:758](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L758)

#### Parameters

| Parameter | Type                           |
| --------- | ------------------------------ |
| `url`     | `string`                       |
| `headers` | `Record`\<`string`, `string`\> |

#### Returns

`Promise`\<`object`[]\>

---

### loadFromBase64()

```ts
static loadFromBase64(__namedParameters: ImageFromBase64): Promise<NVImage>;
```

Defined in: [nvimage/index.ts:1081](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1081)

factory function to load and return a new NVImage instance from a base64 encoded string

#### Parameters

| Parameter           | Type                                                    |
| ------------------- | ------------------------------------------------------- |
| `__namedParameters` | [`ImageFromBase64`](../type-aliases/ImageFromBase64.md) |

#### Returns

`Promise`\<`NVImage`\>

#### Example

```ts
myImage = NVImage.loadFromBase64("SomeBase64String");
```

---

### loadFromFile()

```ts
static loadFromFile(__namedParameters: ImageFromFileOptions): Promise<NVImage>;
```

Defined in: [nvimage/index.ts:932](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L932)

factory function to load and return a new NVImage instance from a file in the browser

#### Parameters

| Parameter           | Type                                                              |
| ------------------- | ----------------------------------------------------------------- |
| `__namedParameters` | [`ImageFromFileOptions`](../type-aliases/ImageFromFileOptions.md) |

#### Returns

`Promise`\<`NVImage`\>

---

### loadFromUrl()

```ts
static loadFromUrl(__namedParameters: Partial<Omit<ImageFromUrlOptions, "url">> & object): Promise<NVImage>;
```

Defined in: [nvimage/index.ts:781](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L781)

factory function to load and return a new NVImage instance from a given URL

#### Parameters

| Parameter           | Type                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------- |
| `__namedParameters` | `Partial`\<`Omit`\<[`ImageFromUrlOptions`](../type-aliases/ImageFromUrlOptions.md), `"url"`\>\> & `object` |

#### Returns

`Promise`\<`NVImage`\>

---

### loadInitialVolumes()

```ts
static loadInitialVolumes(
   url: string,
   headers: object,
limitFrames4D: number): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:774](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L774)

#### Parameters

| Parameter       | Type     | Default value |
| --------------- | -------- | ------------- |
| `url`           | `string` | `''`          |
| `headers`       | \{ \}    | `{}`          |
| `limitFrames4D` | `number` | `NaN`         |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### loadInitialVolumesGz()

```ts
static loadInitialVolumesGz(
   url: string,
   headers: object,
limitFrames4D: number): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:770](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L770)

#### Parameters

| Parameter       | Type     | Default value |
| --------------- | -------- | ------------- |
| `url`           | `string` | `''`          |
| `headers`       | \{ \}    | `{}`          |
| `limitFrames4D` | `number` | `NaN`         |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### new()

```ts
static new(
   dataBuffer: ArrayBufferLike | ArrayBuffer[],
   name: string,
   colormap: string,
   opacity: number,
   pairedImgData: ArrayBuffer,
   cal_min: number,
   cal_max: number,
   trustCalMinMax: boolean,
   percentileFrac: number,
   ignoreZeroVoxels: boolean,
   useQFormNotSForm: boolean,
   colormapNegative: string,
   frame4D: number,
   imageType: ImageType,
   cal_minNeg: number,
   cal_maxNeg: number,
   colorbarVisible: boolean,
   colormapLabel: LUT,
   colormapType: number,
zarrData: unknown): Promise<NVImage>;
```

Defined in: [nvimage/index.ts:277](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L277)

#### Parameters

| Parameter          | Type                                           | Default value          |
| ------------------ | ---------------------------------------------- | ---------------------- |
| `dataBuffer`       | `ArrayBufferLike` \| `ArrayBuffer`[]           | `null`                 |
| `name`             | `string`                                       | `''`                   |
| `colormap`         | `string`                                       | `''`                   |
| `opacity`          | `number`                                       | `1.0`                  |
| `pairedImgData`    | `ArrayBuffer`                                  | `null`                 |
| `cal_min`          | `number`                                       | `NaN`                  |
| `cal_max`          | `number`                                       | `NaN`                  |
| `trustCalMinMax`   | `boolean`                                      | `true`                 |
| `percentileFrac`   | `number`                                       | `0.02`                 |
| `ignoreZeroVoxels` | `boolean`                                      | `false`                |
| `useQFormNotSForm` | `boolean`                                      | `false`                |
| `colormapNegative` | `string`                                       | `''`                   |
| `frame4D`          | `number`                                       | `0`                    |
| `imageType`        | [`ImageType`](../enumerations/ImageType.md)    | `NVIMAGE_TYPE.UNKNOWN` |
| `cal_minNeg`       | `number`                                       | `NaN`                  |
| `cal_maxNeg`       | `number`                                       | `NaN`                  |
| `colorbarVisible`  | `boolean`                                      | `true`                 |
| `colormapLabel`    | [`LUT`](../../colortables/type-aliases/LUT.md) | `null`                 |
| `colormapType`     | `number`                                       | `0`                    |
| `zarrData`         | `unknown`                                      | `undefined`            |

#### Returns

`Promise`\<`NVImage`\>

---

### readFileAsync()

```ts
static readFileAsync(file: File, bytesToLoad: number): Promise<ArrayBuffer>;
```

Defined in: [nvimage/index.ts:925](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L925)

#### Parameters

| Parameter     | Type     | Default value |
| ------------- | -------- | ------------- |
| `file`        | `File`   | `undefined`   |
| `bytesToLoad` | `number` | `NaN`         |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readFirstDecompressedBytes()

```ts
static readFirstDecompressedBytes(stream: ReadableStream<Uint8Array>, minBytes: number): Promise<Uint8Array>;
```

Defined in: [nvimage/index.ts:762](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L762)

#### Parameters

| Parameter  | Type                             |
| ---------- | -------------------------------- |
| `stream`   | `ReadableStream`\<`Uint8Array`\> |
| `minBytes` | `number`                         |

#### Returns

`Promise`\<`Uint8Array`\>

---

### zerosLike()

```ts
static zerosLike(nvImage: NVImage, dataType: string): NVImage;
```

Defined in: [nvimage/index.ts:1179](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/index.ts#L1179)

a factory function to make a zero filled image given a NVImage as a reference

#### Parameters

| Parameter  | Type      | Default value |
| ---------- | --------- | ------------- |
| `nvImage`  | `NVImage` | `undefined`   |
| `dataType` | `string`  | `'same'`      |

#### Returns

`NVImage`

#### Example

```ts
myImage = NVImage.loadFromFile(SomeFileObject); // files can be from dialogs or drag and drop
newZeroImage = NVImage.zerosLike(myImage);
```
