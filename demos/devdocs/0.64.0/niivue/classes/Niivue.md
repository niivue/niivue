# Class: Niivue

Defined in: [niivue/index.ts:366](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L366)

Niivue can be attached to a canvas. An instance of Niivue contains methods for
loading and rendering NIFTI image data in a WebGL 2.0 context.

## Example

```ts
let niivue = new Niivue({ crosshairColor: [0, 1, 0, 0.5], textHeight: 0.5 }); // a see-through green crosshair, and larger text labels
```

## Constructors

### Constructor

```ts
new Niivue(options: Partial<NVConfigOptions>): Niivue;
```

Defined in: [niivue/index.ts:898](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L898)

#### Parameters

| Parameter | Type                                                                               | Default value     | Description                                        |
| --------- | ---------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------- |
| `options` | `Partial`\<[`NVConfigOptions`](../../nvdocument/type-aliases/NVConfigOptions.md)\> | `DEFAULT_OPTIONS` | options object to set modifiable Niivue properties |

#### Returns

`Niivue`

## Properties

| Property                                                                       | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Default value            | Description                                                                                                                                                                                                                                                                                                         | Defined in                                                                                                 |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| <a id="_gl"></a> `_gl`                                                         | `WebGL2RenderingContext`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:379](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L379) |
| <a id="back"></a> `back`                                                       | [`NVImage`](../../nvimage/classes/NVImage.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:519](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L519) |
| <a id="backgroundmasksoverlays"></a> `backgroundMasksOverlays`                 | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:458](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L458) |
| <a id="blurshader"></a> `blurShader`                                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:445](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L445) |
| <a id="bmpshader"></a> `bmpShader`                                             | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:432](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L432) |
| <a id="bmptexture"></a> `bmpTexture`                                           | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:433](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L433) |
| <a id="bmptexturewh"></a> `bmpTextureWH`                                       | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `1.0`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:435](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L435) |
| <a id="canvas"></a> `canvas`                                                   | `HTMLCanvasElement`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:378](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L378) |
| <a id="circleshader"></a> `circleShader?`                                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:430](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L430) |
| <a id="clicktosegmentgrowingbitmap"></a> `clickToSegmentGrowingBitmap`         | `Uint8Array`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:396](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L396) |
| <a id="clicktosegmentisgrowing"></a> `clickToSegmentIsGrowing`                 | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:395](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L395) |
| <a id="clicktosegmentxy"></a> `clickToSegmentXY`                               | `number`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:397](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L397) |
| <a id="clip_plane_id"></a> `CLIP_PLANE_ID`                                     | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `1`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:548](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L548) |
| <a id="colorbarheight"></a> `colorbarHeight`                                   | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:399](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L399) |
| <a id="colorbarshader"></a> `colorbarShader?`                                  | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:425](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L425) |
| <a id="colormaplists"></a> `colormapLists`                                     | `ColormapListEntry`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:383](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L383) |
| <a id="colormaptexture"></a> `colormapTexture`                                 | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:382](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L382) |
| <a id="crosshairs3d"></a> `crosshairs3D`                                       | `NiivueObject3D`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:451](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L451) |
| <a id="cuboidvertexbuffer"></a> `cuboidVertexBuffer?`                          | `WebGLBuffer`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:537](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L537) |
| <a id="currentclipplaneindex"></a> `currentClipPlaneIndex`                     | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:544](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L544) |
| <a id="currentdrawundobitmap"></a> `currentDrawUndoBitmap`                     | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:893](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L893) |
| <a id="customlayout"></a> `customLayout`                                       | `object`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:560](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L560) |
| <a id="customsliceshader"></a> `customSliceShader`                             | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:426](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L426) |
| <a id="deferredmeshes"></a> `deferredMeshes`                                   | [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md)[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:522](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L522) |
| <a id="deferredvolumes"></a> `deferredVolumes`                                 | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:521](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L521) |
| <a id="dicomloader"></a> `dicomLoader`                                         | [`DicomLoader`](../type-aliases/DicomLoader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:369](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L369) |
| <a id="distance_from_camera"></a> `DISTANCE_FROM_CAMERA`                       | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `-0.54`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:550](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L550) |
| <a id="document"></a> `document`                                               | `NVDocument`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:852](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L852) |
| <a id="dragmodes"></a> `dragModes`                                             | `object`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:630](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L630) |
| `dragModes.angle`                                                              | `DRAG_MODE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `DRAG_MODE.angle`        | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:633](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L633) |
| `dragModes.callbackOnly`                                                       | `DRAG_MODE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `DRAG_MODE.callbackOnly` | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:637](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L637) |
| `dragModes.contrast`                                                           | `DRAG_MODE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `DRAG_MODE.contrast`     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:631](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L631) |
| `dragModes.measurement`                                                        | `DRAG_MODE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `DRAG_MODE.measurement`  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:632](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L632) |
| `dragModes.none`                                                               | `DRAG_MODE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `DRAG_MODE.none`         | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:634](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L634) |
| `dragModes.pan`                                                                | `DRAG_MODE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `DRAG_MODE.pan`          | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:635](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L635) |
| `dragModes.slicer3D`                                                           | `DRAG_MODE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `DRAG_MODE.slicer3D`     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:636](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L636) |
| <a id="drawfilloverwrites"></a> `drawFillOverwrites`                           | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `true`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:402](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L402) |
| <a id="drawlut"></a> `drawLut`                                                 | [`LUT`](../../colortables/type-aliases/LUT.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:392](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L392) |
| <a id="drawopacity"></a> `drawOpacity`                                         | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0.8`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:393](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L393) |
| <a id="drawpenaxcorsag"></a> `drawPenAxCorSag`                                 | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `-1`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:401](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L401) |
| <a id="drawpenfillpts"></a> `drawPenFillPts`                                   | `number`[][]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:403](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L403) |
| <a id="drawpenlocation"></a> `drawPenLocation`                                 | `number`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:400](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L400) |
| <a id="drawrimopacity"></a> `drawRimOpacity`                                   | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `-1.0`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:394](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L394) |
| <a id="drawshapepreviewbitmap"></a> `drawShapePreviewBitmap`                   | `Uint8Array`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:405](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L405) |
| <a id="drawshapestartlocation"></a> `drawShapeStartLocation`                   | `number`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:404](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L404) |
| <a id="drawtexture"></a> `drawTexture`                                         | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:389](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L389) |
| <a id="drawundobitmaps"></a> `drawUndoBitmaps`                                 | `Uint8Array`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:391](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L391) |
| <a id="extentsmax"></a> `extentsMax?`                                          | `vec3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:463](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L463) |
| <a id="extentsmin"></a> `extentsMin?`                                          | `vec3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:462](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L462) |
| <a id="fibershader"></a> `fiberShader?`                                        | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:428](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L428) |
| <a id="fontshader"></a> `fontShader`                                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:427](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L427) |
| <a id="fonttexture"></a> `fontTexture`                                         | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:429](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L429) |
| <a id="furthestfrompivot"></a> `furthestFromPivot`                             | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `10.0`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:542](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L542) |
| <a id="furthestvertexfromorigin"></a> `furthestVertexFromOrigin`               | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `100`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:523](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L523) |
| <a id="genericvao"></a> `genericVAO`                                           | `WebGLVertexArrayObject`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:449](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L449) |
| <a id="gradienttexture"></a> `gradientTexture`                                 | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:385](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L385) |
| <a id="gradienttextureamount"></a> `gradientTextureAmount`                     | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0.0`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:386](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L386) |
| <a id="graph"></a> `graph`                                                     | `Graph`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:551](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L551) |
| <a id="growcutshader"></a> `growCutShader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:436](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L436) |
| <a id="initialized"></a> `initialized`                                         | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:892](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L892) |
| <a id="isbusy"></a> `isBusy`                                                   | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:380](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L380) |
| <a id="lastcalled"></a> `lastCalled`                                           | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:545](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L545) |
| <a id="line3dshader"></a> `line3DShader?`                                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:417](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L417) |
| <a id="lineshader"></a> `lineShader?`                                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:416](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L416) |
| <a id="loaders"></a> `loaders`                                                 | `object`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `{}`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:367](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L367) |
| <a id="matcaptexture"></a> `matCapTexture`                                     | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:431](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L431) |
| <a id="mediaurlmap"></a> `mediaUrlMap`                                         | `Map`\< \| [`NVMesh`](../../nvmesh/classes/NVMesh.md) \| [`NVImage`](../../nvimage/classes/NVImage.md), `string`\>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:891](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L891) |
| <a id="meshshaders"></a> `meshShaders`                                         | `object`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:566](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L566) |
| <a id="mousepos"></a> `mousePos`                                               | `number`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:526](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L526) |
| <a id="needsrefresh"></a> `needsRefresh`                                       | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:381](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L381) |
| <a id="onazimuthelevationchange"></a> `onAzimuthElevationChange`               | (`azimuth`: `number`, `elevation`: `number`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `undefined`              | callback function to run when the user changes the rotation of the 3D rendering **Example** `niivue.onAzimuthElevationChange = (azimuth, elevation) => { console.log('azimuth: ', azimuth) console.log('elevation: ', elevation) }`                                                                                 | [niivue/index.ts:815](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L815) |
| <a id="onclicktosegment"></a> `onClickToSegment`                               | (`data`: `object`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | callback function when clickToSegment is enabled and the user clicks on the image. data contains the volume of the segmented region in mm3 and mL **Example** `niivue.onClickToSegment = (data) => { console.log('clicked to segment') console.log('volume mm3: ', data.mm3) console.log('volume mL: ', data.mL) }` | [niivue/index.ts:696](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L696) |
| <a id="onclipplanechange"></a> `onClipPlaneChange`                             | (`clipPlane`: `number`[]) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `undefined`              | callback function to run when the user changes the clip plane **Example** `niivue.onClipPlaneChange = (clipPlane) => { console.log('clipPlane: ', clipPlane) }`                                                                                                                                                     | [niivue/index.ts:824](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L824) |
| <a id="oncolormapchange"></a> `onColormapChange`                               | () => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:739](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L739) |
| <a id="oncustommeshshaderadded"></a> `onCustomMeshShaderAdded`                 | (`fragmentShaderText`: `string`, `name`: `string`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:825](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L825) |
| <a id="ondebug"></a> `onDebug`                                                 | () => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | callback function to run when niivue reports a debug message **Example** `niivue.onDebug = (debug) => { console.log('debug: ', debug) }`                                                                                                                                                                            | [niivue/index.ts:766](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L766) |
| <a id="ondicomloaderfinishedwithimages"></a> `onDicomLoaderFinishedWithImages` | (`files`: \| [`NVImage`](../../nvimage/classes/NVImage.md)[] \| [`NVMesh`](../../nvmesh/classes/NVMesh.md)[]) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:829](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L829) |
| <a id="ondocumentloaded"></a> `onDocumentLoaded`                               | (`document`: `NVDocument`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `undefined`              | callback function to run when the user loads a new NiiVue document **Example** `niivue.onDocumentLoaded = (document) => { console.log('document: ', document) }`                                                                                                                                                    | [niivue/index.ts:838](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L838) |
| <a id="ondragrelease"></a> `onDragRelease`                                     | (`params`: [`DragReleaseParams`](../../types/type-aliases/DragReleaseParams.md)) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | callback function to run when the right mouse button is released after dragging **Example** `niivue.onDragRelease = () => { console.log('drag ended') }`                                                                                                                                                            | [niivue/index.ts:655](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L655) |
| <a id="onerror"></a> `onError`                                                 | () => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | callback function to run when niivue reports an error **Example** `niivue.onError = (error) => { console.log('error: ', error) }`                                                                                                                                                                                   | [niivue/index.ts:736](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L736) |
| <a id="onframechange"></a> `onFrameChange`                                     | (`volume`: [`NVImage`](../../nvimage/classes/NVImage.md), `index`: `number`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `undefined`              | callback function to run when the user changes the volume when a 4D image is loaded **Example** `niivue.onFrameChange = (volume, frameNumber) => { console.log('frame changed') console.log('volume: ', volume) console.log('frameNumber: ', frameNumber) }`                                                        | [niivue/index.ts:727](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L727) |
| <a id="onimageloaded"></a> `onImageLoaded`                                     | (`volume`: [`NVImage`](../../nvimage/classes/NVImage.md)) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `undefined`              | callback function to run when a new volume is loaded **Example** `niivue.onImageLoaded = (volume) => { console.log('volume loaded') console.log('volume: ', volume) }`                                                                                                                                              | [niivue/index.ts:706](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L706) |
| <a id="oninfo"></a> `onInfo`                                                   | () => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | callback function to run when niivue reports detailed info **Example** `niivue.onInfo = (info) => { console.log('info: ', info) }`                                                                                                                                                                                  | [niivue/index.ts:748](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L748) |
| <a id="onintensitychange"></a> `onIntensityChange`                             | (`volume`: [`NVImage`](../../nvimage/classes/NVImage.md)) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | `undefined`              | callback function to run when the user changes the intensity range with the selection box action (right click) **Example** `niivue.onIntensityChange = (volume) => { console.log('intensity changed') console.log('volume: ', volume) }`                                                                            | [niivue/index.ts:685](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L685) |
| <a id="onlocationchange"></a> `onLocationChange`                               | (`location`: `unknown`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | `undefined`              | callback function to run when the crosshair location changes **Example** `niivue.onLocationChange = (data) => { console.log('location changed') console.log('mm: ', data.mm) console.log('vox: ', data.vox) console.log('frac: ', data.frac) console.log('values: ', data.values) }`                                | [niivue/index.ts:676](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L676) |
| <a id="onmeshadded"></a> `onMeshAdded`                                         | () => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:801](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L801) |
| <a id="onmeshaddedfromurl"></a> `onMeshAddedFromUrl`                           | (`meshOptions`: [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md), `mesh`: [`NVMesh`](../../nvmesh/classes/NVMesh.md)) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `undefined`              | callback function to run when a mesh is added from a url **Example** `niivue.onMeshAddedFromUrl = (meshOptions, mesh) => { console.log('mesh added from url') console.log('meshOptions: ', meshOptions) console.log('mesh: ', mesh) }`                                                                              | [niivue/index.ts:798](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L798) |
| <a id="onmeshloaded"></a> `onMeshLoaded`                                       | (`mesh`: [`NVMesh`](../../nvmesh/classes/NVMesh.md)) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `undefined`              | callback function to run when a new mesh is loaded **Example** `niivue.onMeshLoaded = (mesh) => { console.log('mesh loaded') console.log('mesh: ', mesh) }`                                                                                                                                                         | [niivue/index.ts:716](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L716) |
| <a id="onmeshpropertychanged"></a> `onMeshPropertyChanged`                     | (`meshIndex`: `number`, `key`: `string`, `val`: `unknown`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:827](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L827) |
| <a id="onmeshshaderchanged"></a> `onMeshShaderChanged`                         | (`meshIndex`: `number`, `shaderIndex`: `number`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:826](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L826) |
| <a id="onmeshwithurlremoved"></a> `onMeshWithUrlRemoved`                       | (`url`: `string`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:802](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L802) |
| <a id="onmouseup"></a> `onMouseUp`                                             | (`data`: `Partial`\<`UIData`\>) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `undefined`              | callback function to run when the left mouse button is released **Example** `niivue.onMouseUp = () => { console.log('mouse up') }`                                                                                                                                                                                  | [niivue/index.ts:664](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L664) |
| <a id="onoptschange"></a> `onOptsChange`                                       | (`propertyName`: keyof [`NVConfigOptions`](../../nvdocument/type-aliases/NVConfigOptions.md), `newValue`: \| `string` \| `number` \| `boolean` \| `number`[] \| `Float32Array` \| [`MouseEventConfig`](../../nvdocument/interfaces/MouseEventConfig.md) \| [`TouchEventConfig`](../../nvdocument/interfaces/TouchEventConfig.md) \| `number`[] \| \[\[`number`, `number`\], \[`number`, `number`\]\], `oldValue`: \| `string` \| `number` \| `boolean` \| `number`[] \| `Float32Array` \| [`MouseEventConfig`](../../nvdocument/interfaces/MouseEventConfig.md) \| [`TouchEventConfig`](../../nvdocument/interfaces/TouchEventConfig.md) \| `number`[] \| \[\[`number`, `number`\], \[`number`, `number`\]\]) => `void` | `undefined`              | Callback for when any configuration option changes.                                                                                                                                                                                                                                                                 | [niivue/index.ts:846](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L846) |
| <a id="onvolumeaddedfromurl"></a> `onVolumeAddedFromUrl`                       | (`imageOptions`: [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md), `volume`: [`NVImage`](../../nvimage/classes/NVImage.md)) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `undefined`              | callback function to run when a volume is added from a url **Example** `niivue.onVolumeAddedFromUrl = (imageOptions, volume) => { console.log('volume added from url') console.log('imageOptions: ', imageOptions) console.log('volume: ', volume) }`                                                               | [niivue/index.ts:777](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L777) |
| <a id="onvolumeupdated"></a> `onVolumeUpdated`                                 | () => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | callback function to run when updateGLVolume is called (most users will not need to use **Example** `niivue.onVolumeUpdated = () => { console.log('volume updated') }`                                                                                                                                              | [niivue/index.ts:787](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L787) |
| <a id="onvolumewithurlremoved"></a> `onVolumeWithUrlRemoved`                   | (`url`: `string`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:778](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L778) |
| <a id="onwarn"></a> `onWarn`                                                   | () => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | callback function to run when niivue reports a warning **Example** `niivue.onWarn = (warn) => { console.log('warn: ', warn) }`                                                                                                                                                                                      | [niivue/index.ts:757](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L757) |
| <a id="onzoom3dchange"></a> `onZoom3DChange`                                   | (`zoom`: `number`) => `void`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:805](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L805) |
| <a id="orientcubeshader"></a> `orientCubeShader?`                              | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:411](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L411) |
| <a id="orientcubeshadervao"></a> `orientCubeShaderVAO`                         | `WebGLVertexArrayObject`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:412](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L412) |
| <a id="orientshaderatlasi"></a> `orientShaderAtlasI`                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:438](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L438) |
| <a id="orientshaderatlasu"></a> `orientShaderAtlasU`                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:437](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L437) |
| <a id="orientshaderf"></a> `orientShaderF`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:441](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L441) |
| <a id="orientshaderi"></a> `orientShaderI`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:440](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L440) |
| <a id="orientshaderpaqd"></a> `orientShaderPAQD`                               | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:443](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L443) |
| <a id="orientshaderrgbu"></a> `orientShaderRGBU`                               | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:442](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L442) |
| <a id="orientshaderu"></a> `orientShaderU`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:439](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L439) |
| <a id="othernv"></a> `otherNV`                                                 | `Niivue`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:539](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L539) |
| <a id="overlayalphashader"></a> `overlayAlphaShader`                           | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `1`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:460](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L460) |
| <a id="overlayoutlinewidth"></a> `overlayOutlineWidth`                         | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:459](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L459) |
| <a id="overlays"></a> `overlays`                                               | [`NVImage`](../../nvimage/classes/NVImage.md)[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:520](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L520) |
| <a id="overlaytexture"></a> `overlayTexture`                                   | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:406](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L406) |
| <a id="overlaytextureid"></a> `overlayTextureID`                               | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:407](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L407) |
| <a id="paqdtexture"></a> `paqdTexture`                                         | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:390](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L390) |
| <a id="passthroughshader"></a> `passThroughShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:418](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L418) |
| <a id="pickingimageshader"></a> `pickingImageShader?`                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:424](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L424) |
| <a id="pickingmeshshader"></a> `pickingMeshShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:423](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L423) |
| <a id="pivot3d"></a> `pivot3D`                                                 | `number`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:541](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L541) |
| <a id="position"></a> `position?`                                              | `vec3`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:461](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L461) |
| <a id="readyforsync"></a> `readyForSync`                                       | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:481](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L481) |
| <a id="rectoutlineshader"></a> `rectOutlineShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:414](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L414) |
| <a id="rectshader"></a> `rectShader?`                                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:413](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L413) |
| <a id="renderdrawambientocclusion"></a> `renderDrawAmbientOcclusion`           | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0.4`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:398](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L398) |
| <a id="rendergradientshader"></a> `renderGradientShader?`                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:419](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L419) |
| <a id="rendergradientvalues"></a> `renderGradientValues`                       | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:388](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L388) |
| <a id="rendergradientvaluesshader"></a> `renderGradientValuesShader?`          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:420](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L420) |
| <a id="rendershader"></a> `renderShader?`                                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:415](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L415) |
| <a id="rendersliceshader"></a> `renderSliceShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:421](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L421) |
| <a id="rendervolumeshader"></a> `renderVolumeShader?`                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:422](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L422) |
| <a id="screenslices"></a> `screenSlices`                                       | `object`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:527](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L527) |
| <a id="selectedobjectid"></a> `selectedObjectId`                               | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `-1`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:547](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L547) |
| <a id="slice2dshader"></a> `slice2DShader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:409](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L409) |
| <a id="slicemmshader"></a> `sliceMMShader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:408](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L408) |
| <a id="slicetypeaxial"></a> `sliceTypeAxial`                                   | `SLICE_TYPE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `SLICE_TYPE.AXIAL`       | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:641](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L641) |
| <a id="slicetypecoronal"></a> `sliceTypeCoronal`                               | `SLICE_TYPE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `SLICE_TYPE.CORONAL`     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:642](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L642) |
| <a id="slicetypemultiplanar"></a> `sliceTypeMultiplanar`                       | `SLICE_TYPE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `SLICE_TYPE.MULTIPLANAR` | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:644](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L644) |
| <a id="slicetyperender"></a> `sliceTypeRender`                                 | `SLICE_TYPE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `SLICE_TYPE.RENDER`      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:645](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L645) |
| <a id="slicetypesagittal"></a> `sliceTypeSagittal`                             | `SLICE_TYPE`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `SLICE_TYPE.SAGITTAL`    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:643](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L643) |
| <a id="slicev1shader"></a> `sliceV1Shader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:410](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L410) |
| <a id="sobelblurshader"></a> `sobelBlurShader`                                 | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:446](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L446) |
| <a id="sobelfirstordershader"></a> `sobelFirstOrderShader`                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:447](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L447) |
| <a id="sobelsecondordershader"></a> `sobelSecondOrderShader`                   | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:448](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L448) |
| <a id="surfaceshader"></a> `surfaceShader`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:444](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L444) |
| <a id="syncopts"></a> `syncOpts`                                               | [`SyncOpts`](../../types/type-aliases/SyncOpts.md)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:469](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L469) |
| <a id="thumbnailvisible"></a> `thumbnailVisible`                               | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:434](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L434) |
| <a id="uidata"></a> `uiData`                                                   | `UIData`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:484](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L484) |
| <a id="unusedvao"></a> `unusedVAO`                                             | `any`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:450](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L450) |
| <a id="usecustomgradienttexture"></a> `useCustomGradientTexture`               | `boolean`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:387](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L387) |
| <a id="volscale"></a> `volScale`                                               | `number`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:524](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L524) |
| <a id="volume_id"></a> `VOLUME_ID`                                             | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `254`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:549](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L549) |
| <a id="volumeobject3d"></a> `volumeObject3D`                                   | `NiivueObject3D`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:540](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L540) |
| <a id="volumetexture"></a> `volumeTexture`                                     | `WebGLTexture`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:384](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L384) |
| <a id="vox"></a> `vox`                                                         | `number`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:525](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L525) |

## Accessors

### drawBitmap

#### Get Signature

```ts
get drawBitmap(): Uint8Array;
```

Defined in: [niivue/index.ts:988](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L988)

##### Returns

`Uint8Array`

#### Set Signature

```ts
set drawBitmap(drawBitmap: Uint8Array): void;
```

Defined in: [niivue/index.ts:992](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L992)

##### Parameters

| Parameter    | Type         |
| ------------ | ------------ |
| `drawBitmap` | `Uint8Array` |

##### Returns

`void`

---

### isAlphaClipDark

#### Get Signature

```ts
get isAlphaClipDark(): boolean;
```

Defined in: [niivue/index.ts:878](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L878)

Get whether voxels below minimum intensity are drawn as dark or transparent.

##### Returns

`boolean`

True if dark voxels are opaque, false if transparent.

#### Set Signature

```ts
set isAlphaClipDark(newVal: boolean): void;
```

Defined in: [niivue/index.ts:887](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L887)

Set whether voxels below minimum intensity are drawn as dark or transparent.

##### See

[live demo usage](https://niivue.com/demos/features/segment.html)

##### Parameters

| Parameter | Type      | Description                                             |
| --------- | --------- | ------------------------------------------------------- |
| `newVal`  | `boolean` | True to make dark voxels opaque, false for transparent. |

##### Returns

`void`

---

### meshes

#### Get Signature

```ts
get meshes(): NVMesh[];
```

Defined in: [niivue/index.ts:980](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L980)

##### Returns

[`NVMesh`](../../nvmesh/classes/NVMesh.md)[]

#### Set Signature

```ts
set meshes(meshes: NVMesh[]): void;
```

Defined in: [niivue/index.ts:984](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L984)

##### Parameters

| Parameter | Type                                         |
| --------- | -------------------------------------------- |
| `meshes`  | [`NVMesh`](../../nvmesh/classes/NVMesh.md)[] |

##### Returns

`void`

---

### opts

#### Get Signature

```ts
get opts(): NVConfigOptions;
```

Defined in: [niivue/index.ts:860](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L860)

Get the current visualization options.

##### Returns

[`NVConfigOptions`](../../nvdocument/type-aliases/NVConfigOptions.md)

---

### scene

#### Get Signature

```ts
get scene(): Scene;
```

Defined in: [niivue/index.ts:855](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L855)

Get the current scene configuration.

##### Returns

[`Scene`](../../nvdocument/type-aliases/Scene.md)

---

### sliceMosaicString

#### Get Signature

```ts
get sliceMosaicString(): string;
```

Defined in: [niivue/index.ts:865](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L865)

Get the slice mosaic layout string.

##### Returns

`string`

#### Set Signature

```ts
set sliceMosaicString(newSliceMosaicString: string): void;
```

Defined in: [niivue/index.ts:870](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L870)

Set the slice mosaic layout string.

##### Parameters

| Parameter              | Type     |
| ---------------------- | -------- |
| `newSliceMosaicString` | `string` |

##### Returns

`void`

---

### volScaleMultiplier

#### Get Signature

```ts
get volScaleMultiplier(): number;
```

Defined in: [niivue/index.ts:996](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L996)

##### Returns

`number`

#### Set Signature

```ts
set volScaleMultiplier(scale: number): void;
```

Defined in: [niivue/index.ts:1000](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1000)

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `scale`   | `number` |

##### Returns

`void`

---

### volumes

#### Get Signature

```ts
get volumes(): NVImage[];
```

Defined in: [niivue/index.ts:972](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L972)

##### Returns

[`NVImage`](../../nvimage/classes/NVImage.md)[]

#### Set Signature

```ts
set volumes(volumes: NVImage[]): void;
```

Defined in: [niivue/index.ts:976](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L976)

##### Parameters

| Parameter | Type                                            |
| --------- | ----------------------------------------------- |
| `volumes` | [`NVImage`](../../nvimage/classes/NVImage.md)[] |

##### Returns

`void`

## Methods

### addColormap()

```ts
addColormap(key: string, cmap: ColorMap): void;
```

Defined in: [niivue/index.ts:8942](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8942)

create a new colormap

#### Parameters

| Parameter | Type                                                     | Description                                               |
| --------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `key`     | `string`                                                 | name of new colormap                                      |
| `cmap`    | [`ColorMap`](../../colortables/type-aliases/ColorMap.md) | colormap properties (Red, Green, Blue, Alpha and Indices) |

#### Returns

`void`

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### addLabel()

```ts
addLabel(
   text: string,
   style: NVLabel3DStyle,
   points?: number[] | number[][],
   anchor?: LabelAnchorPoint,
   onClick?: (label: NVLabel3D) => void): NVLabel3D;
```

Defined in: [niivue/index.ts:13337](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L13337)

Add a 3D Label

#### Parameters

| Parameter  | Type                                                                 | Description                                                            |
| ---------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `text`     | `string`                                                             | the text content of the label                                          |
| `style`    | `NVLabel3DStyle`                                                     | visual styling options for the label (e.g., color, scale, line width)  |
| `points?`  | `number`[] \| `number`[][]                                           | a 3D point `[x, y, z]` or array of points to anchor the label in space |
| `anchor?`  | [`LabelAnchorPoint`](../../nvlabel/enumerations/LabelAnchorPoint.md) | optional label anchor position (e.g., top-left, center, etc.)          |
| `onClick?` | (`label`: `NVLabel3D`) => `void`                                     | optional callback function to invoke when the label is clicked         |

#### Returns

`NVLabel3D`

the created `NVLabel3D` instance

#### See

[live demo usage](https://niivue.com/demos/features/labels.html)

---

### addMesh()

```ts
addMesh(mesh: NVMesh): void;
```

Defined in: [niivue/index.ts:3617](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3617)

add a new mesh to the canvas

#### Parameters

| Parameter | Type                                       | Description                       |
| --------- | ------------------------------------------ | --------------------------------- |
| `mesh`    | [`NVMesh`](../../nvmesh/classes/NVMesh.md) | the new mesh to add to the canvas |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.addMesh(NVMesh.loadFromUrl({ url: "../someURL.gii" }));
```

#### See

[live demo usage](https://niivue.com/demos/features/document.3d.html)

---

### addMeshesFromUrl()

```ts
addMeshesFromUrl(meshOptions: LoadFromUrlParams[]): Promise<NVMesh[]>;
```

Defined in: [niivue/index.ts:5540](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5540)

Add mesh and notify subscribers

#### Parameters

| Parameter     | Type                                                                    |
| ------------- | ----------------------------------------------------------------------- |
| `meshOptions` | [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md)[] |

#### Returns

`Promise`\<[`NVMesh`](../../nvmesh/classes/NVMesh.md)[]\>

---

### addMeshFromUrl()

```ts
addMeshFromUrl(meshOptions: LoadFromUrlParams): Promise<NVMesh>;
```

Defined in: [niivue/index.ts:5519](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5519)

Add mesh and notify subscribers

#### Parameters

| Parameter     | Type                                                                  |
| ------------- | --------------------------------------------------------------------- |
| `meshOptions` | [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md) |

#### Returns

`Promise`\<[`NVMesh`](../../nvmesh/classes/NVMesh.md)\>

---

### addVolume()

```ts
addVolume(volume: NVImage): void;
```

Defined in: [niivue/index.ts:3600](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3600)

add a new volume to the canvas

#### Parameters

| Parameter | Type                                          | Description                         |
| --------- | --------------------------------------------- | ----------------------------------- |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | the new volume to add to the canvas |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.addVolume(NVImage.loadFromUrl({ url: "../someURL.nii.gz" }));
```

#### See

[live demo usage](https://niivue.com/demos/features/conform.html)

---

### addVolumeFromUrl()

```ts
addVolumeFromUrl(imageOptions: ImageFromUrlOptions): Promise<NVImage>;
```

Defined in: [niivue/index.ts:2788](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2788)

Add an image and notify subscribers

#### Parameters

| Parameter      | Type                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `imageOptions` | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md) |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

#### See

[live demo usage](https://niivue.com/demos/features/document.3d.html)

---

### addVolumesFromUrl()

```ts
addVolumesFromUrl(imageOptionsArray: ImageFromUrlOptions[]): Promise<NVImage[]>;
```

Defined in: [niivue/index.ts:2800](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2800)

#### Parameters

| Parameter           | Type                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `imageOptionsArray` | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[] |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)[]\>

---

### attachTo()

```ts
attachTo(id: string, isAntiAlias: any): Promise<Niivue>;
```

Defined in: [niivue/index.ts:1048](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1048)

attach the Niivue instance to the webgl2 canvas by element id

#### Parameters

| Parameter     | Type     | Default value | Description                                                                               |
| ------------- | -------- | ------------- | ----------------------------------------------------------------------------------------- |
| `id`          | `string` | `undefined`   | the id of an html canvas element                                                          |
| `isAntiAlias` | `any`    | `null`        | determines if anti-aliasing is requested (if not specified, AA usage depends on hardware) |

#### Returns

`Promise`\<`Niivue`\>

#### Examples

```ts
niivue = new Niivue().attachTo("gl");
```

```ts
await niivue.attachTo("gl");
```

#### See

[live demo usage](https://niivue.com/demos/features/basic.multiplanar.html)

---

### attachToCanvas()

```ts
attachToCanvas(canvas: HTMLCanvasElement, isAntiAlias: boolean): Promise<Niivue>;
```

Defined in: [niivue/index.ts:1062](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1062)

attach the Niivue instance to a canvas element directly

#### Parameters

| Parameter     | Type                | Default value | Description                  |
| ------------- | ------------------- | ------------- | ---------------------------- |
| `canvas`      | `HTMLCanvasElement` | `undefined`   | the canvas element reference |
| `isAntiAlias` | `boolean`           | `null`        | -                            |

#### Returns

`Promise`\<`Niivue`\>

#### Example

```ts
niivue = new Niivue();
await niivue.attachToCanvas(document.getElementById(id));
```

#### See

[live demo usage](https://niivue.com/demos/features/dsistudio.html)

---

### binarize()

```ts
binarize(volume: NVImage): void;
```

Defined in: [niivue/index.ts:3810](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3810)

Binarize a volume by converting all non-zero voxels to 1

#### Parameters

| Parameter | Type                                          | Description                         |
| --------- | --------------------------------------------- | ----------------------------------- |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | the image volume to modify in place |

#### Returns

`void`

#### See

[live demo usage](https://niivue.com/demos/features/clusterize.html)

---

### broadcastTo()

```ts
broadcastTo(otherNV: Niivue | Niivue[], syncOpts: object): void;
```

Defined in: [niivue/index.ts:1155](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1155)

Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to others. useful for using one canvas to drive another.

#### Parameters

| Parameter     | Type                                    | Description                  |
| ------------- | --------------------------------------- | ---------------------------- |
| `otherNV`     | `Niivue` \| `Niivue`[]                  | the other Niivue instance(s) |
| `syncOpts`    | \{ `2d`: `boolean`; `3d`: `boolean`; \} | -                            |
| `syncOpts.2d` | `boolean`                               | -                            |
| `syncOpts.3d` | `boolean`                               | -                            |

#### Returns

`void`

#### Example

```ts
niivue1 = new Niivue();
niivue2 = new Niivue();
niivue3 = new Niivue();
niivue1.broadcastTo(niivue2);
niivue1.broadcastTo([niivue2, niivue3]);
```

#### See

[live demo usage](https://niivue.com/demos/features/sync.mesh.html)

---

### cleanup()

```ts
cleanup(): void;
```

Defined in: [niivue/index.ts:941](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L941)

Clean up event listeners and observers
Call this when the Niivue instance is no longer needed.
This will be called when the canvas is detached from the DOM

#### Returns

`void`

#### Example

```ts
niivue.cleanup();
```

---

### clearAllMeasurements()

```ts
clearAllMeasurements(): void;
```

Defined in: [niivue/index.ts:11038](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11038)

Clear all persistent measurements and angles from the canvas.

#### Returns

`void`

#### Example

```js
nv.clearAllMeasurements();
```

---

### clearAngles()

```ts
clearAngles(): void;
```

Defined in: [niivue/index.ts:11026](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11026)

Clear all persistent angle measurements from the canvas.

#### Returns

`void`

#### Example

```js
nv.clearAngles();
```

---

### clearBounds()

```ts
clearBounds(mask: number, ltwh?: [number, number, number, number]): void;
```

Defined in: [niivue/index.ts:15234](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L15234)

Clear a rectangular region of this instance's canvas.

#### Parameters

| Parameter | Type                                       | Description                                                                                                                                                                                       |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mask`    | `number`                                   | bitmask of buffers to clear (default: color+depth).                                                                                                                                               |
| `ltwh?`   | \[`number`, `number`, `number`, `number`\] | optional [x, y, w, h] region in _device px_ (GL coords, bottom-left). If not provided, clears the full instance bounds (getBoundsRegion). For multiplanar panels, pass the panel’s own [x,y,w,h]. |

#### Returns

`void`

---

### clearCustomLayout()

```ts
clearCustomLayout(): void;
```

Defined in: [niivue/index.ts:3436](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3436)

Clear custom layout and rely on built-in layouts

#### Returns

`void`

---

### clearMeasurements()

```ts
clearMeasurements(): void;
```

Defined in: [niivue/index.ts:11014](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11014)

Clear all persistent measurement lines from the canvas.

#### Returns

`void`

#### Example

```js
nv.clearMeasurements();
```

---

### cloneVolume()

```ts
cloneVolume(index: number): NVImage;
```

Defined in: [niivue/index.ts:5038](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5038)

clone a volume and return a new volume

#### Parameters

| Parameter | Type     | Description                      |
| --------- | -------- | -------------------------------- |
| `index`   | `number` | the index of the volume to clone |

#### Returns

[`NVImage`](../../nvimage/classes/NVImage.md)

new volume to work with, but that volume is not added to the canvas

#### Example

```ts
niivue = new Niivue();
niivue.cloneVolume(0);
```

---

### closeDrawing()

```ts
closeDrawing(): void;
```

Defined in: [niivue/index.ts:6846](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6846)

close drawing: make sure you have saved any changes before calling this!

#### Returns

`void`

#### Example

```ts
niivue.closeDrawing();
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### colormap()

```ts
colormap(lutName: string, isInvert: boolean): Uint8ClampedArray;
```

Defined in: [niivue/index.ts:9866](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9866)

Retrieve a colormap with optional inversion

#### Parameters

| Parameter  | Type      | Default value | Description                             |
| ---------- | --------- | ------------- | --------------------------------------- |
| `lutName`  | `string`  | `''`          | name of the lookup table (LUT) colormap |
| `isInvert` | `boolean` | `false`       | whether to invert the colormap          |

#### Returns

`Uint8ClampedArray`

the RGBA colormap as a Uint8ClampedArray

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### colormaps()

```ts
colormaps(): string[];
```

Defined in: [niivue/index.ts:8932](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8932)

query all available color maps that can be applied to volumes

#### Returns

`string`[]

an array of colormap strings

#### Example

```ts
niivue = new Niivue();
colormaps = niivue.colormaps();
```

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### conform()

```ts
conform(
   volume: NVImage,
   toRAS: boolean,
   isLinear: boolean,
   asFloat32: boolean,
isRobustMinMax: boolean): Promise<NVImage>;
```

Defined in: [niivue/index.ts:9569](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9569)

FreeSurfer-style conform reslices any image to a 256x256x256 volume with 1mm voxels

#### Parameters

| Parameter        | Type                                          | Default value | Description                                                                                          |
| ---------------- | --------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- |
| `volume`         | [`NVImage`](../../nvimage/classes/NVImage.md) | `undefined`   | input volume to be re-oriented, intensity-scaled and resliced                                        |
| `toRAS`          | `boolean`                                     | `false`       | reslice to row, column slices to right-anterior-superior not left-inferior-anterior (default false). |
| `isLinear`       | `boolean`                                     | `true`        | reslice with linear rather than nearest-neighbor interpolation (default true).                       |
| `asFloat32`      | `boolean`                                     | `false`       | use Float32 datatype rather than Uint8 (default false).                                              |
| `isRobustMinMax` | `boolean`                                     | `false`       | clamp intensity with robust min max (~2%..98%) instead of FreeSurfer (0%..99.99%) (default false).   |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

#### See

[live demo usage](https://niivue.com/demos/features/torso.html)

---

### createConnectedLabelImage()

```ts
createConnectedLabelImage(
   id: string,
   conn: number,
   binarize: boolean,
onlyLargestClusterPerClass: boolean): Promise<NVImage>;
```

Defined in: [niivue/index.ts:9281](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9281)

Create a connected component label map from a volume

#### Parameters

| Parameter                    | Type      | Default value | Description                                                                               |
| ---------------------------- | --------- | ------------- | ----------------------------------------------------------------------------------------- |
| `id`                         | `string`  | `undefined`   | ID of the input volume                                                                    |
| `conn`                       | `number`  | `26`          | connectivity for clustering (6 = faces, 18 = faces + edges, 26 = faces + edges + corners) |
| `binarize`                   | `boolean` | `false`       | whether to binarize the volume before labeling                                            |
| `onlyLargestClusterPerClass` | `boolean` | `false`       | retain only the largest cluster for each label                                            |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

a new NVImage with labeled clusters, using random colormap

#### See

[live demo usage](https://niivue.com/demos/features/clusterize.html)

---

### createCustomMeshShader()

```ts
createCustomMeshShader(fragmentShaderText: string, name: string): object;
```

Defined in: [niivue/index.ts:7424](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7424)

#### Parameters

| Parameter            | Type     | Default value | Description             |
| -------------------- | -------- | ------------- | ----------------------- |
| `fragmentShaderText` | `string` | `undefined`   | custom fragment shader. |
| `name`               | `string` | `'Custom'`    | title for new shader.   |

#### Returns

`object`

created custom mesh shader

| Name     | Type                                       | Defined in                                                                                                   |
| -------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| `Frag`   | `string`                                   | [niivue/index.ts:7428](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7428) |
| `Name`   | `string`                                   | [niivue/index.ts:7428](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7428) |
| `shader` | [`Shader`](../../shader/classes/Shader.md) | [niivue/index.ts:7428](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7428) |

---

### createEmptyDrawing()

```ts
createEmptyDrawing(): void;
```

Defined in: [niivue/index.ts:5723](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5723)

generate a blank canvas for the pen tool

#### Returns

`void`

#### Example

```ts
niivue.createEmptyDrawing();
```

#### See

[live demo usage](https://niivue.com/demos/features/cactus.html)

---

### createNiftiArray()

```ts
createNiftiArray(
   dims: number[],
   pixDims: number[],
   affine: number[],
   datatypeCode: NiiDataType,
img: Uint8Array): Promise<Uint8Array>;
```

Defined in: [niivue/index.ts:9525](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9525)

Create a binary NIfTI file as a Uint8Array, including header and image data

#### Parameters

| Parameter      | Type                                                       | Default value          | Description                                         |
| -------------- | ---------------------------------------------------------- | ---------------------- | --------------------------------------------------- |
| `dims`         | `number`[]                                                 | `...`                  | image dimensions [x, y, z]                          |
| `pixDims`      | `number`[]                                                 | `...`                  | voxel dimensions in mm [x, y, z]                    |
| `affine`       | `number`[]                                                 | `...`                  | 4×4 affine transformation matrix in row-major order |
| `datatypeCode` | [`NiiDataType`](../../nvimage/enumerations/NiiDataType.md) | `NiiDataType.DT_UINT8` | NIfTI datatype code (e.g., DT_UINT8, DT_FLOAT32)    |
| `img`          | `Uint8Array`                                               | `...`                  | image data buffer (optional)                        |

#### Returns

`Promise`\<`Uint8Array`\>

a Uint8Array representing a complete NIfTI file

#### See

[live demo usage](https://niivue.com/demos/features/conform.html)

---

### createOnLocationChange()

```ts
createOnLocationChange(axCorSag: number): void;
```

Defined in: [niivue/index.ts:13214](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L13214)

Internal utility to generate human-readable location strings for the onLocationChange callback

#### Parameters

| Parameter  | Type     | Default value | Description                                                        |
| ---------- | -------- | ------------- | ------------------------------------------------------------------ |
| `axCorSag` | `number` | `NaN`         | optional axis index for coordinate interpretation (NaN by default) |

#### Returns

`void`

#### Remarks

Computes string representation of current crosshair position in mm (and frame if 4D).

#### See

[live demo usage](https://niivue.com/demos/features/modulateAfni.html)

---

### decimateHierarchicalMesh()

```ts
decimateHierarchicalMesh(mesh: number, order: number): boolean;
```

Defined in: [niivue/index.ts:4235](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4235)

reduce complexity of FreeSurfer mesh

#### Parameters

| Parameter | Type     | Default value | Description                |
| --------- | -------- | ------------- | -------------------------- |
| `mesh`    | `number` | `undefined`   | identity of mesh to change |
| `order`   | `number` | `3`           | decimation order 0..6      |

#### Returns

`boolean`

boolean false if mesh is not hierarchical or of lower order

#### Example

```ts
niivue.decimateHierarchicalMesh(niivue.meshes[0].id, 4);
```

#### See

[live demo usage](https://niivue.com/demos/features/meshes.html)

---

### doSyncGamma()

```ts
doSyncGamma(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1184](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1184)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### drawGrowCut()

```ts
drawGrowCut(): void;
```

Defined in: [niivue/index.ts:5789](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5789)

dilate drawing so all voxels are colored.
works on drawing with multiple colors

#### Returns

`void`

#### Example

```ts
niivue.drawGrowCut();
```

#### See

[live demo usage](https://niivue.com/demos/features/draw2.html)

---

### drawingBinaryDilationWithSeed()

```ts
drawingBinaryDilationWithSeed(seedXYZ: number[], neighbors: 6 | 18 | 26): void;
```

Defined in: [niivue/index.ts:6121](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6121)

Performs a 1-voxel binary dilation on a connected cluster within the drawing mask using the drawFloodFillCore function.

#### Parameters

| Parameter   | Type                | Default value | Description                                                                   |
| ----------- | ------------------- | ------------- | ----------------------------------------------------------------------------- |
| `seedXYZ`   | `number`[]          | `undefined`   | voxel index of the seed voxel in the mask array.                              |
| `neighbors` | `6` \| `18` \| `26` | `6`           | Number of neighbors to consider for connectivity and dilation (6, 18, or 26). |

#### Returns

`void`

---

### drawMosaic()

```ts
drawMosaic(mosaicStr: string): void;
```

Defined in: [niivue/index.ts:14854](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L14854)

display a lightbox or montage view

#### Parameters

| Parameter   | Type     | Description                                           |
| ----------- | -------- | ----------------------------------------------------- |
| `mosaicStr` | `string` | specifies orientation (A,C,S) and location of slices. |

#### Returns

`void`

#### Example

```ts
niivue.setSliceMosaicString("A -10 0 20");
```

#### See

[live demo usage](https://niivue.com/demos/features/mosaics.html)

---

### drawOtsu()

```ts
drawOtsu(levels: number): void;
```

Defined in: [niivue/index.ts:3969](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3969)

remove dark voxels in air

#### Parameters

| Parameter | Type     | Default value | Description                                                                                                                                               |
| --------- | -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `levels`  | `number` | `2`           | (2-4) segment brain into this many types. For example drawOtsu(2) will create a binary drawing where bright voxels are colored and dark voxels are clear. |

#### Returns

`void`

#### Example

```ts
niivue.drawOtsu(3);
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### drawUndo()

```ts
drawUndo(): void;
```

Defined in: [niivue/index.ts:3690](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3690)

Restore drawing to previous state

#### Returns

`void`

#### Example

```ts
niivue.drawUndo();
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### eventInBounds()

```ts
eventInBounds(evt: MouseEvent | Touch | TouchEvent): boolean;
```

Defined in: [niivue/index.ts:15097](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L15097)

Returns true if a mouse/touch event happened inside this instance’s bounds.

#### Parameters

| Parameter | Type                                    |
| --------- | --------------------------------------- |
| `evt`     | `MouseEvent` \| `Touch` \| `TouchEvent` |

#### Returns

`boolean`

---

### findDrawingBoundarySlices()

```ts
findDrawingBoundarySlices(sliceType: SLICE_TYPE): object;
```

Defined in: [niivue/index.ts:15904](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L15904)

Find the first and last slices containing drawing data along a given axis

#### Parameters

| Parameter   | Type         | Description                                         |
| ----------- | ------------ | --------------------------------------------------- |
| `sliceType` | `SLICE_TYPE` | The slice orientation (AXIAL, CORONAL, or SAGITTAL) |

#### Returns

`object`

Object containing first and last slice indices, or null if no data found

| Name    | Type     | Defined in                                                                                                     |
| ------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `first` | `number` | [niivue/index.ts:15904](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L15904) |
| `last`  | `number` | [niivue/index.ts:15904](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L15904) |

---

### frac2canvasPos()

```ts
frac2canvasPos(frac: vec3): number[];
```

Defined in: [niivue/index.ts:14318](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L14318)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `frac`    | `vec3` |

#### Returns

`number`[]

---

### generateHTML()

```ts
generateHTML(canvasId: string, esm: string): Promise<string>;
```

Defined in: [niivue/index.ts:5235](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5235)

generates HTML of current scene

#### Parameters

| Parameter  | Type     | Default value | Description                             |
| ---------- | -------- | ------------- | --------------------------------------- |
| `canvasId` | `string` | `'gl1'`       | id of canvas NiiVue will be attached to |
| `esm`      | `string` | `undefined`   | bundled version of NiiVue               |

#### Returns

`Promise`\<`string`\>

HTML with javascript of the current scene

#### Example

```ts
const template = `<html><body><canvas id="gl1"></canvas><script type="module" async>
      %%javascript%%</script></body></html>`;
nv1.generateHTML("page.html", esm);
```

---

### generateLoadDocumentJavaScript()

```ts
generateLoadDocumentJavaScript(canvasId: string, esm: string): Promise<string>;
```

Defined in: [niivue/index.ts:5194](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5194)

generates JavaScript to load the current scene as a document

#### Parameters

| Parameter  | Type     | Description                             |
| ---------- | -------- | --------------------------------------- |
| `canvasId` | `string` | id of canvas NiiVue will be attached to |
| `esm`      | `string` | bundled version of NiiVue               |

#### Returns

`Promise`\<`string`\>

#### Example

```ts
const javascript = this.generateLoadDocumentJavaScript("gl1");
const html = `<html><body><canvas id="gl1"></canvas><script type="module" async>
       ${javascript}</script></body></html>`;
```

#### See

[live demo usage](https://niivue.com/demos/features/save.custom.html.html)

---

### getCustomLayout()

```ts
getCustomLayout(): object[];
```

Defined in: [niivue/index.ts:3445](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3445)

Get the current custom layout if set

#### Returns

`object`[]

The current custom layout or null if using built-in layouts

---

### getDescriptives()

```ts
getDescriptives(options: object): Descriptive;
```

Defined in: [niivue/index.ts:8046](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8046)

basic statistics for selected voxel-based image

#### Parameters

| Parameter                | Type                                                                                                                                                  | Description                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options`                | \{ `drawingIsMask?`: `boolean`; `endVox?`: `number`[]; `layer?`: `number`; `masks?`: `number`[]; `roiIsMask?`: `boolean`; `startVox?`: `number`[]; \} | an object containing the following properties: - layer: selects image to describe - masks: optional binary images to filter voxels - drawingIsMask: a boolean indicating if the drawing is used as a mask - roiIsMask: a boolean indicating if the ROI is used as a mask - startVox: the starting voxel coordinates - endVox: the ending voxel coordinates |
| `options.drawingIsMask?` | `boolean`                                                                                                                                             | -                                                                                                                                                                                                                                                                                                                                                          |
| `options.endVox?`        | `number`[]                                                                                                                                            | -                                                                                                                                                                                                                                                                                                                                                          |
| `options.layer?`         | `number`                                                                                                                                              | -                                                                                                                                                                                                                                                                                                                                                          |
| `options.masks?`         | `number`[]                                                                                                                                            | -                                                                                                                                                                                                                                                                                                                                                          |
| `options.roiIsMask?`     | `boolean`                                                                                                                                             | -                                                                                                                                                                                                                                                                                                                                                          |
| `options.startVox?`      | `number`[]                                                                                                                                            | -                                                                                                                                                                                                                                                                                                                                                          |

#### Returns

`Descriptive`

numeric values to describe image or regions of images

#### Example

```ts
niivue.getDescriptives({
  layer: 0,
  masks: [],
  drawingIsMask: true, // drawingIsMask and roiIsMask are mutually exclusive
  roiIsMask: false,
  startVox: [10, 20, 30], // ignored if roiIsMask is false
  endVox: [40, 50, 60], // ignored if roiIsMask is false
});
```

#### See

[live demo usage](https://niivue.com/demos/features/draw2.html)

---

### getDicomLoader()

```ts
getDicomLoader(): DicomLoader;
```

Defined in: [niivue/index.ts:3070](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3070)

Get the currently assigned DICOM loader.

#### Returns

[`DicomLoader`](../type-aliases/DicomLoader.md)

---

### getFrame4D()

```ts
getFrame4D(id: string): number;
```

Defined in: [niivue/index.ts:9846](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9846)

determine active 3D volume from 4D time series

#### Parameters

| Parameter | Type     | Description              |
| --------- | -------- | ------------------------ |
| `id`      | `string` | the ID of the 4D NVImage |

#### Returns

`number`

currently selected volume (indexed from 0)

#### Example

```ts
nv1.getFrame4D(nv1.volumes[0].id);
```

#### See

[live demo usage](https://niivue.com/demos/features/timeseries.html)

---

### getGradientTextureData()

```ts
getGradientTextureData(): Float32Array;
```

Defined in: [niivue/index.ts:7827](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7827)

Get the gradient texture produced by gradientGL as a TypedArray

#### Returns

`Float32Array`

Float32Array containing the gradient texture data, or null if no gradient texture exists

#### Example

```ts
niivue = new Niivue();
niivue.loadVolumes([{ url: "./someImage.nii" }]);
// ... after volume is loaded and gradient is computed
const gradientData = niivue.getGradientTextureData();
if (gradientData) {
  console.log("Gradient texture dimensions:", gradientData.length);
}
```

#### See

[live demo usage](https://niivue.com/demos/features/gradient.custom.html)

---

### getMeshIndexByID()

```ts
getMeshIndexByID(id: string | number): number;
```

Defined in: [niivue/index.ts:4168](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4168)

Returns the index of a mesh given its ID or index.

#### Parameters

| Parameter | Type                 | Description                                  |
| --------- | -------------------- | -------------------------------------------- |
| `id`      | `string` \| `number` | The mesh ID as a string, or an index number. |

#### Returns

`number`

The mesh index, or -1 if not found or out of range.

---

### getMouseEventConfig()

```ts
getMouseEventConfig(): MouseEventConfig;
```

Defined in: [niivue/index.ts:11135](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11135)

Get current mouse event configuration.

#### Returns

[`MouseEventConfig`](../../nvdocument/interfaces/MouseEventConfig.md)

Current mouse event configuration or undefined if using defaults

---

### getOverlayIndexByID()

```ts
getOverlayIndexByID(id: string): number;
```

Defined in: [niivue/index.ts:4314](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4314)

get the index of an overlay by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.

#### Parameters

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `id`      | `string` | the id string to search for |

#### Returns

`number`

#### See

NiiVue#getVolumeIndexByID

#### Example

```ts
niivue = new Niivue();
niivue.getOverlayIndexByID(someVolume.id);
```

---

### getRadiologicalConvention()

```ts
getRadiologicalConvention(): boolean;
```

Defined in: [niivue/index.ts:3543](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3543)

Detect if display is using radiological or neurological convention.

#### Returns

`boolean`

radiological convention status

#### Example

```ts
let rc = niivue.getRadiologicalConvention();
```

---

### getTouchEventConfig()

```ts
getTouchEventConfig(): TouchEventConfig;
```

Defined in: [niivue/index.ts:11143](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11143)

Get current touch event configuration.

#### Returns

[`TouchEventConfig`](../../nvdocument/interfaces/TouchEventConfig.md)

Current touch event configuration or undefined if using defaults

---

### getVolumeIndexByID()

```ts
getVolumeIndexByID(id: string): number;
```

Defined in: [niivue/index.ts:3631](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3631)

get the index of a volume by its unique id. unique ids are assigned to the NVImage.id property when a new NVImage is created.

#### Parameters

| Parameter | Type     | Description                 |
| --------- | -------- | --------------------------- |
| `id`      | `string` | the id string to search for |

#### Returns

`number`

#### Example

```ts
niivue = new Niivue();
niivue.getVolumeIndexByID(someVolume.id);
```

---

### inBounds()

```ts
inBounds(x: number, y: number): boolean;
```

Defined in: [niivue/index.ts:15187](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L15187)

Return true if the given canvas pixel coordinates are inside this Niivue instance's bounds.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`boolean`

---

### indexNearestXYZmm()

```ts
indexNearestXYZmm(
   mesh: number,
   Xmm: number,
   Ymm: number,
   Zmm: number): number[];
```

Defined in: [niivue/index.ts:4218](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4218)

returns the index of the mesh vertex that is closest to the provided coordinates

#### Parameters

| Parameter | Type     | Description                              |
| --------- | -------- | ---------------------------------------- |
| `mesh`    | `number` | identity of mesh to change               |
| `Xmm`     | `number` | location in left/right dimension         |
| `Ymm`     | `number` | location in posterior/anterior dimension |
| `Zmm`     | `number` | location in foot/head dimension          |

#### Returns

`number`[]

the an array where ret[0] is the mesh index and ret[1] is distance from vertex to coordinates

#### Example

```ts
niivue.indexNearestXYZmm(niivue.meshes[0].id, -22, 42, 13);
```

#### See

[live demo usage](https://niivue.com/demos/features/clipplanes.html)

---

### interpolateMaskSlices()

```ts
interpolateMaskSlices(
   sliceIndexLow?: number,
   sliceIndexHigh?: number,
   options?: object): void;
```

Defined in: [niivue/index.ts:15919](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L15919)

Interpolate between mask slices using geometric or intensity-guided methods

#### Parameters

| Parameter                         | Type                                                                                                                                                                                               | Description                                                     |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `sliceIndexLow?`                  | `number`                                                                                                                                                                                           | Lower slice index (optional, will auto-detect if not provided)  |
| `sliceIndexHigh?`                 | `number`                                                                                                                                                                                           | Higher slice index (optional, will auto-detect if not provided) |
| `options?`                        | \{ `applySmoothingToSlices?`: `boolean`; `binaryThreshold?`: `number`; `intensitySigma?`: `number`; `intensityWeight?`: `number`; `sliceType?`: `SLICE_TYPE`; `useIntensityGuided?`: `boolean`; \} | Interpolation options                                           |
| `options.applySmoothingToSlices?` | `boolean`                                                                                                                                                                                          | -                                                               |
| `options.binaryThreshold?`        | `number`                                                                                                                                                                                           | -                                                               |
| `options.intensitySigma?`         | `number`                                                                                                                                                                                           | -                                                               |
| `options.intensityWeight?`        | `number`                                                                                                                                                                                           | -                                                               |
| `options.sliceType?`              | `SLICE_TYPE`                                                                                                                                                                                       | -                                                               |
| `options.useIntensityGuided?`     | `boolean`                                                                                                                                                                                          | -                                                               |

#### Returns

`void`

---

### json()

```ts
json(): ExportDocumentData;
```

Defined in: [niivue/index.ts:5325](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5325)

Converts NiiVue scene to JSON

#### Returns

[`ExportDocumentData`](../../nvdocument/type-aliases/ExportDocumentData.md)

---

### loadConnectome()

```ts
loadConnectome(json:
  | Connectome
  | LegacyConnectome): this;
```

Defined in: [niivue/index.ts:5709](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5709)

load a connectome specified by json

#### Parameters

| Parameter | Type                                                                                                                            | Description      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `json`    | \| [`Connectome`](../../types/type-aliases/Connectome.md) \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) | connectome model |

#### Returns

`this`

Niivue instance

#### See

[live demo usage](https://niivue.com/demos/features/connectome.html)

---

### loadConnectomeFromUrl()

```ts
loadConnectomeFromUrl(url: string, headers: object): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5626](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5626)

Load a connectome from a given URL and initialize it.

#### Parameters

| Parameter | Type     | Description                                                                |
| --------- | -------- | -------------------------------------------------------------------------- |
| `url`     | `string` | the URL to a JSON-formatted connectome definition                          |
| `headers` | \{ \}    | optional HTTP headers to include with the request (e.g. for authorization) |

#### Returns

`Promise`\<`Niivue`\>

the `Niivue` instance (for method chaining)

#### See

[live demo usage](https://niivue.com/demos/features/connectome.html)

---

### loadDeferred4DVolumes()

```ts
loadDeferred4DVolumes(id: string): Promise<void>;
```

Defined in: [niivue/index.ts:9787](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9787)

Load all volumes for image opened with `limitFrames4D`, the user can also click the `...` on a 4D timeline to load deferred volumes

#### Parameters

| Parameter | Type     | Description              |
| --------- | -------- | ------------------------ |
| `id`      | `string` | the ID of the 4D NVImage |

#### Returns

`Promise`\<`void`\>

---

### loadDicoms()

```ts
loadDicoms(dicomList: ImageFromUrlOptions[]): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5421](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5421)

#### Parameters

| Parameter   | Type                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| `dicomList` | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[] |

#### Returns

`Promise`\<`Niivue`\>

---

### loadDocument()

```ts
loadDocument(document: NVDocument): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5055](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5055)

Loads an NVDocument

#### Parameters

| Parameter  | Type         |
| ---------- | ------------ |
| `document` | `NVDocument` |

#### Returns

`Promise`\<`Niivue`\>

Niivue instance

#### See

[live demo usage](https://niivue.com/demos/features/document.load.html)

---

### loadDocumentFromUrl()

```ts
loadDocumentFromUrl(url: string): Promise<void>;
```

Defined in: [niivue/index.ts:5045](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5045)

Loads an NVDocument from a URL and integrates it into the scene.

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `url`     | `string` |

#### Returns

`Promise`\<`void`\>

---

### loadDrawing()

```ts
loadDrawing(drawingBitmap: NVImage): boolean;
```

Defined in: [niivue/index.ts:3709](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3709)

Loads a drawing overlay and aligns it with the current background image.
Converts the input image to match the background's orientation and stores it as a drawable bitmap.
Initializes the undo history and prepares the drawing texture.

#### Parameters

| Parameter       | Type                                          | Description                                                                                             |
| --------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `drawingBitmap` | [`NVImage`](../../nvimage/classes/NVImage.md) | A `NVImage` object representing the drawing to load. Must match the dimensions of the background image. |

#### Returns

`boolean`

`true` if the drawing was successfully loaded and aligned; `false` if dimensions are incompatible.

---

### loadDrawingFromUrl()

```ts
loadDrawingFromUrl(fnm: string, isBinarize: boolean): Promise<boolean>;
```

Defined in: [niivue/index.ts:3832](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3832)

Open drawing

#### Parameters

| Parameter    | Type      | Default value | Description                                            |
| ------------ | --------- | ------------- | ------------------------------------------------------ |
| `fnm`        | `string`  | `undefined`   | filename of NIfTI format drawing                       |
| `isBinarize` | `boolean` | `false`       | if true will force drawing voxels to be either 0 or 1. |

#### Returns

`Promise`\<`boolean`\>

#### Example

```ts
niivue.loadDrawingFromUrl("../images/lesion.nii.gz");
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### loadFont()

```ts
loadFont(fontSheetUrl: any, metricsUrl: object): Promise<void>;
```

Defined in: [niivue/index.ts:7323](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7323)

Load typeface for colorbars, measurements and orientation text.

#### Parameters

| Parameter                               | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Default value        | Description                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------- |
| `fontSheetUrl`                          | `any`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `defaultFontPNG`     | URL to a bitmap font sheet image (e.g., a PNG atlas of glyphs)                    |
| `metricsUrl`                            | \{ `atlas`: \{ `distanceRange`: `number`; `height`: `number`; `size`: `number`; `type`: `string`; `width`: `number`; `yOrigin`: `string`; \}; `glyphs`: ( \| \{ `advance`: `number`; `atlasBounds?`: `undefined`; `planeBounds?`: `undefined`; `unicode`: `number`; \} \| \{ `advance`: `number`; `atlasBounds`: \{ `bottom`: `number`; `left`: `number`; `right`: `number`; `top`: `number`; \}; `planeBounds`: \{ `bottom`: `number`; `left`: `number`; `right`: `number`; `top`: `number`; \}; `unicode`: `number`; \})[]; `kerning`: `any`[]; `metrics`: \{ `ascender`: `number`; `descender`: `number`; `emSize`: `number`; `lineHeight`: `number`; `underlineThickness`: `number`; `underlineY`: `number`; \}; \} | `defaultFontMetrics` | URL to the corresponding font metrics JSON (defines character bounds and spacing) |
| `metricsUrl.atlas`                      | \{ `distanceRange`: `number`; `height`: `number`; `size`: `number`; `type`: `string`; `width`: `number`; `yOrigin`: `string`; \}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `...`                | -                                                                                 |
| `metricsUrl.atlas.distanceRange`        | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `2`                  | -                                                                                 |
| `metricsUrl.atlas.height`               | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `256`                | -                                                                                 |
| `metricsUrl.atlas.size`                 | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `59.65625`           | -                                                                                 |
| `metricsUrl.atlas.type`                 | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `"msdf"`             | -                                                                                 |
| `metricsUrl.atlas.width`                | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `512`                | -                                                                                 |
| `metricsUrl.atlas.yOrigin`              | `string`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `"bottom"`           | -                                                                                 |
| `metricsUrl.glyphs`                     | ( \| \{ `advance`: `number`; `atlasBounds?`: `undefined`; `planeBounds?`: `undefined`; `unicode`: `number`; \} \| \{ `advance`: `number`; `atlasBounds`: \{ `bottom`: `number`; `left`: `number`; `right`: `number`; `top`: `number`; \}; `planeBounds`: \{ `bottom`: `number`; `left`: `number`; `right`: `number`; `top`: `number`; \}; `unicode`: `number`; \})[]                                                                                                                                                                                                                                                                                                                                                    | `...`                | -                                                                                 |
| `metricsUrl.kerning`                    | `any`[]                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `[]`                 | -                                                                                 |
| `metricsUrl.metrics`                    | \{ `ascender`: `number`; `descender`: `number`; `emSize`: `number`; `lineHeight`: `number`; `underlineThickness`: `number`; `underlineY`: `number`; \}                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `...`                | -                                                                                 |
| `metricsUrl.metrics.ascender`           | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0.927734375`        | -                                                                                 |
| `metricsUrl.metrics.descender`          | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `-0.244140625`       | -                                                                                 |
| `metricsUrl.metrics.emSize`             | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `1`                  | -                                                                                 |
| `metricsUrl.metrics.lineHeight`         | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `1.171875`           | -                                                                                 |
| `metricsUrl.metrics.underlineThickness` | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `0.048828125`        | -                                                                                 |
| `metricsUrl.metrics.underlineY`         | `number`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `-0.09765625`        | -                                                                                 |

#### Returns

`Promise`\<`void`\>

a Promise that resolves when the font is loaded

#### Example

```ts
niivue.loadFont("./Roboto.png", "./Roboto.json");
```

#### See

[live demo usage](https://niivue.com/demos/features/selectfont.html)

---

### loadFreeSurferConnectome()

```ts
loadFreeSurferConnectome(json: FreeSurferConnectome): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5651](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5651)

load a connectome specified by json

#### Parameters

| Parameter | Type                                                                              | Description      |
| --------- | --------------------------------------------------------------------------------- | ---------------- |
| `json`    | [`FreeSurferConnectome`](../../nvconnectome/type-aliases/FreeSurferConnectome.md) | freesurfer model |

#### Returns

`Promise`\<`Niivue`\>

Niivue instance

#### See

[live demo usage](https://niivue.com/demos/features/connectome.html)

---

### loadFreeSurferConnectomeFromUrl()

```ts
loadFreeSurferConnectomeFromUrl(url: string, headers: object): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5639](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5639)

Load a FreeSurfer-style connectome from a given URL and initialize it.

#### Parameters

| Parameter | Type     | Description                                                                    |
| --------- | -------- | ------------------------------------------------------------------------------ |
| `url`     | `string` | the URL of the JSON-formatted connectome file                                  |
| `headers` | \{ \}    | optional HTTP headers to include in the fetch request (e.g. for authorization) |

#### Returns

`Promise`\<`Niivue`\>

the `Niivue` instance (for method chaining)

#### See

[live demo usage](https://niivue.com/demos/features/connectome.html)

---

### loadFromArrayBuffer()

```ts
loadFromArrayBuffer(buffer: ArrayBuffer, name: string): Promise<void>;
```

Defined in: [niivue/index.ts:2988](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2988)

Load an image or mesh from an array buffer

#### Parameters

| Parameter | Type          | Description                                                             |
| --------- | ------------- | ----------------------------------------------------------------------- |
| `buffer`  | `ArrayBuffer` | ArrayBuffer with the entire contents of a mesh or volume                |
| `name`    | `string`      | string of filename, extension used to infer type (NIfTI, MGH, MZ3, etc) |

#### Returns

`Promise`\<`void`\>

#### See

[live demo usage](http://192.168.0.150:8080/features/draganddrop.html)

---

### loadFromFile()

```ts
loadFromFile(file: File): Promise<void>;
```

Defined in: [niivue/index.ts:3006](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3006)

Load a mesh or image volume from a File object

#### Parameters

| Parameter | Type   | Description                                                        |
| --------- | ------ | ------------------------------------------------------------------ |
| `file`    | `File` | File object selected by the user (e.g. from an HTML input element) |

#### Returns

`Promise`\<`void`\>

a Promise that resolves when the file has been loaded and added to the scene

#### See

[live demo usage](https://niivue.com/demos/features/selectfont.html)

---

### loadFromUrl()

```ts
loadFromUrl(fnm: string): Promise<NVImage>;
```

Defined in: [niivue/index.ts:9550](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9550)

Load a NIfTI image from a URL and convert it to an NVImage object

#### Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `fnm`     | `string` | URL of the NIfTI file to load |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

a Promise resolving to an NVImage (not yet added to GPU or scene)

#### See

[live demo usage](https://niivue.com/demos/features/conform.html)

---

### loadImages()

```ts
loadImages(images: (
  | ImageFromUrlOptions
| LoadFromUrlParams)[]): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5382](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5382)

Load an array of image or mesh URLs using appropriate handlers

#### Parameters

| Parameter | Type                                                                                                                                                        | Description                                                     |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `images`  | ( \| [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md) \| [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md))[] | array of image or mesh descriptors (with URL and optional name) |

#### Returns

`Promise`\<`Niivue`\>

a Promise resolving to the current NiiVue instance after loading completes

#### Remarks

Automatically dispatches each item to either volume or mesh loader based on file extension or registered custom loader

#### See

[live demo usage](https://niivue.com/demos/features/timeseries2.html)

---

### loadMatCapTexture()

```ts
loadMatCapTexture(bmpUrl: string): Promise<WebGLTexture>;
```

Defined in: [niivue/index.ts:7266](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7266)

Load matcap for illumination model.

#### Parameters

| Parameter | Type     | Description                                         |
| --------- | -------- | --------------------------------------------------- |
| `bmpUrl`  | `string` | name of matcap to load ("Shiny", "Cortex", "Cream") |

#### Returns

`Promise`\<`WebGLTexture`\>

#### Example

```ts
niivue.loadMatCapTexture("Cortex");
```

#### See

[live demo usage](https://niivue.com/demos/features/shiny.volumes.html)

---

### loadMeshes()

```ts
loadMeshes(meshList: LoadFromUrlParams[]): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5600](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5600)

load an array of meshes

#### Parameters

| Parameter  | Type                                                                    | Description                                                                                  |
| ---------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `meshList` | [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md)[] | the array of objects to load. each object must have a resolvable "url" property at a minimum |

#### Returns

`Promise`\<`Niivue`\>

Niivue instance

#### Example

```ts
niivue = new Niivue();
niivue.loadMeshes([{ url: "someMesh.gii" }]);
```

#### See

[live demo usage](https://niivue.com/demos/features/meshes.html)

---

### loadVolumes()

```ts
loadVolumes(volumeList: ImageFromUrlOptions[]): Promise<Niivue>;
```

Defined in: [niivue/index.ts:5472](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5472)

load an array of volume objects

#### Parameters

| Parameter    | Type                                                                         | Description                                                                                  |
| ------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `volumeList` | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[] | the array of objects to load. each object must have a resolvable "url" property at a minimum |

#### Returns

`Promise`\<`Niivue`\>

returns the Niivue instance

#### Example

```ts
niivue = new Niivue()
niivue.loadVolumes([{url: 'someImage.nii.gz}, {url: 'anotherImage.nii.gz'}])
```

#### See

[live demo usage](https://niivue.com/demos/features/mask.html)

---

### meshShaderNames()

```ts
meshShaderNames(sort: boolean): string[];
```

Defined in: [niivue/index.ts:7507](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7507)

retrieve all currently loaded meshes

#### Parameters

| Parameter | Type      | Default value | Description                |
| --------- | --------- | ------------- | -------------------------- |
| `sort`    | `boolean` | `true`        | sort output alphabetically |

#### Returns

`string`[]

list of available mesh shader names

#### Example

```ts
niivue.meshShaderNames();
```

#### See

[live demo usage](https://niivue.com/demos/features/meshes.html)

---

### moveCrosshairInVox()

```ts
moveCrosshairInVox(
   x: number,
   y: number,
   z: number): void;
```

Defined in: [niivue/index.ts:14120](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L14120)

move crosshair a fixed number of voxels (not mm)

#### Parameters

| Parameter | Type     | Description                              |
| --------- | -------- | ---------------------------------------- |
| `x`       | `number` | translate left (-) or right (+)          |
| `y`       | `number` | translate posterior (-) or +anterior (+) |
| `z`       | `number` | translate inferior (-) or superior (+)   |

#### Returns

`void`

#### Example

```ts
niivue.moveCrosshairInVox(1, 0, 0);
```

#### See

[live demo usage](https://niivue.com/demos/features/draw2.html)

---

### moveVolumeDown()

```ts
moveVolumeDown(volume: NVImage): void;
```

Defined in: [niivue/index.ts:4495](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4495)

Move a volume down one index position in the stack of loaded volumes. This moves it down one layer

#### Parameters

| Parameter | Type                                          | Description        |
| --------- | --------------------------------------------- | ------------------ |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | the volume to move |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.moveVolumeDown(this.volumes[1]); // move the second image to the background position (it was 1 index, now will be 0)
```

---

### moveVolumeToBottom()

```ts
moveVolumeToBottom(volume: NVImage): void;
```

Defined in: [niivue/index.ts:4472](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4472)

Move a volume to the bottom of the stack of loaded volumes. The volume will become the background

#### Parameters

| Parameter | Type                                          | Description        |
| --------- | --------------------------------------------- | ------------------ |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | the volume to move |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.moveVolumeToBottom(this.volumes[3]); // move the 4th volume to the 0 position. It will be the new background
```

---

### moveVolumeToTop()

```ts
moveVolumeToTop(volume: NVImage): void;
```

Defined in: [niivue/index.ts:4507](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4507)

Move a volume to the top position in the stack of loaded volumes. This will be the top layer

#### Parameters

| Parameter | Type                                          | Description        |
| --------- | --------------------------------------------- | ------------------ |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | the volume to move |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.moveVolumeToTop(this.volumes[0]); // move the background image to the top layer position
```

---

### moveVolumeUp()

```ts
moveVolumeUp(volume: NVImage): void;
```

Defined in: [niivue/index.ts:4483](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4483)

Move a volume up one index position in the stack of loaded volumes. This moves it up one layer

#### Parameters

| Parameter | Type                                          | Description        |
| --------- | --------------------------------------------- | ------------------ |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | the volume to move |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.moveVolumeUp(this.volumes[0]); // move the background image to the second index position (it was 0 index, now will be 1)
```

---

### niftiArray2NVImage()

```ts
niftiArray2NVImage(bytes: Uint8Array): Promise<NVImage>;
```

Defined in: [niivue/index.ts:9540](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9540)

Convert a binary NIfTI file (as a Uint8Array) to an NVImage object

#### Parameters

| Parameter | Type         | Description                     |
| --------- | ------------ | ------------------------------- |
| `bytes`   | `Uint8Array` | binary contents of a NIfTI file |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

a Promise resolving to an NVImage object

#### See

[live demo usage](https://niivue.com/demos/features/conform.html)

---

### refreshColormaps()

```ts
refreshColormaps(): Niivue;
```

Defined in: [niivue/index.ts:9921](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9921)

Rebuild and upload all colormap textures for volumes and meshes

#### Returns

`Niivue`

the current NiiVue instance, or undefined if no colormaps are used

#### See

[live demo usage](https://niivue.com/demos/features/mesh.stats.html)

---

### refreshDrawing()

```ts
refreshDrawing(isForceRedraw: boolean, useClickToSegmentBitmap: boolean): void;
```

Defined in: [niivue/index.ts:6860](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6860)

copy drawing bitmap from CPU to GPU storage and redraw the screen

#### Parameters

| Parameter                 | Type      | Default value | Description                                |
| ------------------------- | --------- | ------------- | ------------------------------------------ |
| `isForceRedraw`           | `boolean` | `true`        | refreshes scene immediately (default true) |
| `useClickToSegmentBitmap` | `boolean` | `false`       | -                                          |

#### Returns

`void`

#### Example

```ts
niivue.refreshDrawing();
```

#### See

[live demo usage](https://niivue.com/demos/features/cactus.html)

---

### removeHaze()

```ts
removeHaze(level: number, volIndex: number): void;
```

Defined in: [niivue/index.ts:4009](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4009)

remove dark voxels in air

#### Parameters

| Parameter  | Type     | Default value | Description                                   |
| ---------- | -------- | ------------- | --------------------------------------------- |
| `level`    | `number` | `5`           | (1-5) larger values for more preserved voxels |
| `volIndex` | `number` | `0`           | volume to dehaze                              |

#### Returns

`void`

#### Example

```ts
niivue.removeHaze(3, 0);
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### removeMesh()

```ts
removeMesh(mesh: NVMesh): void;
```

Defined in: [niivue/index.ts:4440](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4440)

Remove a triangulated mesh, connectome or tractogram

#### Parameters

| Parameter | Type                                       | Description    |
| --------- | ------------------------------------------ | -------------- |
| `mesh`    | [`NVMesh`](../../nvmesh/classes/NVMesh.md) | mesh to delete |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.removeMesh(this.meshes[3]);
```

#### See

[live demo usage](https://niivue.com/demos/features/connectome.html)

---

### removeMeshByUrl()

```ts
removeMeshByUrl(url: string): void;
```

Defined in: [niivue/index.ts:4456](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4456)

Remove a triangulated mesh, connectome or tractogram

#### Parameters

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `url`     | `string` | URL of mesh to delete |

#### Returns

`void`

#### Example

```ts
niivue.removeMeshByUrl("../images/cit168.mz3");
```

---

### removeVolume()

```ts
removeVolume(volume: NVImage): void;
```

Defined in: [niivue/index.ts:4405](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4405)

Remove a volume

#### Parameters

| Parameter | Type                                          | Description      |
| --------- | --------------------------------------------- | ---------------- |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | volume to delete |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.removeVolume(this.volumes[3]);
```

#### See

[live demo usage](https://niivue.com/demos/features/document.3d.html)

---

### removeVolumeByIndex()

```ts
removeVolumeByIndex(index: number): void;
```

Defined in: [niivue/index.ts:4425](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4425)

Remove a volume from the scene by its index

#### Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `index`   | `number` | index of the volume to remove |

#### Returns

`void`

#### Throws

if the index is out of bounds

#### See

[live demo usage](https://niivue.com/demos/features/clusterize.html)

---

### removeVolumeByUrl()

```ts
removeVolumeByUrl(url: string): void;
```

Defined in: [niivue/index.ts:2883](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2883)

Remove volume by url

#### Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `url`     | `string` | Volume added by url to remove |

#### Returns

`void`

#### See

[live demo usage](https://niivue.com/demos/features/document.3d.html)

---

### reverseFaces()

```ts
reverseFaces(mesh: number): void;
```

Defined in: [niivue/index.ts:4252](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4252)

reverse triangle winding of mesh (swap front and back faces)

#### Parameters

| Parameter | Type     | Description                |
| --------- | -------- | -------------------------- |
| `mesh`    | `number` | identity of mesh to change |

#### Returns

`void`

#### Example

```ts
niivue.reverseFaces(niivue.meshes[0].id);
```

#### See

[live demo usage](https://niivue.com/demos/features/meshes.html)

---

### saveDocument()

```ts
saveDocument(
   fileName: string,
   compress: boolean,
options: object): Promise<void>;
```

Defined in: [niivue/index.ts:5352](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5352)

Save the current scene as an .nvd document.

#### Parameters

| Parameter               | Type                                                         | Default value    | Description                                                                                                                             |
| ----------------------- | ------------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `fileName`              | `string`                                                     | `'untitled.nvd'` | Name of the file to create (default "untitled.nvd")                                                                                     |
| `compress`              | `boolean`                                                    | `true`           | If true, gzip-compress the JSON (default true)                                                                                          |
| `options`               | \{ `embedImages?`: `boolean`; `embedPreview?`: `boolean`; \} | `{}`             | Fine-grained switches: • embedImages – store encodedImageBlobs (default true) • embedPreview – store previewImageDataURL (default true) |
| `options.embedImages?`  | `boolean`                                                    | `undefined`      | -                                                                                                                                       |
| `options.embedPreview?` | `boolean`                                                    | `undefined`      | -                                                                                                                                       |

#### Returns

`Promise`\<`void`\>

#### Example

```ts
// smallest possible file – no preview, just metadata
await nv.saveDocument("scene.nvd", true, {
  embedImages: false,
  embedPreview: false,
});
```

#### See

[live demo usage](https://niivue.com/demos/features/document.3d.html)

---

### saveHTML()

```ts
saveHTML(
   fileName: string,
   canvasId: string,
esm: string): Promise<void>;
```

Defined in: [niivue/index.ts:5317](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5317)

Save the current scene as a standalone HTML file

#### Parameters

| Parameter  | Type     | Default value     | Description                                              |
| ---------- | -------- | ----------------- | -------------------------------------------------------- |
| `fileName` | `string` | `'untitled.html'` | name of the HTML file to save (default: "untitled.html") |
| `canvasId` | `string` | `'gl1'`           | ID of the canvas element NiiVue will attach to           |
| `esm`      | `string` | `undefined`       | bundled ES module source for NiiVue                      |

#### Returns

`Promise`\<`void`\>

a Promise that resolves when the file is downloaded

#### See

[live demo usage](https://niivue.com/demos/features/save.html.html)

---

### saveImage()

```ts
saveImage(options: SaveImageOptions): Promise<boolean | Uint8Array>;
```

Defined in: [niivue/index.ts:4060](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4060)

Save voxel-based image to disk.

#### Parameters

| Parameter | Type               | Default value             | Description                                                                                                                                                                                                                                  |
| --------- | ------------------ | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `options` | `SaveImageOptions` | `defaultSaveImageOptions` | configuration object with the following fields: - `filename`: name of the NIfTI image to create - `isSaveDrawing`: whether to save the drawing layer or the background image - `volumeByIndex`: which image layer to save (0 for background) |

#### Returns

`Promise`\<`boolean` \| `Uint8Array`\>

`true` if successful when writing to disk, or a `Uint8Array` if exported as binary data

#### Example

```ts
niivue.saveImage({ filename: "myimage.nii.gz", isSaveDrawing: true });
niivue.saveImage({ filename: "myimage.nii.gz", isSaveDrawing: true });
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### saveScene()

```ts
saveScene(filename: string): Promise<void>;
```

Defined in: [niivue/index.ts:1010](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1010)

save webgl2 canvas as png format bitmap

#### Parameters

| Parameter  | Type     | Default value  | Description                 |
| ---------- | -------- | -------------- | --------------------------- |
| `filename` | `string` | `'niivue.png'` | filename for screen capture |

#### Returns

`Promise`\<`void`\>

#### Example

```ts
niivue.saveScene("test.png");
```

#### See

[live demo usage](https://niivue.com/demos/features/ui.html)

---

### setAdditiveBlend()

```ts
setAdditiveBlend(isAdditiveBlend: boolean): void;
```

Defined in: [niivue/index.ts:3533](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3533)

control whether voxel overlays are combined using additive (emission) or traditional (transmission) blending.

#### Parameters

| Parameter         | Type      | Description                                    |
| ----------------- | --------- | ---------------------------------------------- |
| `isAdditiveBlend` | `boolean` | emission (true) or transmission (false) mixing |

#### Returns

`void`

#### Example

```ts
niivue.isAdditiveBlend(true);
```

#### See

[live demo usage](https://niivue.com/demos/features/additive.voxels.html)

---

### setAtlasOutline()

```ts
setAtlasOutline(isOutline: number): void;
```

Defined in: [niivue/index.ts:11884](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11884)

Enable or disable atlas outline overlay

#### Parameters

| Parameter   | Type     | Description                       |
| ----------- | -------- | --------------------------------- |
| `isOutline` | `number` | number 0 to 1 for outline opacity |

#### Returns

`void`

#### See

[live demo usage](https://niivue.com/demos/features/atlas.sparse.html)

---

### setBounds()

```ts
setBounds(bounds: [number, number, number, number]): void;
```

Defined in: [niivue/index.ts:4785](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4785)

Update the drawing bounds for this Niivue instance.

#### Parameters

| Parameter | Type                                       | Description                                                                                                                                                    |
| --------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bounds`  | \[`number`, `number`, `number`, `number`\] | [x1, y1, x2, y2] in normalized (0–1) coordinates. Example: nv.setBounds([0,0,0.5,0.5]) // top-left quarter nv.setBounds([0.5,0.5,1,1]) // bottom-right quarter |

#### Returns

`void`

---

### setClipPlane()

```ts
setClipPlane(depthAzimuthElevation: number[]): void;
```

Defined in: [niivue/index.ts:4626](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4626)

Update the clip plane orientation in 3D view mode.

#### Parameters

| Parameter               | Type       | Description                                                                                                                                                                                                                                           |
| ----------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `depthAzimuthElevation` | `number`[] | a 3-component array: - `depth`: distance of clip plane from center of volume (0 to ~1.73, or >2.0 to disable clipping) - `azimuth`: camera angle around the object in degrees (0–360 or -180–180) - `elevation`: camera height in degrees (-90 to 90) |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.setClipPlane([42, 42]);
```

#### See

[live demo usage](https://niivue.com/demos/features/mask.html)

---

### setClipPlaneColor()

```ts
setClipPlaneColor(color: number[]): void;
```

Defined in: [niivue/index.ts:4900](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4900)

Set the color of the 3D clip plane.

#### Parameters

| Parameter | Type       | Description                                                                                                                                                                                                                                                                            |
| --------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `color`   | `number`[] | An array of RGBA values. - **R**, **G**, **B** components range from `0.0` to `1.0`. - **A** (alpha) component ranges from `-1.0` to `1.0`, where: - `0.0–1.0` → controls background translucency. - `-1.0–0.0` → applies translucent shading to the volume instead of the background. |

#### Returns

`void`

#### Example

```ts
niivue.setClipPlaneColor([1, 1, 1, 0.5]); // white, translucent background
niivue.setClipPlaneColor([1, 1, 1, -0.5]); // white, translucent shading
```

#### See

[Live demo usage](https://niivue.com/demos/features/clipplanes.html)

---

### setClipPlanes()

```ts
setClipPlanes(depthAziElevs: number[][]): void;
```

Defined in: [niivue/index.ts:4600](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4600)

Set multiple clip planes from their depth/azimuth/elevation definitions.

depth: distance of clip plane from center of volume, range 0..~1.73
(e.g. 2.0 for no clip plane)
azimuth: camera position in degrees around object, typically 0..360
(or -180..+180)
elevation: camera height in degrees, range -90..90

This replaces the entire `clipPlanes` and `clipPlaneDepthAziElevs` arrays,
ensuring they always have the same length.

#### Parameters

| Parameter       | Type         | Description                                         |
| --------------- | ------------ | --------------------------------------------------- |
| `depthAziElevs` | `number`[][] | array of `[depth, azimuthDeg, elevationDeg]` values |

#### Returns

`void`

#### See

[live demo usage](https://niivue.com/demos/features/clipplanesmulti.html)

---

### ~~setClipPlaneThick()~~

```ts
setClipPlaneThick(_thick: number): void;
```

Defined in: [niivue/index.ts:4912](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4912)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `_thick`  | `number` |

#### Returns

`void`

#### Deprecated

This method has been removed.
Use [setClipPlanes](#setclipplanes) instead, which generalizes clip plane configuration

#### See

[Multiple clip plane demo](https://niivue.com/demos/features/clipplanesmulti.html)

---

### ~~setClipVolume()~~

```ts
setClipVolume(_low: number[], _high: number[]): void;
```

Defined in: [niivue/index.ts:4921](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4921)

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `_low`    | `number`[] |
| `_high`   | `number`[] |

#### Returns

`void`

#### Deprecated

This method has been removed.
Use [setClipPlanes](#setclipplanes) instead, which generalizes clip plane configuration

#### See

[Multiple clip plane demo](https://niivue.com/demos/features/clipplanesmulti.html)

---

### setColormap()

```ts
setColormap(id: string, colormap: string): void;
```

Defined in: [niivue/index.ts:8954](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8954)

update the colormap of an image given its ID

#### Parameters

| Parameter  | Type     | Description                     |
| ---------- | -------- | ------------------------------- |
| `id`       | `string` | the ID of the NVImage           |
| `colormap` | `string` | the name of the colormap to use |

#### Returns

`void`

#### Example

```ts
niivue.setColormap(niivue.volumes[0].id,, 'red')
```

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### ~~setColorMap()~~

```ts
setColorMap(id: string, colormap: string): void;
```

Defined in: [niivue/index.ts:9728](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9728)

#### Parameters

| Parameter  | Type     | Description                   |
| ---------- | -------- | ----------------------------- |
| `id`       | `string` | ID of the volume              |
| `colormap` | `string` | name of the colormap to apply |

#### Returns

`void`

#### Deprecated

Use [setColormap](#setcolormap) instead. This alias is retained for compatibility with NiiVue < 0.35.

---

### setColormapNegative()

```ts
setColormapNegative(id: string, colormapNegative: string): void;
```

Defined in: [niivue/index.ts:9741](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9741)

use given color map for negative voxels in image

#### Parameters

| Parameter          | Type     | Description                     |
| ------------------ | -------- | ------------------------------- |
| `id`               | `string` | the ID of the NVImage           |
| `colormapNegative` | `string` | the name of the colormap to use |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.setColormapNegative(niivue.volumes[1].id, "winter");
```

#### See

[live demo usage](https://niivue.com/demos/features/mosaics2.html)

---

### setCornerOrientationText()

```ts
setCornerOrientationText(isCornerOrientationText: boolean): void;
```

Defined in: [niivue/index.ts:3338](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3338)

determine if text appears at corner (true) or sides of 2D slice.

#### Parameters

| Parameter                 | Type      | Description               |
| ------------------------- | --------- | ------------------------- |
| `isCornerOrientationText` | `boolean` | controls position of text |

#### Returns

`void`

#### Example

```ts
niivue.setCornerOrientationText(true);
```

#### See

[live demo usage](https://niivue.com/demos/features/worldspace2.html)

---

### setCrosshairColor()

```ts
setCrosshairColor(color: number[]): void;
```

Defined in: [niivue/index.ts:4670](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4670)

set the crosshair and colorbar outline color

#### Parameters

| Parameter | Type       | Description                             |
| --------- | ---------- | --------------------------------------- |
| `color`   | `number`[] | an RGBA array. values range from 0 to 1 |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.setCrosshairColor([0, 1, 0, 0.5]); // set crosshair to transparent green
```

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### setCrosshairWidth()

```ts
setCrosshairWidth(crosshairWidth: number): void;
```

Defined in: [niivue/index.ts:4680](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4680)

set thickness of crosshair

#### Parameters

| Parameter        | Type     |
| ---------------- | -------- |
| `crosshairWidth` | `number` |

#### Returns

`void`

#### Example

```ts
niivue.crosshairWidth(2);
```

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### setCustomGradientTexture()

```ts
setCustomGradientTexture(data: Float32Array | Uint8Array, dims?: number[]): void;
```

Defined in: [niivue/index.ts:7916](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7916)

Set a custom gradient texture to use instead of the one produced by gradientGL
When a custom gradient texture is set, the useCustomGradientTexture flag is set to true
to prevent gradientGL from overwriting the custom texture during volume updates.

#### Parameters

| Parameter | Type                           | Description                                                                                            |
| --------- | ------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `data`    | `Float32Array` \| `Uint8Array` | Float32Array or Uint8Array containing RGBA gradient data, or null to revert to auto-generated gradient |
| `dims?`   | `number`[]                     | Optional dimensions array [width, height, depth]. If not provided, uses current volume dimensions      |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.loadVolumes([{ url: "./someImage.nii" }]);
// Create custom gradient data
const customGradient = new Float32Array(256 * 256 * 256 * 4); // example dimensions
// ... fill customGradient with desired values
niivue.setCustomGradientTexture(customGradient, [256, 256, 256]);

// To revert to auto-generated gradient:
niivue.setCustomGradientTexture(null);
```

#### See

[live demo usage](https://niivue.com/demos/features/gradient.custom.html)

---

### setCustomLayout()

```ts
setCustomLayout(layout: object[]): void;
```

Defined in: [niivue/index.ts:3401](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3401)

Set a custom slice layout. This overrides the built-in layouts.

#### Parameters

| Parameter | Type       | Description                                        |
| --------- | ---------- | -------------------------------------------------- |
| `layout`  | `object`[] | Array of layout specifications for each slice view |

#### Returns

`void`

#### Example

```ts
niivue.setCustomLayout([
    // Left 50% - Sag
    {sliceType: 2, position: [0, 0, 0.5, 1.0]},
    // Top right - Cor
    {sliceType: 1, position: [0.5, 0, 0.5, 0.5]},
    // Bottom right - Ax
    {sliceType: 0, position: [0.5, 0.5, 0.5, 0.5]}
  ])

produces:
+----------------+----------------+
|                |                |
|                |     coronal    |
|                |                |
|                |                |
|   sagittal     +----------------+
|                |                |
|                |     axial      |
|                |                |
|                |                |
+----------------+----------------+
```

---

### setCustomMeshShader()

```ts
setCustomMeshShader(fragmentShaderText: string, name: string): number;
```

Defined in: [niivue/index.ts:7492](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7492)

Define a new GLSL shader program to influence mesh coloration

#### Parameters

| Parameter            | Type     | Default value | Description                                                     |
| -------------------- | -------- | ------------- | --------------------------------------------------------------- |
| `fragmentShaderText` | `string` | `''`          | the GLSL source code for the custom fragment shader             |
| `name`               | `string` | `'Custom'`    | a descriptive label for the shader (used in menus or debugging) |

#### Returns

`number`

the index of the new shader (use with [setMeshShader](#setmeshshader))

#### See

[live demo usage](https://niivue.com/demos/features/mesh.atlas.html)

---

### setDefaults()

```ts
setDefaults(options: Partial<NVConfigOptions>, resetBriCon: boolean): void;
```

Defined in: [niivue/index.ts:3471](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3471)

Reset scene to default settings.

#### Parameters

| Parameter     | Type                                                                               | Default value | Description                          |
| ------------- | ---------------------------------------------------------------------------------- | ------------- | ------------------------------------ |
| `options`     | `Partial`\<[`NVConfigOptions`](../../nvdocument/type-aliases/NVConfigOptions.md)\> | `{}`          |                                      |
| `resetBriCon` | `boolean`                                                                          | `false`       | also reset contrast (default false). |

#### Returns

`void`

#### See

- NiiVueOptions
- [live demo usage](https://niivue.com/demos/features/connectome.html)

#### Example

```ts
niivue.nv1.setDefaults(opts, true);
```

---

### setDragMode()

```ts
setDragMode(mode: string | DRAG_MODE): void;
```

Defined in: [niivue/index.ts:11048](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11048)

Set the drag mode for mouse interactions.

#### Parameters

| Parameter | Type                    | Description                                                                                                          |
| --------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `mode`    | `string` \| `DRAG_MODE` | The drag mode to set ('none', 'contrast', 'measurement', 'angle', 'pan', 'slicer3D', 'callbackOnly', 'roiSelection') |

#### Returns

`void`

---

### setDrawColormap()

```ts
setDrawColormap(name: string): void;
```

Defined in: [niivue/index.ts:4702](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4702)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

#### Returns

`void`

---

### setDrawingEnabled()

```ts
setDrawingEnabled(trueOrFalse: boolean): void;
```

Defined in: [niivue/index.ts:4713](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4713)

does dragging over a 2D slice create a drawing?

#### Parameters

| Parameter     | Type      | Description                   |
| ------------- | --------- | ----------------------------- |
| `trueOrFalse` | `boolean` | enabled (true) or not (false) |

#### Returns

`void`

#### Example

```ts
niivue.setDrawingEnabled(true);
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### setDrawOpacity()

```ts
setDrawOpacity(opacity: number): void;
```

Defined in: [niivue/index.ts:4759](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4759)

control whether drawing is transparent (0), opaque (1) or translucent (between 0 and 1).

#### Parameters

| Parameter | Type     | Description             |
| --------- | -------- | ----------------------- |
| `opacity` | `number` | translucency of drawing |

#### Returns

`void`

#### Example

```ts
niivue.setDrawOpacity(0.7);
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### setFrame4D()

```ts
setFrame4D(id: string, frame4D: number): void;
```

Defined in: [niivue/index.ts:9819](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9819)

show desired 3D volume from 4D time series

#### Parameters

| Parameter | Type     | Description                          |
| --------- | -------- | ------------------------------------ |
| `id`      | `string` | the ID of the 4D NVImage             |
| `frame4D` | `number` | frame to display (indexed from zero) |

#### Returns

`void`

#### Example

```ts
nv1.setFrame4D(nv1.volumes[0].id, 42);
```

#### See

[live demo usage](https://niivue.com/demos/features/timeseries.html)

---

### setGamma()

```ts
setGamma(gamma: number): void;
```

Defined in: [niivue/index.ts:9778](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9778)

adjust screen gamma. Low values emphasize shadows but can appear flat, high gamma hides shadow details.

#### Parameters

| Parameter | Type     | Default value | Description                     |
| --------- | -------- | ------------- | ------------------------------- |
| `gamma`   | `number` | `1.0`         | selects luminance, default is 1 |

#### Returns

`void`

#### Example

```ts
niivue.setGamma(1.0);
```

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### setGradientOpacity()

```ts
setGradientOpacity(gradientOpacity: number, renderSilhouette: number): Promise<void>;
```

Defined in: [niivue/index.ts:4969](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4969)

set volume rendering opacity influence of the gradient magnitude

#### Parameters

| Parameter          | Type     | Default value | Description                                                                        |
| ------------------ | -------- | ------------- | ---------------------------------------------------------------------------------- |
| `gradientOpacity`  | `number` | `0.0`         | amount of gradient magnitude influence on opacity (0..1), default 0 (no-influence) |
| `renderSilhouette` | `number` | `0.0`         | make core transparent to enhance rims (0..1), default 0 (no-influence)             |

#### Returns

`Promise`\<`void`\>

#### Example

```ts
niivue.setGradientOpacity(0.6);
```

#### See

[live demo usage](https://niivue.com/demos/features/gradient.opacity.html)

---

### setHeroImage()

```ts
setHeroImage(fraction: number): void;
```

Defined in: [niivue/index.ts:3370](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3370)

determine proportion of screen real estate devoted to rendering in multiplanar view.

#### Parameters

| Parameter  | Type     | Description                                                         |
| ---------- | -------- | ------------------------------------------------------------------- |
| `fraction` | `number` | proportion of screen devoted to primary (hero) image (0 to disable) |

#### Returns

`void`

#### Example

```ts
niivue.setHeroImage(0.5);
```

#### See

[live demo usage](https://niivue.com/demos/features/layout.html)

---

### setHighResolutionCapable()

```ts
setHighResolutionCapable(forceDevicePixelRatio: number | boolean): void;
```

Defined in: [niivue/index.ts:3553](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3553)

Force WebGL canvas to use high resolution display, regardless of browser defaults.

#### Parameters

| Parameter               | Type                  | Description                                                        |
| ----------------------- | --------------------- | ------------------------------------------------------------------ |
| `forceDevicePixelRatio` | `number` \| `boolean` | 1: block high DPI; 0= allow high DPI: >0 use specified pixel ratio |

#### Returns

`void`

#### Example

```ts
niivue.setHighResolutionCapable(true);
```

#### See

[live demo usage](https://niivue.com/demos/features/sync.mesh.html)

---

### setInterpolation()

```ts
setInterpolation(isNearest: boolean): void;
```

Defined in: [niivue/index.ts:11896](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11896)

select between nearest and linear interpolation for voxel based images

#### Parameters

| Parameter   | Type      | Description                                                               |
| ----------- | --------- | ------------------------------------------------------------------------- |
| `isNearest` | `boolean` | whether nearest neighbor interpolation is used, else linear interpolation |

#### Returns

`void`

#### Example

```ts
niivue.setInterpolation(true);
```

#### See

[live demo usage](https://niivue.com/demos/features/draw2.html)

---

### setIsOrientationTextVisible()

```ts
setIsOrientationTextVisible(isOrientationTextVisible: boolean): void;
```

Defined in: [niivue/index.ts:3349](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3349)

Show or hide orientation labels (e.g., L/R, A/P) in 2D slice views

#### Parameters

| Parameter                  | Type      | Description                                  |
| -------------------------- | --------- | -------------------------------------------- |
| `isOrientationTextVisible` | `boolean` | whether orientation text should be displayed |

#### Returns

`void`

#### Example

```ts
niivue.setIsOrientationTextVisible(false);
```

#### See

[live demo usage](https://niivue.com/demos/features/basic.multiplanar.html)

---

### setMesh()

```ts
setMesh(mesh: NVMesh, toIndex: number): void;
```

Defined in: [niivue/index.ts:4373](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4373)

Reorders a mesh within the internal mesh list.

#### Parameters

| Parameter | Type                                       | Default value | Description                                                                                                                                                 |
| --------- | ------------------------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mesh`    | [`NVMesh`](../../nvmesh/classes/NVMesh.md) | `undefined`   | The `NVMesh` instance to reposition.                                                                                                                        |
| `toIndex` | `number`                                   | `0`           | Target index to move the mesh to. - If `0`, moves mesh to the front. - If `< 0`, removes the mesh. - If within bounds, inserts mesh at the specified index. |

#### Returns

`void`

---

### setMeshLayerProperty()

```ts
setMeshLayerProperty(
   mesh: string | number,
   layer: number,
   key: keyof NVMeshLayer,
val: number): Promise<void>;
```

Defined in: [niivue/index.ts:4271](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4271)

reverse triangle winding of mesh (swap front and back faces)

#### Parameters

| Parameter | Type                                                            | Description                                       |
| --------- | --------------------------------------------------------------- | ------------------------------------------------- |
| `mesh`    | `string` \| `number`                                            | identity of mesh to change                        |
| `layer`   | `number`                                                        | selects the mesh overlay (e.g. GIfTI or STC file) |
| `key`     | keyof [`NVMeshLayer`](../../nvmesh/type-aliases/NVMeshLayer.md) | attribute to change                               |
| `val`     | `number`                                                        | value for attribute                               |

#### Returns

`Promise`\<`void`\>

#### Example

```ts
niivue.setMeshLayerProperty(niivue.meshes[0].id, 0, "frame4D", 22);
```

#### See

[live demo usage](https://niivue.com/demos/features/mesh.4D.html)

---

### setMeshProperty()

```ts
setMeshProperty(
   id: number,
   key: keyof NVMesh,
   val:
  | string
  | number
  | boolean
  | number[]
  | ColorMap
  | Float32Array
  | Uint8Array
  | LegacyConnectome): void;
```

Defined in: [niivue/index.ts:4193](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4193)

change property of mesh, tractogram or connectome

#### Parameters

| Parameter | Type                                                                                                                                                                                                                   | Description                |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `id`      | `number`                                                                                                                                                                                                               | identity of mesh to change |
| `key`     | keyof [`NVMesh`](../../nvmesh/classes/NVMesh.md)                                                                                                                                                                       | attribute to change        |
| `val`     | \| `string` \| `number` \| `boolean` \| `number`[] \| [`ColorMap`](../../colortables/type-aliases/ColorMap.md) \| `Float32Array` \| `Uint8Array` \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) | for attribute              |

#### Returns

`void`

#### Example

```ts
niivue.setMeshProperty(niivue.meshes[0].id, "fiberLength", 42);
```

#### See

[live demo usage](https://niivue.com/demos/features/meshes.html)

---

### setMeshShader()

```ts
setMeshShader(id: string | number, meshShaderNameOrNumber: string | number): void;
```

Defined in: [niivue/index.ts:7394](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7394)

select new shader for triangulated meshes and connectomes. Note that this function requires the mesh is fully loaded: you may want use `await` with loadMeshes (as seen in live demo).

#### Parameters

| Parameter                | Type                 | Default value | Description               |
| ------------------------ | -------------------- | ------------- | ------------------------- |
| `id`                     | `string` \| `number` | `undefined`   | id of mesh to change      |
| `meshShaderNameOrNumber` | `string` \| `number` | `2`           | identify shader for usage |

#### Returns

`void`

#### Example

```ts
niivue.setMeshShader("toon");
```

#### See

[live demo usage](https://niivue.com/demos/features/meshes.html)

---

### setMeshThicknessOn2D()

```ts
setMeshThicknessOn2D(meshThicknessOn2D: number): void;
```

Defined in: [niivue/index.ts:3500](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3500)

Limit visibility of mesh in front of a 2D image. Requires world-space mode.

#### Parameters

| Parameter           | Type     | Description                                                                                   |
| ------------------- | -------- | --------------------------------------------------------------------------------------------- |
| `meshThicknessOn2D` | `number` | distance from voxels for clipping mesh. Use Infinity to show entire mesh or 0.0 to hide mesh. |

#### Returns

`void`

#### Example

```ts
niivue.setMeshThicknessOn2D(42);
```

#### See

[live demo usage](https://niivue.com/demos/features/worldspace2.html)

---

### setModulationImage()

```ts
setModulationImage(
   idTarget: string,
   idModulation: string,
   modulateAlpha: number): void;
```

Defined in: [niivue/index.ts:9756](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9756)

modulate intensity of one image based on intensity of another

#### Parameters

| Parameter       | Type     | Default value | Description                                                                   |
| --------------- | -------- | ------------- | ----------------------------------------------------------------------------- |
| `idTarget`      | `string` | `undefined`   | the ID of the NVImage to be biased                                            |
| `idModulation`  | `string` | `undefined`   | the ID of the NVImage that controls bias (empty string to disable modulation) |
| `modulateAlpha` | `number` | `0`           | does the modulation influence alpha transparency (values greater than 1).     |

#### Returns

`void`

#### Example

```ts
niivue.setModulationImage(niivue.volumes[0].id, niivue.volumes[1].id);
```

#### See

- [live demo scalar usage](https://niivue.com/demos/features/modulate.html)
- [live demo usage](https://niivue.com/demos/features/modulateAfni.html)

---

### setMouseEventConfig()

```ts
setMouseEventConfig(config: MouseEventConfig): void;
```

Defined in: [niivue/index.ts:11108](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11108)

Set custom mouse event configuration for button mappings.

#### Parameters

| Parameter | Type                                                                  | Description                      |
| --------- | --------------------------------------------------------------------- | -------------------------------- |
| `config`  | [`MouseEventConfig`](../../nvdocument/interfaces/MouseEventConfig.md) | Mouse event configuration object |

#### Returns

`void`

#### Example

```js
nv.setMouseEventConfig({
  leftButton: {
    primary: DRAG_MODE.windowing,
    withShift: DRAG_MODE.measurement,
    withCtrl: DRAG_MODE.crosshair,
  },
  rightButton: DRAG_MODE.crosshair,
  centerButton: DRAG_MODE.pan,
});
```

---

### setMultiplanarLayout()

```ts
setMultiplanarLayout(layout: number): void;
```

Defined in: [niivue/index.ts:3324](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3324)

control placement of 2D slices.

#### Parameters

| Parameter | Type     | Description                          |
| --------- | -------- | ------------------------------------ |
| `layout`  | `number` | AUTO: 0, COLUMN: 1, GRID: 2, ROW: 3, |

#### Returns

`void`

#### Example

```ts
niivue.setMultiplanarLayout(2);
```

#### See

[live demo usage](https://niivue.com/demos/features/layout.html)

---

### setMultiplanarPadPixels()

```ts
setMultiplanarPadPixels(pixels: number): void;
```

Defined in: [niivue/index.ts:3313](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3313)

insert a gap between slices of a mutliplanar view.

#### Parameters

| Parameter | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `pixels`  | `number` | spacing between tiles of multiplanar view |

#### Returns

`void`

#### Example

```ts
niivue.setMultiplanarPadPixels(4);
```

#### See

[live demo usage](https://niivue.com/demos/features/atlas.html)

---

### setOpacity()

```ts
setOpacity(volIdx: number, newOpacity: number): void;
```

Defined in: [niivue/index.ts:4870](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4870)

set the opacity of a volume given by volume index

#### Parameters

| Parameter    | Type     | Description                                                                                          |
| ------------ | -------- | ---------------------------------------------------------------------------------------------------- |
| `volIdx`     | `number` | the volume index of the volume to change                                                             |
| `newOpacity` | `number` | the opacity value. valid values range from 0 to 1. 0 will effectively remove a volume from the scene |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.setOpacity(0, 0.5); // make the first volume transparent
```

#### See

[live demo usage](https://niivue.com/demos/features/atlas.html)

---

### setPan2Dxyzmm()

```ts
setPan2Dxyzmm(xyzmmZoom: vec4): void;
```

Defined in: [niivue/index.ts:4286](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4286)

adjust offset position and scale of 2D sliceScale

#### Parameters

| Parameter   | Type   | Description                                           |
| ----------- | ------ | ----------------------------------------------------- |
| `xyzmmZoom` | `vec4` | first three components are spatial, fourth is scaling |

#### Returns

`void`

#### Example

```ts
niivue.setPan2Dxyzmm([5, -4, 2, 1.5]);
```

---

### setPenValue()

```ts
setPenValue(penValue: number, isFilledPen: boolean): void;
```

Defined in: [niivue/index.ts:4747](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4747)

determine color and style of drawing

#### Parameters

| Parameter     | Type      | Default value | Description                                       |
| ------------- | --------- | ------------- | ------------------------------------------------- |
| `penValue`    | `number`  | `undefined`   | sets the color of the pen                         |
| `isFilledPen` | `boolean` | `false`       | determines if dragging creates flood-filled shape |

#### Returns

`void`

#### Example

```ts
niivue.setPenValue(1, true);
```

#### See

[live demo usage](https://niivue.com/demos/features/draw.ui.html)

---

### setRadiologicalConvention()

```ts
setRadiologicalConvention(isRadiologicalConvention: boolean): void;
```

Defined in: [niivue/index.ts:3459](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3459)

control whether 2D slices use radiological or neurological convention.

#### Parameters

| Parameter                  | Type      | Description            |
| -------------------------- | --------- | ---------------------- |
| `isRadiologicalConvention` | `boolean` | new display convention |

#### Returns

`void`

#### Example

```ts
niivue.setRadiologicalConvention(true);
```

#### See

[live demo usage](https://niivue.com/demos/features/worldspace.html)

---

### setRenderAzimuthElevation()

```ts
setRenderAzimuthElevation(a: number, e: number): void;
```

Defined in: [niivue/index.ts:4299](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4299)

set rotation of 3D render view

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `a`       | `number` |
| `e`       | `number` |

#### Returns

`void`

#### Example

```ts
niivue.setRenderAzimuthElevation(45, 15);
```

#### See

[live demo usage](https://niivue.com/demos/features/mask.html)

---

### setRenderDrawAmbientOcclusion()

```ts
setRenderDrawAmbientOcclusion(ao: number): void;
```

Defined in: [niivue/index.ts:9712](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9712)

darken crevices and brighten corners when 3D rendering drawings.

#### Parameters

| Parameter | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `ao`      | `number` | amount of ambient occlusion (default 0.4) |

#### Returns

`void`

#### See

[live demo usage](https://niivue.com/demos/features/torso.html)

---

### setScale()

```ts
setScale(scale: number): void;
```

Defined in: [niivue/index.ts:4882](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4882)

set the scale of the 3D rendering. Larger numbers effectively zoom.

#### Parameters

| Parameter | Type     | Description         |
| --------- | -------- | ------------------- |
| `scale`   | `number` | the new scale value |

#### Returns

`void`

#### Example

```ts
niivue.setScale(2); // zoom some
```

#### See

[live demo usage](https://niivue.com/demos/features/shiny.volumes.html)

---

### setSelectionBoxColor()

```ts
setSelectionBoxColor(color: number[]): void;
```

Defined in: [niivue/index.ts:4772](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4772)

set the selection box color. A selection box is drawn when you right click and drag to change image contrast

#### Parameters

| Parameter | Type       | Description                             |
| --------- | ---------- | --------------------------------------- |
| `color`   | `number`[] | an RGBA array. values range from 0 to 1 |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.setSelectionBoxColor([0, 1, 0, 0.5]); // set to transparent green
```

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### setShowAllOrientationMarkers()

```ts
setShowAllOrientationMarkers(showAllOrientationMarkers: boolean): void;
```

Defined in: [niivue/index.ts:3359](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3359)

Show or hide all four orientation labels (e.g., L/R, A/P, S/I) in 2D slice views

#### Parameters

| Parameter                   | Type      | Description                                              |
| --------------------------- | --------- | -------------------------------------------------------- |
| `showAllOrientationMarkers` | `boolean` | whether all four orientation markers should be displayed |

#### Returns

`void`

#### Example

```ts
niivue.setShowAllOrientationMarkers(true);
```

---

### setSliceMM()

```ts
setSliceMM(isSliceMM: boolean): void;
```

Defined in: [niivue/index.ts:3522](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3522)

control 2D slice view mode.

#### Parameters

| Parameter   | Type      | Description                                                                                                                                                        |
| ----------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `isSliceMM` | `boolean` | control whether 2D slices use world space (true) or voxel space (false). Beware that voxel space mode limits properties like panning, zooming and mesh visibility. |

#### Returns

`void`

#### Example

```ts
niivue.setSliceMM(true);
```

#### See

[live demo usage](https://niivue.com/demos/features/worldspace2.html)

---

### setSliceMosaicString()

```ts
setSliceMosaicString(str: string): void;
```

Defined in: [niivue/index.ts:3511](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3511)

Create a custom multi-slice mosaic (aka lightbox, montage) view.

#### Parameters

| Parameter | Type     | Description            |
| --------- | -------- | ---------------------- |
| `str`     | `string` | description of mosaic. |

#### Returns

`void`

#### Example

```ts
niivue.setSliceMosaicString("A 0 20 C 30 S 42");
```

#### See

[live demo usage](https://niivue.com/demos/features/mosaics.html)

---

### setSliceType()

```ts
setSliceType(st: SLICE_TYPE): this;
```

Defined in: [niivue/index.ts:4855](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4855)

set the slice type. This changes the view mode

#### Parameters

| Parameter | Type         | Description                                |
| --------- | ------------ | ------------------------------------------ |
| `st`      | `SLICE_TYPE` | sliceType is an enum of slice types to use |

#### Returns

`this`

#### Example

```ts
niivue = new Niivue();
niivue.setSliceType(Niivue.sliceTypeMultiplanar);
```

#### See

[live demo usage](https://niivue.com/demos/features/basic.multiplanar.html)

---

### setTouchEventConfig()

```ts
setTouchEventConfig(config: TouchEventConfig): void;
```

Defined in: [niivue/index.ts:11125](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11125)

Set custom touch event configuration for touch gesture mappings.

#### Parameters

| Parameter | Type                                                                  | Description                      |
| --------- | --------------------------------------------------------------------- | -------------------------------- |
| `config`  | [`TouchEventConfig`](../../nvdocument/interfaces/TouchEventConfig.md) | Touch event configuration object |

#### Returns

`void`

#### Example

```js
nv.setTouchEventConfig({
  singleTouch: DRAG_MODE.windowing,
  doubleTouch: DRAG_MODE.pan,
});
```

---

### setVolume()

```ts
setVolume(volume: NVImage, toIndex: number): void;
```

Defined in: [niivue/index.ts:4333](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4333)

set the index of a volume. This will change it's ordering and appearance if there are multiple volumes loaded.

#### Parameters

| Parameter | Type                                          | Default value | Description                                                              |
| --------- | --------------------------------------------- | ------------- | ------------------------------------------------------------------------ |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | `undefined`   | the volume to update                                                     |
| `toIndex` | `number`                                      | `0`           | the index to move the volume to. The default is the background (0 index) |

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.setVolume(someVolume, 1); // move it to the second position in the array of loaded volumes (0 is the first position)
```

---

### setVolumeRenderIllumination()

```ts
setVolumeRenderIllumination(gradientAmount: number): Promise<void>;
```

Defined in: [niivue/index.ts:4933](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4933)

set proportion of volume rendering influenced by selected matcap.

#### Parameters

| Parameter        | Type     | Default value | Description                                                                                                            |
| ---------------- | -------- | ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `gradientAmount` | `number` | `0.0`         | amount of matcap (NaN or 0..1), default 0 (matte, surface normal does not influence color). NaN renders the gradients. |

#### Returns

`Promise`\<`void`\>

#### Example

```ts
niivue.setVolumeRenderIllumination(0.6);
```

#### See

- [live demo usage](https://niivue.com/demos/features/shiny.volumes.html)
- [live demo usage](https://niivue.com/demos/features/gradient.order.html)

---

### ~~syncWith()~~

```ts
syncWith(otherNV: Niivue | Niivue[], syncOpts: object): void;
```

Defined in: [niivue/index.ts:1135](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1135)

Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to another. useful for using one canvas to drive another.

#### Parameters

| Parameter     | Type                                    | Description                                           |
| ------------- | --------------------------------------- | ----------------------------------------------------- |
| `otherNV`     | `Niivue` \| `Niivue`[]                  | the other Niivue instance that is the main controller |
| `syncOpts`    | \{ `2d`: `boolean`; `3d`: `boolean`; \} | -                                                     |
| `syncOpts.2d` | `boolean`                               | -                                                     |
| `syncOpts.3d` | `boolean`                               | -                                                     |

#### Returns

`void`

#### Example

```ts
niivue1 = new Niivue();
niivue2 = new Niivue();
niivue2.syncWith(niivue1);
```

#### Deprecated

use broadcastTo instead

#### See

[live demo usage](https://niivue.com/demos/features/sync.mesh.html)

---

### unwatchOptsChanges()

```ts
unwatchOptsChanges(): void;
```

Defined in: [niivue/index.ts:3588](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3588)

Stop watching for changes to configuration options.
This removes the current onOptsChange callback.

#### Returns

`void`

#### Example

```ts
niivue.unwatchOptsChanges();
```

#### See

[live demo usage](https://niivue.com/demos/)

---

### updateGLVolume()

```ts
updateGLVolume(): void;
```

Defined in: [niivue/index.ts:7993](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7993)

update the webGL 2.0 scene after making changes to the array of volumes. It's always good to call this method after altering one or more volumes manually (outside of Niivue setter methods)

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.updateGLVolume();
```

#### See

[live demo usage](https://niivue.com/demos/features/colormaps.html)

---

### useDicomLoader()

```ts
useDicomLoader(loader: DicomLoader): void;
```

Defined in: [niivue/index.ts:3063](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3063)

Set a custom loader for handling DICOM files.

#### Parameters

| Parameter | Type                                            |
| --------- | ----------------------------------------------- |
| `loader`  | [`DicomLoader`](../type-aliases/DicomLoader.md) |

#### Returns

`void`

---

### useLoader()

```ts
useLoader(
   loader: unknown,
   fileExt: string,
   toExt: string): void;
```

Defined in: [niivue/index.ts:3050](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3050)

Registers a custom external file loader for handling specific file types in Niivue.

This method allows you to define how certain file extensions are handled when loaded into Niivue.
The provided `loader` function should return an object containing an `ArrayBuffer` of the file's contents
and the file extension (used for inferring how Niivue should process the data).

Optionally, `positions` and `indices` can be returned to support loading mesh data (e.g. `.mz3` format).

#### Parameters

| Parameter | Type      | Description                                                                                                                                                                |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `loader`  | `unknown` | A function that accepts a `File` or `ArrayBuffer` and returns an object with `arrayBuffer` and `fileExt` properties. May also return `positions` and `indices` for meshes. |
| `fileExt` | `string`  | The original file extension (e.g. 'iwi.cbor') to associate with this loader.                                                                                               |
| `toExt`   | `string`  | The target file extension Niivue should treat the file as (e.g. 'nii' or 'mz3').                                                                                           |

#### Returns

`void`

#### Example

```ts
const myCustomLoader = async (file) => {
  const arrayBuffer = await file.arrayBuffer()
  return {
    arrayBuffer,
    fileExt: 'iwi.cbor',
    positions: new Float32Array(...),
    indices: new Uint32Array(...)
  }
}

nv.useLoader(myCustomLoader, 'iwi.cbor', 'nii')
```

---

### watchOptsChanges()

```ts
watchOptsChanges(callback: (propertyName: keyof NVConfigOptions, newValue:
  | string
  | number
  | boolean
  | number[]
  | Float32Array
  | MouseEventConfig
  | TouchEventConfig
  | number[]
  | [[number, number], [number, number]], oldValue:
  | string
  | number
  | boolean
  | number[]
  | Float32Array
  | MouseEventConfig
  | TouchEventConfig
  | number[]
  | [[number, number], [number, number]]) => void): void;
```

Defined in: [niivue/index.ts:3572](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3572)

Start watching for changes to configuration options.
This is a convenience method that sets up the onOptsChange callback.

#### Parameters

| Parameter  | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Description                              |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `callback` | (`propertyName`: keyof [`NVConfigOptions`](../../nvdocument/type-aliases/NVConfigOptions.md), `newValue`: \| `string` \| `number` \| `boolean` \| `number`[] \| `Float32Array` \| [`MouseEventConfig`](../../nvdocument/interfaces/MouseEventConfig.md) \| [`TouchEventConfig`](../../nvdocument/interfaces/TouchEventConfig.md) \| `number`[] \| \[\[`number`, `number`\], \[`number`, `number`\]\], `oldValue`: \| `string` \| `number` \| `boolean` \| `number`[] \| `Float32Array` \| [`MouseEventConfig`](../../nvdocument/interfaces/MouseEventConfig.md) \| [`TouchEventConfig`](../../nvdocument/interfaces/TouchEventConfig.md) \| `number`[] \| \[\[`number`, `number`\], \[`number`, `number`\]\]) => `void` | Function to call when any option changes |

#### Returns

`void`

#### Example

```ts
niivue.watchOptsChanges((propertyName, newValue, oldValue) => {
  console.log(`Option ${propertyName} changed from ${oldValue} to ${newValue}`);
});
```

#### See

[live demo usage](https://niivue.com/demos/)
