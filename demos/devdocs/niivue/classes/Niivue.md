# Class: Niivue

Defined in: [niivue/index.ts:352](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L352)

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

Defined in: [niivue/index.ts:841](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L841)

#### Parameters

| Parameter | Type                                                                               | Default value     | Description                                        |
| --------- | ---------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------- |
| `options` | `Partial`\<[`NVConfigOptions`](../../nvdocument/type-aliases/NVConfigOptions.md)\> | `DEFAULT_OPTIONS` | options object to set modifiable Niivue properties |

#### Returns

`Niivue`

## Properties

| Property                                                                       | Type                                                                                                                                                            | Default value            | Description                                                                                                                                                                                                                                                                                                         | Defined in                                                                                                 |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| <a id="_gl"></a> `_gl`                                                         | `WebGL2RenderingContext`                                                                                                                                        | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:365](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L365) |
| <a id="back"></a> `back`                                                       | [`NVImage`](../../nvimage/classes/NVImage.md)                                                                                                                   | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:492](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L492) |
| <a id="backgroundmasksoverlays"></a> `backgroundMasksOverlays`                 | `number`                                                                                                                                                        | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:438](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L438) |
| <a id="blurshader"></a> `blurShader`                                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:425](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L425) |
| <a id="bmpshader"></a> `bmpShader`                                             | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:413](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L413) |
| <a id="bmptexture"></a> `bmpTexture`                                           | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:414](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L414) |
| <a id="bmptexturewh"></a> `bmpTextureWH`                                       | `number`                                                                                                                                                        | `1.0`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:416](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L416) |
| <a id="canvas"></a> `canvas`                                                   | `HTMLCanvasElement`                                                                                                                                             | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:364](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L364) |
| <a id="circleshader"></a> `circleShader?`                                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:411](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L411) |
| <a id="clicktosegmentgrowingbitmap"></a> `clickToSegmentGrowingBitmap`         | `Uint8Array`                                                                                                                                                    | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:380](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L380) |
| <a id="clicktosegmentisgrowing"></a> `clickToSegmentIsGrowing`                 | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:379](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L379) |
| <a id="clicktosegmentxy"></a> `clickToSegmentXY`                               | `number`[]                                                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:381](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L381) |
| <a id="clip_plane_id"></a> `CLIP_PLANE_ID`                                     | `number`                                                                                                                                                        | `1`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:521](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L521) |
| <a id="colorbarheight"></a> `colorbarHeight`                                   | `number`                                                                                                                                                        | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:383](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L383) |
| <a id="colorbarshader"></a> `colorbarShader?`                                  | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:407](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L407) |
| <a id="colormaplists"></a> `colormapLists`                                     | `ColormapListEntry`[]                                                                                                                                           | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:369](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L369) |
| <a id="colormaptexture"></a> `colormapTexture`                                 | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:368](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L368) |
| <a id="crosshairs3d"></a> `crosshairs3D`                                       | `NiivueObject3D`                                                                                                                                                | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:431](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L431) |
| <a id="cuboidvertexbuffer"></a> `cuboidVertexBuffer?`                          | `WebGLBuffer`                                                                                                                                                   | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:510](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L510) |
| <a id="currentclipplaneindex"></a> `currentClipPlaneIndex`                     | `number`                                                                                                                                                        | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:517](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L517) |
| <a id="currentdrawundobitmap"></a> `currentDrawUndoBitmap`                     | `number`                                                                                                                                                        | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:836](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L836) |
| <a id="customlayout"></a> `customLayout`                                       | `object`[]                                                                                                                                                      | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:533](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L533) |
| <a id="deferredmeshes"></a> `deferredMeshes`                                   | [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md)[]                                                                                         | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:495](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L495) |
| <a id="deferredvolumes"></a> `deferredVolumes`                                 | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[]                                                                                    | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:494](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L494) |
| <a id="dicomloader"></a> `dicomLoader`                                         | [`DicomLoader`](../type-aliases/DicomLoader.md)                                                                                                                 | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:355](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L355) |
| <a id="distance_from_camera"></a> `DISTANCE_FROM_CAMERA`                       | `number`                                                                                                                                                        | `-0.54`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:523](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L523) |
| <a id="document"></a> `document`                                               | `NVDocument`                                                                                                                                                    | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:808](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L808) |
| <a id="dragmodes"></a> `dragModes`                                             | `object`                                                                                                                                                        | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:599](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L599) |
| `dragModes.callbackOnly`                                                       | `DRAG_MODE`                                                                                                                                                     | `DRAG_MODE.callbackOnly` | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:605](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L605) |
| `dragModes.contrast`                                                           | `DRAG_MODE`                                                                                                                                                     | `DRAG_MODE.contrast`     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:600](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L600) |
| `dragModes.measurement`                                                        | `DRAG_MODE`                                                                                                                                                     | `DRAG_MODE.measurement`  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:601](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L601) |
| `dragModes.none`                                                               | `DRAG_MODE`                                                                                                                                                     | `DRAG_MODE.none`         | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:602](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L602) |
| `dragModes.pan`                                                                | `DRAG_MODE`                                                                                                                                                     | `DRAG_MODE.pan`          | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:603](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L603) |
| `dragModes.slicer3D`                                                           | `DRAG_MODE`                                                                                                                                                     | `DRAG_MODE.slicer3D`     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:604](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L604) |
| <a id="drawfilloverwrites"></a> `drawFillOverwrites`                           | `boolean`                                                                                                                                                       | `true`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:386](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L386) |
| <a id="drawlut"></a> `drawLut`                                                 | [`LUT`](../../colortables/type-aliases/LUT.md)                                                                                                                  | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:377](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L377) |
| <a id="drawopacity"></a> `drawOpacity`                                         | `number`                                                                                                                                                        | `0.8`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:378](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L378) |
| <a id="drawpenaxcorsag"></a> `drawPenAxCorSag`                                 | `number`                                                                                                                                                        | `-1`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:385](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L385) |
| <a id="drawpenfillpts"></a> `drawPenFillPts`                                   | `number`[][]                                                                                                                                                    | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:387](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L387) |
| <a id="drawpenlocation"></a> `drawPenLocation`                                 | `number`[]                                                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:384](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L384) |
| <a id="drawtexture"></a> `drawTexture`                                         | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:375](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L375) |
| <a id="drawundobitmaps"></a> `drawUndoBitmaps`                                 | `Uint8Array`[]                                                                                                                                                  | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:376](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L376) |
| <a id="extentsmax"></a> `extentsMax?`                                          | `vec3`                                                                                                                                                          | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:443](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L443) |
| <a id="extentsmin"></a> `extentsMin?`                                          | `vec3`                                                                                                                                                          | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:442](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L442) |
| <a id="fibershader"></a> `fiberShader?`                                        | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:409](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L409) |
| <a id="fontshader"></a> `fontShader`                                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:408](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L408) |
| <a id="fonttexture"></a> `fontTexture`                                         | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:410](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L410) |
| <a id="furthestfrompivot"></a> `furthestFromPivot`                             | `number`                                                                                                                                                        | `10.0`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:515](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L515) |
| <a id="furthestvertexfromorigin"></a> `furthestVertexFromOrigin`               | `number`                                                                                                                                                        | `100`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:496](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L496) |
| <a id="genericvao"></a> `genericVAO`                                           | `WebGLVertexArrayObject`                                                                                                                                        | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:429](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L429) |
| <a id="gradienttexture"></a> `gradientTexture`                                 | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:371](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L371) |
| <a id="gradienttextureamount"></a> `gradientTextureAmount`                     | `number`                                                                                                                                                        | `0.0`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:372](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L372) |
| <a id="graph"></a> `graph`                                                     | `Graph`                                                                                                                                                         | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:524](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L524) |
| <a id="growcutshader"></a> `growCutShader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:417](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L417) |
| <a id="initialized"></a> `initialized`                                         | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:835](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L835) |
| <a id="isbusy"></a> `isBusy`                                                   | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:366](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L366) |
| <a id="lastcalled"></a> `lastCalled`                                           | `number`                                                                                                                                                        | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:518](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L518) |
| <a id="line3dshader"></a> `line3DShader?`                                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:399](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L399) |
| <a id="lineshader"></a> `lineShader?`                                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:398](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L398) |
| <a id="loaders"></a> `loaders`                                                 | `object`                                                                                                                                                        | `{}`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:353](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L353) |
| <a id="matcaptexture"></a> `matCapTexture`                                     | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:412](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L412) |
| <a id="mediaurlmap"></a> `mediaUrlMap`                                         | `Map`\< \| [`NVMesh`](../../nvmesh/classes/NVMesh.md) \| [`NVImage`](../../nvimage/classes/NVImage.md), `string`\>                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:834](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L834) |
| <a id="meshshaders"></a> `meshShaders`                                         | `object`[]                                                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:539](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L539) |
| <a id="mousepos"></a> `mousePos`                                               | `number`[]                                                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:499](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L499) |
| <a id="needsrefresh"></a> `needsRefresh`                                       | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:367](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L367) |
| <a id="onazimuthelevationchange"></a> `onAzimuthElevationChange`               | (`azimuth`: `number`, `elevation`: `number`) => `void`                                                                                                          | `undefined`              | callback function to run when the user changes the rotation of the 3D rendering **Example** `niivue.onAzimuthElevationChange = (azimuth, elevation) => { console.log('azimuth: ', azimuth) console.log('elevation: ', elevation) }`                                                                                 | [niivue/index.ts:783](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L783) |
| <a id="onclicktosegment"></a> `onClickToSegment`                               | (`data`: `object`) => `void`                                                                                                                                    | `undefined`              | callback function when clickToSegment is enabled and the user clicks on the image. data contains the volume of the segmented region in mm3 and mL **Example** `niivue.onClickToSegment = (data) => { console.log('clicked to segment') console.log('volume mm3: ', data.mm3) console.log('volume mL: ', data.mL) }` | [niivue/index.ts:664](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L664) |
| <a id="onclipplanechange"></a> `onClipPlaneChange`                             | (`clipPlane`: `number`[]) => `void`                                                                                                                             | `undefined`              | callback function to run when the user changes the clip plane **Example** `niivue.onClipPlaneChange = (clipPlane) => { console.log('clipPlane: ', clipPlane) }`                                                                                                                                                     | [niivue/index.ts:792](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L792) |
| <a id="oncolormapchange"></a> `onColormapChange`                               | () => `void`                                                                                                                                                    | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:707](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L707) |
| <a id="oncustommeshshaderadded"></a> `onCustomMeshShaderAdded`                 | (`fragmentShaderText`: `string`, `name`: `string`) => `void`                                                                                                    | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:793](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L793) |
| <a id="ondebug"></a> `onDebug`                                                 | () => `void`                                                                                                                                                    | `undefined`              | callback function to run when niivue reports a debug message **Example** `niivue.onDebug = (debug) => { console.log('debug: ', debug) }`                                                                                                                                                                            | [niivue/index.ts:734](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L734) |
| <a id="ondicomloaderfinishedwithimages"></a> `onDicomLoaderFinishedWithImages` | (`files`: \| [`NVImage`](../../nvimage/classes/NVImage.md)[] \| [`NVMesh`](../../nvmesh/classes/NVMesh.md)[]) => `void`                                         | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:797](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L797) |
| <a id="ondocumentloaded"></a> `onDocumentLoaded`                               | (`document`: `NVDocument`) => `void`                                                                                                                            | `undefined`              | callback function to run when the user loads a new NiiVue document **Example** `niivue.onDocumentLoaded = (document) => { console.log('document: ', document) }`                                                                                                                                                    | [niivue/index.ts:806](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L806) |
| <a id="ondragrelease"></a> `onDragRelease`                                     | (`params`: [`DragReleaseParams`](../../types/type-aliases/DragReleaseParams.md)) => `void`                                                                      | `undefined`              | callback function to run when the right mouse button is released after dragging **Example** `niivue.onDragRelease = () => { console.log('drag ended') }`                                                                                                                                                            | [niivue/index.ts:623](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L623) |
| <a id="onerror"></a> `onError`                                                 | () => `void`                                                                                                                                                    | `undefined`              | callback function to run when niivue reports an error **Example** `niivue.onError = (error) => { console.log('error: ', error) }`                                                                                                                                                                                   | [niivue/index.ts:704](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L704) |
| <a id="onframechange"></a> `onFrameChange`                                     | (`volume`: [`NVImage`](../../nvimage/classes/NVImage.md), `index`: `number`) => `void`                                                                          | `undefined`              | callback function to run when the user changes the volume when a 4D image is loaded **Example** `niivue.onFrameChange = (volume, frameNumber) => { console.log('frame changed') console.log('volume: ', volume) console.log('frameNumber: ', frameNumber) }`                                                        | [niivue/index.ts:695](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L695) |
| <a id="onimageloaded"></a> `onImageLoaded`                                     | (`volume`: [`NVImage`](../../nvimage/classes/NVImage.md)) => `void`                                                                                             | `undefined`              | callback function to run when a new volume is loaded **Example** `niivue.onImageLoaded = (volume) => { console.log('volume loaded') console.log('volume: ', volume) }`                                                                                                                                              | [niivue/index.ts:674](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L674) |
| <a id="oninfo"></a> `onInfo`                                                   | () => `void`                                                                                                                                                    | `undefined`              | callback function to run when niivue reports detailed info **Example** `niivue.onInfo = (info) => { console.log('info: ', info) }`                                                                                                                                                                                  | [niivue/index.ts:716](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L716) |
| <a id="onintensitychange"></a> `onIntensityChange`                             | (`volume`: [`NVImage`](../../nvimage/classes/NVImage.md)) => `void`                                                                                             | `undefined`              | callback function to run when the user changes the intensity range with the selection box action (right click) **Example** `niivue.onIntensityChange = (volume) => { console.log('intensity changed') console.log('volume: ', volume) }`                                                                            | [niivue/index.ts:653](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L653) |
| <a id="onlocationchange"></a> `onLocationChange`                               | (`location`: `unknown`) => `void`                                                                                                                               | `undefined`              | callback function to run when the crosshair location changes **Example** `niivue.onLocationChange = (data) => { console.log('location changed') console.log('mm: ', data.mm) console.log('vox: ', data.vox) console.log('frac: ', data.frac) console.log('values: ', data.values) }`                                | [niivue/index.ts:644](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L644) |
| <a id="onmeshadded"></a> `onMeshAdded`                                         | () => `void`                                                                                                                                                    | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:769](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L769) |
| <a id="onmeshaddedfromurl"></a> `onMeshAddedFromUrl`                           | (`meshOptions`: [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md), `mesh`: [`NVMesh`](../../nvmesh/classes/NVMesh.md)) => `void`            | `undefined`              | callback function to run when a mesh is added from a url **Example** `niivue.onMeshAddedFromUrl = (meshOptions, mesh) => { console.log('mesh added from url') console.log('meshOptions: ', meshOptions) console.log('mesh: ', mesh) }`                                                                              | [niivue/index.ts:766](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L766) |
| <a id="onmeshloaded"></a> `onMeshLoaded`                                       | (`mesh`: [`NVMesh`](../../nvmesh/classes/NVMesh.md)) => `void`                                                                                                  | `undefined`              | callback function to run when a new mesh is loaded **Example** `niivue.onMeshLoaded = (mesh) => { console.log('mesh loaded') console.log('mesh: ', mesh) }`                                                                                                                                                         | [niivue/index.ts:684](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L684) |
| <a id="onmeshpropertychanged"></a> `onMeshPropertyChanged`                     | (`meshIndex`: `number`, `key`: `string`, `val`: `unknown`) => `void`                                                                                            | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:795](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L795) |
| <a id="onmeshshaderchanged"></a> `onMeshShaderChanged`                         | (`meshIndex`: `number`, `shaderIndex`: `number`) => `void`                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:794](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L794) |
| <a id="onmeshwithurlremoved"></a> `onMeshWithUrlRemoved`                       | (`url`: `string`) => `void`                                                                                                                                     | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:770](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L770) |
| <a id="onmouseup"></a> `onMouseUp`                                             | (`data`: `Partial`\<`UIData`\>) => `void`                                                                                                                       | `undefined`              | callback function to run when the left mouse button is released **Example** `niivue.onMouseUp = () => { console.log('mouse up') }`                                                                                                                                                                                  | [niivue/index.ts:632](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L632) |
| <a id="onvolumeaddedfromurl"></a> `onVolumeAddedFromUrl`                       | (`imageOptions`: [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md), `volume`: [`NVImage`](../../nvimage/classes/NVImage.md)) => `void` | `undefined`              | callback function to run when a volume is added from a url **Example** `niivue.onVolumeAddedFromUrl = (imageOptions, volume) => { console.log('volume added from url') console.log('imageOptions: ', imageOptions) console.log('volume: ', volume) }`                                                               | [niivue/index.ts:745](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L745) |
| <a id="onvolumeupdated"></a> `onVolumeUpdated`                                 | () => `void`                                                                                                                                                    | `undefined`              | callback function to run when updateGLVolume is called (most users will not need to use **Example** `niivue.onVolumeUpdated = () => { console.log('volume updated') }`                                                                                                                                              | [niivue/index.ts:755](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L755) |
| <a id="onvolumewithurlremoved"></a> `onVolumeWithUrlRemoved`                   | (`url`: `string`) => `void`                                                                                                                                     | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:746](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L746) |
| <a id="onwarn"></a> `onWarn`                                                   | () => `void`                                                                                                                                                    | `undefined`              | callback function to run when niivue reports a warning **Example** `niivue.onWarn = (warn) => { console.log('warn: ', warn) }`                                                                                                                                                                                      | [niivue/index.ts:725](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L725) |
| <a id="onzoom3dchange"></a> `onZoom3DChange`                                   | (`zoom`: `number`) => `void`                                                                                                                                    | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:773](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L773) |
| <a id="orientcubeshader"></a> `orientCubeShader?`                              | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:393](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L393) |
| <a id="orientcubeshadervao"></a> `orientCubeShaderVAO`                         | `WebGLVertexArrayObject`                                                                                                                                        | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:394](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L394) |
| <a id="orientshaderatlasi"></a> `orientShaderAtlasI`                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:419](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L419) |
| <a id="orientshaderatlasu"></a> `orientShaderAtlasU`                           | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:418](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L418) |
| <a id="orientshaderf"></a> `orientShaderF`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:422](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L422) |
| <a id="orientshaderi"></a> `orientShaderI`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:421](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L421) |
| <a id="orientshaderrgbu"></a> `orientShaderRGBU`                               | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:423](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L423) |
| <a id="orientshaderu"></a> `orientShaderU`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:420](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L420) |
| <a id="othernv"></a> `otherNV`                                                 | `Niivue`[]                                                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:512](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L512) |
| <a id="overlayalphashader"></a> `overlayAlphaShader`                           | `number`                                                                                                                                                        | `1`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:440](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L440) |
| <a id="overlayoutlinewidth"></a> `overlayOutlineWidth`                         | `number`                                                                                                                                                        | `0`                      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:439](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L439) |
| <a id="overlays"></a> `overlays`                                               | [`NVImage`](../../nvimage/classes/NVImage.md)[]                                                                                                                 | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:493](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L493) |
| <a id="overlaytexture"></a> `overlayTexture`                                   | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:388](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L388) |
| <a id="overlaytextureid"></a> `overlayTextureID`                               | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:389](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L389) |
| <a id="passthroughshader"></a> `passThroughShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:400](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L400) |
| <a id="pickingimageshader"></a> `pickingImageShader?`                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:406](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L406) |
| <a id="pickingmeshshader"></a> `pickingMeshShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:405](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L405) |
| <a id="pivot3d"></a> `pivot3D`                                                 | `number`[]                                                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:514](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L514) |
| <a id="position"></a> `position?`                                              | `vec3`                                                                                                                                                          | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:441](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L441) |
| <a id="readyforsync"></a> `readyForSync`                                       | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:461](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L461) |
| <a id="rectoutlineshader"></a> `rectOutlineShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:396](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L396) |
| <a id="rectshader"></a> `rectShader?`                                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:395](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L395) |
| <a id="renderdrawambientocclusion"></a> `renderDrawAmbientOcclusion`           | `number`                                                                                                                                                        | `0.4`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:382](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L382) |
| <a id="rendergradientshader"></a> `renderGradientShader?`                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:401](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L401) |
| <a id="rendergradientvalues"></a> `renderGradientValues`                       | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:374](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L374) |
| <a id="rendergradientvaluesshader"></a> `renderGradientValuesShader?`          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:402](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L402) |
| <a id="rendershader"></a> `renderShader?`                                      | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:397](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L397) |
| <a id="rendersliceshader"></a> `renderSliceShader?`                            | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:403](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L403) |
| <a id="rendervolumeshader"></a> `renderVolumeShader?`                          | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:404](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L404) |
| <a id="screenslices"></a> `screenSlices`                                       | `object`[]                                                                                                                                                      | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:500](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L500) |
| <a id="selectedobjectid"></a> `selectedObjectId`                               | `number`                                                                                                                                                        | `-1`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:520](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L520) |
| <a id="slice2dshader"></a> `slice2DShader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:391](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L391) |
| <a id="slicemmshader"></a> `sliceMMShader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:390](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L390) |
| <a id="slicetypeaxial"></a> `sliceTypeAxial`                                   | `SLICE_TYPE`                                                                                                                                                    | `SLICE_TYPE.AXIAL`       | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:609](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L609) |
| <a id="slicetypecoronal"></a> `sliceTypeCoronal`                               | `SLICE_TYPE`                                                                                                                                                    | `SLICE_TYPE.CORONAL`     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:610](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L610) |
| <a id="slicetypemultiplanar"></a> `sliceTypeMultiplanar`                       | `SLICE_TYPE`                                                                                                                                                    | `SLICE_TYPE.MULTIPLANAR` | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:612](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L612) |
| <a id="slicetyperender"></a> `sliceTypeRender`                                 | `SLICE_TYPE`                                                                                                                                                    | `SLICE_TYPE.RENDER`      | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:613](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L613) |
| <a id="slicetypesagittal"></a> `sliceTypeSagittal`                             | `SLICE_TYPE`                                                                                                                                                    | `SLICE_TYPE.SAGITTAL`    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:611](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L611) |
| <a id="slicev1shader"></a> `sliceV1Shader?`                                    | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:392](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L392) |
| <a id="sobelblurshader"></a> `sobelBlurShader`                                 | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:426](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L426) |
| <a id="sobelfirstordershader"></a> `sobelFirstOrderShader`                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:427](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L427) |
| <a id="sobelsecondordershader"></a> `sobelSecondOrderShader`                   | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:428](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L428) |
| <a id="surfaceshader"></a> `surfaceShader`                                     | [`Shader`](../../shader/classes/Shader.md)                                                                                                                      | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:424](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L424) |
| <a id="syncopts"></a> `syncOpts`                                               | [`SyncOpts`](../../types/type-aliases/SyncOpts.md)                                                                                                              | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:449](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L449) |
| <a id="thumbnailvisible"></a> `thumbnailVisible`                               | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:415](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L415) |
| <a id="uidata"></a> `uiData`                                                   | `UIData`                                                                                                                                                        | `undefined`              | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:464](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L464) |
| <a id="unusedvao"></a> `unusedVAO`                                             | `any`                                                                                                                                                           | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:430](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L430) |
| <a id="usecustomgradienttexture"></a> `useCustomGradientTexture`               | `boolean`                                                                                                                                                       | `false`                  | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:373](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L373) |
| <a id="volscale"></a> `volScale`                                               | `number`[]                                                                                                                                                      | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:497](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L497) |
| <a id="volume_id"></a> `VOLUME_ID`                                             | `number`                                                                                                                                                        | `254`                    | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:522](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L522) |
| <a id="volumeobject3d"></a> `volumeObject3D`                                   | `NiivueObject3D`                                                                                                                                                | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:513](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L513) |
| <a id="volumetexture"></a> `volumeTexture`                                     | `WebGLTexture`                                                                                                                                                  | `null`                   | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:370](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L370) |
| <a id="vox"></a> `vox`                                                         | `number`[]                                                                                                                                                      | `[]`                     | -                                                                                                                                                                                                                                                                                                                   | [niivue/index.ts:498](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L498) |

## Accessors

### drawBitmap

#### Get Signature

```ts
get drawBitmap(): Uint8Array;
```

Defined in: [niivue/index.ts:944](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L944)

##### Returns

`Uint8Array`

#### Set Signature

```ts
set drawBitmap(drawBitmap: Uint8Array): void;
```

Defined in: [niivue/index.ts:948](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L948)

##### Parameters

| Parameter    | Type         |
| ------------ | ------------ |
| `drawBitmap` | `Uint8Array` |

##### Returns

`void`

---

### gl

#### Get Signature

```ts
get gl(): WebGL2RenderingContext;
```

Defined in: [niivue/index.ts:13295](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L13295)

##### Returns

`WebGL2RenderingContext`

#### Set Signature

```ts
set gl(gl: WebGL2RenderingContext): void;
```

Defined in: [niivue/index.ts:13302](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L13302)

##### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

##### Returns

`void`

---

### isAlphaClipDark

#### Get Signature

```ts
get isAlphaClipDark(): boolean;
```

Defined in: [niivue/index.ts:826](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L826)

##### Returns

`boolean`

#### Set Signature

```ts
set isAlphaClipDark(newVal: boolean): void;
```

Defined in: [niivue/index.ts:830](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L830)

##### Parameters

| Parameter | Type      |
| --------- | --------- |
| `newVal`  | `boolean` |

##### Returns

`void`

---

### meshes

#### Get Signature

```ts
get meshes(): NVMesh[];
```

Defined in: [niivue/index.ts:936](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L936)

##### Returns

[`NVMesh`](../../nvmesh/classes/NVMesh.md)[]

#### Set Signature

```ts
set meshes(meshes: NVMesh[]): void;
```

Defined in: [niivue/index.ts:940](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L940)

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

Defined in: [niivue/index.ts:814](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L814)

##### Returns

[`NVConfigOptions`](../../nvdocument/type-aliases/NVConfigOptions.md)

---

### scene

#### Get Signature

```ts
get scene(): Scene;
```

Defined in: [niivue/index.ts:810](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L810)

##### Returns

[`Scene`](../../nvdocument/type-aliases/Scene.md)

---

### sliceMosaicString

#### Get Signature

```ts
get sliceMosaicString(): string;
```

Defined in: [niivue/index.ts:818](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L818)

##### Returns

`string`

#### Set Signature

```ts
set sliceMosaicString(newSliceMosaicString: string): void;
```

Defined in: [niivue/index.ts:822](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L822)

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

Defined in: [niivue/index.ts:952](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L952)

##### Returns

`number`

#### Set Signature

```ts
set volScaleMultiplier(scale: number): void;
```

Defined in: [niivue/index.ts:956](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L956)

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

Defined in: [niivue/index.ts:928](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L928)

##### Returns

[`NVImage`](../../nvimage/classes/NVImage.md)[]

#### Set Signature

```ts
set volumes(volumes: NVImage[]): void;
```

Defined in: [niivue/index.ts:932](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L932)

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

Defined in: [niivue/index.ts:7983](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7983)

create a new colormap

#### Parameters

| Parameter | Type                                                     | Description                                               |
| --------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `key`     | `string`                                                 | name of new colormap                                      |
| `cmap`    | [`ColorMap`](../../colortables/type-aliases/ColorMap.md) | colormap properties (Red, Green, Blue, Alpha and Indices) |

#### Returns

`void`

#### See

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

---

### addColormapList()

```ts
addColormapList(
   nm: string,
   mn: number,
   mx: number,
   alpha: boolean,
   neg: boolean,
   vis: boolean,
   inv: boolean): void;
```

Defined in: [niivue/index.ts:8867](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8867)

#### Parameters

| Parameter | Type      | Default value |
| --------- | --------- | ------------- |
| `nm`      | `string`  | `''`          |
| `mn`      | `number`  | `NaN`         |
| `mx`      | `number`  | `NaN`         |
| `alpha`   | `boolean` | `false`       |
| `neg`     | `boolean` | `false`       |
| `vis`     | `boolean` | `true`        |
| `inv`     | `boolean` | `false`       |

#### Returns

`void`

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

Defined in: [niivue/index.ts:11454](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11454)

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

[live demo usage](https://niivue.github.io/niivue/features/labels.html)

---

### addMesh()

```ts
addMesh(mesh: NVMesh): void;
```

Defined in: [niivue/index.ts:3057](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3057)

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

[live demo usage](https://niivue.github.io/niivue/features/document.3d.html)

---

### addMeshesFromUrl()

```ts
addMeshesFromUrl(meshOptions: LoadFromUrlParams[]): Promise<NVMesh[]>;
```

Defined in: [niivue/index.ts:4830](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4830)

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

Defined in: [niivue/index.ts:4809](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4809)

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

Defined in: [niivue/index.ts:3040](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3040)

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

[live demo usage](https://niivue.github.io/niivue/features/document.3d.html)

---

### addVolumeFromUrl()

```ts
addVolumeFromUrl(imageOptions: ImageFromUrlOptions): Promise<NVImage>;
```

Defined in: [niivue/index.ts:2301](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2301)

Add an image and notify subscribers

#### Parameters

| Parameter      | Type                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `imageOptions` | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md) |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

#### See

[live demo usage](https://niivue.github.io/niivue/features/document.3d.html)

---

### addVolumesFromUrl()

```ts
addVolumesFromUrl(imageOptionsArray: ImageFromUrlOptions[]): Promise<NVImage[]>;
```

Defined in: [niivue/index.ts:2313](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2313)

#### Parameters

| Parameter           | Type                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `imageOptionsArray` | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[] |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)[]\>

---

### arrayEquals()

```ts
arrayEquals(a: unknown[], b: unknown[]): boolean;
```

Defined in: [niivue/index.ts:1246](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1246)

Not documented publicly for now
test if two arrays have equal values for each element

#### Parameters

| Parameter | Type        | Description      |
| --------- | ----------- | ---------------- |
| `a`       | `unknown`[] | the first array  |
| `b`       | `unknown`[] | the second array |

#### Returns

`boolean`

#### Example

```ts
Niivue.arrayEquals(a, b)

TODO this should maybe just use array-equal from NPM
```

---

### attachTo()

```ts
attachTo(id: string, isAntiAlias: any): Promise<Niivue>;
```

Defined in: [niivue/index.ts:1004](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1004)

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

[live demo usage](https://niivue.github.io/niivue/features/basic.multiplanar.html)

---

### attachToCanvas()

```ts
attachToCanvas(canvas: HTMLCanvasElement, isAntiAlias: boolean): Promise<Niivue>;
```

Defined in: [niivue/index.ts:1017](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1017)

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

---

### binarize()

```ts
binarize(volume: NVImage): void;
```

Defined in: [niivue/index.ts:3233](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3233)

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) |

#### Returns

`void`

---

### broadcastTo()

```ts
broadcastTo(otherNV: Niivue | Niivue[], syncOpts: object): void;
```

Defined in: [niivue/index.ts:1110](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1110)

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

[live demo usage](https://niivue.github.io/niivue/features/sync.mesh.html)

---

### bwlabel()

```ts
bwlabel(
   img: Uint32Array,
   dim: Uint32Array,
   conn: number,
   binarize: boolean,
   onlyLargestClusterPerClass: boolean): [number, Uint32Array];
```

Defined in: [niivue/index.ts:8254](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8254)

#### Parameters

| Parameter                    | Type          | Default value |
| ---------------------------- | ------------- | ------------- |
| `img`                        | `Uint32Array` | `undefined`   |
| `dim`                        | `Uint32Array` | `undefined`   |
| `conn`                       | `number`      | `26`          |
| `binarize`                   | `boolean`     | `false`       |
| `onlyLargestClusterPerClass` | `boolean`     | `false`       |

#### Returns

\[`number`, `Uint32Array`\]

---

### calculateMinMaxVoxIdx()

```ts
calculateMinMaxVoxIdx(array: number[]): number[];
```

Defined in: [niivue/index.ts:1487](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1487)

calculate the the min and max voxel indices from an array of two values (used in selecting intensities with the selection box)

#### Parameters

| Parameter | Type       | Description            |
| --------- | ---------- | ---------------------- |
| `array`   | `number`[] | an array of two values |

#### Returns

`number`[]

an array of two values representing the min and max voxel indices

---

### calculateModelMatrix()

```ts
calculateModelMatrix(azimuth: number, elevation: number): mat4;
```

Defined in: [niivue/index.ts:10777](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10777)

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `azimuth`   | `number` |
| `elevation` | `number` |

#### Returns

`mat4`

---

### calculateMvpMatrix()

```ts
calculateMvpMatrix(
   _unused: unknown,
   leftTopWidthHeight: number[],
   azimuth: number,
   elevation: number): mat4[];
```

Defined in: [niivue/index.ts:10728](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10728)

#### Parameters

| Parameter            | Type       |
| -------------------- | ---------- |
| `_unused`            | `unknown`  |
| `leftTopWidthHeight` | `number`[] |
| `azimuth`            | `number`   |
| `elevation`          | `number`   |

#### Returns

`mat4`[]

---

### calculateMvpMatrix2D()

```ts
calculateMvpMatrix2D(
   leftTopWidthHeight: number[],
   mn: vec3,
   mx: vec3,
   clipTolerance: number,
   clipDepth: number,
   azimuth: number,
   elevation: number,
   isRadiolgical: boolean): MvpMatrix2D;
```

Defined in: [niivue/index.ts:10230](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10230)

#### Parameters

| Parameter            | Type       | Default value |
| -------------------- | ---------- | ------------- |
| `leftTopWidthHeight` | `number`[] | `undefined`   |
| `mn`                 | `vec3`     | `undefined`   |
| `mx`                 | `vec3`     | `undefined`   |
| `clipTolerance`      | `number`   | `Infinity`    |
| `clipDepth`          | `number`   | `0`           |
| `azimuth`            | `number`   | `0`           |
| `elevation`          | `number`   | `0`           |
| `isRadiolgical`      | `boolean`  | `undefined`   |

#### Returns

`MvpMatrix2D`

---

### calculateNewRange()

```ts
calculateNewRange(__namedParameters: object): void;
```

Defined in: [niivue/index.ts:1496](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1496)

#### Parameters

| Parameter                   | Type                       |
| --------------------------- | -------------------------- |
| `__namedParameters`         | \{ `volIdx?`: `number`; \} |
| `__namedParameters.volIdx?` | `number`                   |

#### Returns

`void`

---

### calculateRayDirection()

```ts
calculateRayDirection(azimuth: number, elevation: number): vec3;
```

Defined in: [niivue/index.ts:10797](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10797)

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `azimuth`   | `number` |
| `elevation` | `number` |

#### Returns

`vec3`

---

### calculateScreenPoint()

```ts
calculateScreenPoint(
   point: [number, number, number],
   mvpMatrix: mat4,
   leftTopWidthHeight: number[]): vec4;
```

Defined in: [niivue/index.ts:11478](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11478)

#### Parameters

| Parameter            | Type                             |
| -------------------- | -------------------------------- |
| `point`              | \[`number`, `number`, `number`\] |
| `mvpMatrix`          | `mat4`                           |
| `leftTopWidthHeight` | `number`[]                       |

#### Returns

`vec4`

---

### calculateWidthHeight()

```ts
calculateWidthHeight(
   sliceType: number,
   volScale: number[],
   containerWidth: number,
   containerHeight: number): [number, number];
```

Defined in: [niivue/index.ts:12763](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12763)

#### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `sliceType`       | `number`   |
| `volScale`        | `number`[] |
| `containerWidth`  | `number`   |
| `containerHeight` | `number`   |

#### Returns

\[`number`, `number`\]

---

### canvasPos2frac()

```ts
canvasPos2frac(canvasPos: number[]): vec3;
```

Defined in: [niivue/index.ts:12224](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12224)

#### Parameters

| Parameter   | Type       |
| ----------- | ---------- |
| `canvasPos` | `number`[] |

#### Returns

`vec3`

---

### check_previous_slice()

```ts
check_previous_slice(
   bw: Uint32Array,
   il: Uint32Array,
   r: number,
   c: number,
   sl: number,
   dim: Uint32Array,
   conn: number,
   tt: Uint32Array): number;
```

Defined in: [niivue/index.ts:8009](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8009)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `bw`      | `Uint32Array` |
| `il`      | `Uint32Array` |
| `r`       | `number`      |
| `c`       | `number`      |
| `sl`      | `number`      |
| `dim`     | `Uint32Array` |
| `conn`    | `number`      |
| `tt`      | `Uint32Array` |

#### Returns

`number`

---

### checkMultitouch()

```ts
checkMultitouch(e: TouchEvent): void;
```

Defined in: [niivue/index.ts:1654](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1654)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `TouchEvent` |

#### Returns

`void`

---

### cleanup()

```ts
cleanup(): void;
```

Defined in: [niivue/index.ts:879](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L879)

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

### clearCustomLayout()

```ts
clearCustomLayout(): void;
```

Defined in: [niivue/index.ts:2906](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2906)

Clear custom layout and rely on built-in layouts

#### Returns

`void`

---

### cloneVolume()

```ts
cloneVolume(index: number): NVImage;
```

Defined in: [niivue/index.ts:4341](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4341)

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

Defined in: [niivue/index.ts:6012](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6012)

close drawing: make sure you have saved any changes before calling this!

#### Returns

`void`

#### Example

```ts
niivue.closeDrawing();
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### colormap()

```ts
colormap(lutName: string, isInvert: boolean): Uint8ClampedArray;
```

Defined in: [niivue/index.ts:8839](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8839)

#### Parameters

| Parameter  | Type      | Default value |
| ---------- | --------- | ------------- |
| `lutName`  | `string`  | `''`          |
| `isInvert` | `boolean` | `false`       |

#### Returns

`Uint8ClampedArray`

---

### colormapFromKey()

```ts
colormapFromKey(name: string): ColorMap;
```

Defined in: [niivue/index.ts:8834](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8834)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

#### Returns

[`ColorMap`](../../colortables/type-aliases/ColorMap.md)

---

### colormaps()

```ts
colormaps(): string[];
```

Defined in: [niivue/index.ts:7973](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7973)

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

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

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

Defined in: [niivue/index.ts:8555](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8555)

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

[live demo usage](https://niivue.github.io/niivue/features/torso.html)

---

### conformVox2Vox()

```ts
conformVox2Vox(
   inDims: number[],
   inAffine: number[],
   outDim: number,
   outMM: number,
   toRAS: boolean): [mat4, mat4, mat4];
```

Defined in: [niivue/index.ts:8458](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8458)

#### Parameters

| Parameter  | Type       | Default value |
| ---------- | ---------- | ------------- |
| `inDims`   | `number`[] | `undefined`   |
| `inAffine` | `number`[] | `undefined`   |
| `outDim`   | `number`   | `256`         |
| `outMM`    | `number`   | `1`           |
| `toRAS`    | `boolean`  | `false`       |

#### Returns

\[`mat4`, `mat4`, `mat4`\]

---

### createColormapTexture()

```ts
createColormapTexture(
   texture: WebGLTexture,
   nRow: number,
   nCol: number): WebGLTexture;
```

Defined in: [niivue/index.ts:8846](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8846)

#### Parameters

| Parameter | Type           | Default value |
| --------- | -------------- | ------------- |
| `texture` | `WebGLTexture` | `null`        |
| `nRow`    | `number`       | `0`           |
| `nCol`    | `number`       | `256`         |

#### Returns

`WebGLTexture`

---

### createConnectedLabelImage()

```ts
createConnectedLabelImage(
   id: string,
   conn: number,
   binarize: boolean,
onlyLargestClusterPerClass: boolean): Promise<NVImage>;
```

Defined in: [niivue/index.ts:8294](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8294)

#### Parameters

| Parameter                    | Type      | Default value |
| ---------------------------- | --------- | ------------- |
| `id`                         | `string`  | `undefined`   |
| `conn`                       | `number`  | `26`          |
| `binarize`                   | `boolean` | `false`       |
| `onlyLargestClusterPerClass` | `boolean` | `false`       |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

---

### createCustomMeshShader()

```ts
createCustomMeshShader(fragmentShaderText: string, name: string): object;
```

Defined in: [niivue/index.ts:6542](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6542)

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
| `Frag`   | `string`                                   | [niivue/index.ts:6546](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6546) |
| `Name`   | `string`                                   | [niivue/index.ts:6546](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6546) |
| `shader` | [`Shader`](../../shader/classes/Shader.md) | [niivue/index.ts:6546](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6546) |

---

### createEmptyDrawing()

```ts
createEmptyDrawing(): void;
```

Defined in: [niivue/index.ts:5018](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5018)

generate a blank canvas for the pen tool

#### Returns

`void`

#### Example

```ts
niivue.createEmptyDrawing();
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/cactus.html)

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

Defined in: [niivue/index.ts:8518](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8518)

#### Parameters

| Parameter      | Type                                                       | Default value          |
| -------------- | ---------------------------------------------------------- | ---------------------- |
| `dims`         | `number`[]                                                 | `...`                  |
| `pixDims`      | `number`[]                                                 | `...`                  |
| `affine`       | `number`[]                                                 | `...`                  |
| `datatypeCode` | [`NiiDataType`](../../nvimage/enumerations/NiiDataType.md) | `NiiDataType.DT_UINT8` |
| `img`          | `Uint8Array`                                               | `...`                  |

#### Returns

`Promise`\<`Uint8Array`\>

---

### createOnLocationChange()

```ts
createOnLocationChange(axCorSag: number): void;
```

Defined in: [niivue/index.ts:11349](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11349)

#### Parameters

| Parameter  | Type     | Default value |
| ---------- | -------- | ------------- |
| `axCorSag` | `number` | `NaN`         |

#### Returns

`void`

---

### decimateHierarchicalMesh()

```ts
decimateHierarchicalMesh(mesh: number, order: number): boolean;
```

Defined in: [niivue/index.ts:3644](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3644)

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

[live demo usage](https://niivue.github.io/niivue/features/meshes.html)

---

### deleteThumbnail()

```ts
deleteThumbnail(): void;
```

Defined in: [niivue/index.ts:9061](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9061)

#### Returns

`void`

---

### depthPicker()

```ts
depthPicker(leftTopWidthHeight: number[], mvpMatrix: mat4): void;
```

Defined in: [niivue/index.ts:11197](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11197)

#### Parameters

| Parameter            | Type       |
| -------------------- | ---------- |
| `leftTopWidthHeight` | `number`[] |
| `mvpMatrix`          | `mat4`     |

#### Returns

`void`

---

### detectPartialllyLoaded4D()

```ts
detectPartialllyLoaded4D(): boolean;
```

Defined in: [niivue/index.ts:10905](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10905)

#### Returns

`boolean`

---

### do_initial_labelling()

```ts
do_initial_labelling(
   bw: Uint32Array,
   dim: Uint32Array,
   conn: number): [number, Uint32Array, Uint32Array];
```

Defined in: [niivue/index.ts:8093](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8093)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `bw`      | `Uint32Array` |
| `dim`     | `Uint32Array` |
| `conn`    | `number`      |

#### Returns

\[`number`, `Uint32Array`, `Uint32Array`\]

---

### doClickToSegment()

```ts
doClickToSegment(options: object): void;
```

Defined in: [niivue/index.ts:9110](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9110)

#### Parameters

| Parameter           | Type                                                       |
| ------------------- | ---------------------------------------------------------- |
| `options`           | \{ `tileIndex`: `number`; `x`: `number`; `y`: `number`; \} |
| `options.tileIndex` | `number`                                                   |
| `options.x`         | `number`                                                   |
| `options.y`         | `number`                                                   |

#### Returns

`void`

---

### doSync2d()

```ts
doSync2d(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1126](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1126)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSync3d()

```ts
doSync3d(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1119](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1119)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSyncCalMax()

```ts
doSyncCalMax(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1159](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1159)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSyncCalMin()

```ts
doSyncCalMin(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1150](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1150)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSyncClipPlane()

```ts
doSyncClipPlane(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1172](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1172)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSyncCrosshair()

```ts
doSyncCrosshair(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1145](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1145)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSyncGamma()

```ts
doSyncGamma(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1132](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1132)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSyncSliceType()

```ts
doSyncSliceType(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1168](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1168)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### doSyncZoomPan()

```ts
doSyncZoomPan(otherNV: Niivue): void;
```

Defined in: [niivue/index.ts:1141](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1141)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `otherNV` | `Niivue` |

#### Returns

`void`

---

### dragEnterListener()

```ts
dragEnterListener(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:2266](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2266)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### dragForCenterButton()

```ts
dragForCenterButton(startXYendXY: number[]): void;
```

Defined in: [niivue/index.ts:9504](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9504)

#### Parameters

| Parameter      | Type       |
| -------------- | ---------- |
| `startXYendXY` | `number`[] |

#### Returns

`void`

---

### dragForPanZoom()

```ts
dragForPanZoom(startXYendXY: number[]): void;
```

Defined in: [niivue/index.ts:9486](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9486)

#### Parameters

| Parameter      | Type       |
| -------------- | ---------- |
| `startXYendXY` | `number`[] |

#### Returns

`void`

---

### dragForSlicer3D()

```ts
dragForSlicer3D(startXYendXY: number[]): void;
```

Defined in: [niivue/index.ts:9509](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9509)

#### Parameters

| Parameter      | Type       |
| -------------- | ---------- |
| `startXYendXY` | `number`[] |

#### Returns

`void`

---

### dragOverListener()

```ts
dragOverListener(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:2272](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2272)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### draw2D()

```ts
draw2D(
   leftTopWidthHeight: number[],
   axCorSag: SLICE_TYPE,
   customMM: number,
   imageWidthHeight: number[]): void;
```

Defined in: [niivue/index.ts:10685](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10685)

#### Parameters

| Parameter            | Type         | Default value |
| -------------------- | ------------ | ------------- |
| `leftTopWidthHeight` | `number`[]   | `undefined`   |
| `axCorSag`           | `SLICE_TYPE` | `undefined`   |
| `customMM`           | `number`     | `NaN`         |
| `imageWidthHeight`   | `number`[]   | `...`         |

#### Returns

`void`

---

### draw2DMain()

```ts
draw2DMain(
   leftTopWidthHeight: number[],
   axCorSag: SLICE_TYPE,
   customMM: number): void;
```

Defined in: [niivue/index.ts:10480](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10480)

#### Parameters

| Parameter            | Type         | Default value |
| -------------------- | ------------ | ------------- |
| `leftTopWidthHeight` | `number`[]   | `undefined`   |
| `axCorSag`           | `SLICE_TYPE` | `undefined`   |
| `customMM`           | `number`     | `NaN`         |

#### Returns

`void`

---

### draw3D()

```ts
draw3D(
   leftTopWidthHeight: number[],
   mvpMatrix: mat4,
   modelMatrix: mat4,
   normalMatrix: mat4,
   azimuth: number,
   elevation: number): string;
```

Defined in: [niivue/index.ts:11786](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11786)

#### Parameters

| Parameter            | Type       | Default value |
| -------------------- | ---------- | ------------- |
| `leftTopWidthHeight` | `number`[] | `...`         |
| `mvpMatrix`          | `mat4`     | `null`        |
| `modelMatrix`        | `mat4`     | `null`        |
| `normalMatrix`       | `mat4`     | `null`        |
| `azimuth`            | `number`   | `null`        |
| `elevation`          | `number`   | `0`           |

#### Returns

`string`

---

### draw3DLabel()

```ts
draw3DLabel(
   label: NVLabel3D,
   pos: vec2,
   mvpMatrix?: mat4,
   leftTopWidthHeight?: number[],
   bulletMargin?: number,
   legendWidth?: number,
   secondPass?: boolean,
   scaling?: number): void;
```

Defined in: [niivue/index.ts:11615](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11615)

#### Parameters

| Parameter             | Type        | Default value |
| --------------------- | ----------- | ------------- |
| `label`               | `NVLabel3D` | `undefined`   |
| `pos`                 | `vec2`      | `undefined`   |
| `mvpMatrix?`          | `mat4`      | `undefined`   |
| `leftTopWidthHeight?` | `number`[]  | `undefined`   |
| `bulletMargin?`       | `number`    | `undefined`   |
| `legendWidth?`        | `number`    | `undefined`   |
| `secondPass?`         | `boolean`   | `undefined`   |
| `scaling?`            | `number`    | `1.0`         |

#### Returns

`void`

---

### draw3DLabels()

```ts
draw3DLabels(
   mvpMatrix: mat4,
   leftTopWidthHeight: number[],
   secondPass: boolean): void;
```

Defined in: [niivue/index.ts:11668](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11668)

#### Parameters

| Parameter            | Type       | Default value |
| -------------------- | ---------- | ------------- |
| `mvpMatrix`          | `mat4`     | `undefined`   |
| `leftTopWidthHeight` | `number`[] | `undefined`   |
| `secondPass`         | `boolean`  | `false`       |

#### Returns

`void`

---

### draw3DLine()

```ts
draw3DLine(
   startXY: vec2,
   endXYZ: vec3,
   thickness: number,
   lineColor: number[]): void;
```

Defined in: [niivue/index.ts:12305](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12305)

#### Parameters

| Parameter   | Type       | Default value |
| ----------- | ---------- | ------------- |
| `startXY`   | `vec2`     | `undefined`   |
| `endXYZ`    | `vec3`     | `undefined`   |
| `thickness` | `number`   | `1`           |
| `lineColor` | `number`[] | `...`         |

#### Returns

`void`

---

### drawAddUndoBitmap()

```ts
drawAddUndoBitmap(): void;
```

Defined in: [niivue/index.ts:3084](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3084)

#### Returns

`void`

---

### drawAnchoredLabels()

```ts
drawAnchoredLabels(): void;
```

Defined in: [niivue/index.ts:11732](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11732)

#### Returns

`void`

---

### drawChar()

```ts
drawChar(
   xy: number[],
   scale: number,
   char: number): number;
```

Defined in: [niivue/index.ts:10044](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10044)

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `xy`      | `number`[] |
| `scale`   | `number`   |
| `char`    | `number`   |

#### Returns

`number`

---

### drawCircle()

```ts
drawCircle(
   leftTopWidthHeight: number[],
   circleColor: Float32List,
   fillPercent: number): void;
```

Defined in: [niivue/index.ts:9682](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9682)

#### Parameters

| Parameter            | Type          | Default value |
| -------------------- | ------------- | ------------- |
| `leftTopWidthHeight` | `number`[]    | `undefined`   |
| `circleColor`        | `Float32List` | `...`         |
| `fillPercent`        | `number`      | `1.0`         |

#### Returns

`void`

---

### drawClearAllUndoBitmaps()

```ts
drawClearAllUndoBitmaps(): void;
```

Defined in: [niivue/index.ts:3100](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3100)

#### Returns

`void`

---

### drawColorbar()

```ts
drawColorbar(): void;
```

Defined in: [niivue/index.ts:9973](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9973)

#### Returns

`void`

---

### drawColorbarCore()

```ts
drawColorbarCore(
   layer: number,
   leftTopWidthHeight: number[],
   isNegativeColor: boolean,
   min: number,
   max: number,
   isAlphaThreshold: boolean): void;
```

Defined in: [niivue/index.ts:9866](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9866)

#### Parameters

| Parameter            | Type       | Default value |
| -------------------- | ---------- | ------------- |
| `layer`              | `number`   | `0`           |
| `leftTopWidthHeight` | `number`[] | `...`         |
| `isNegativeColor`    | `boolean`  | `false`       |
| `min`                | `number`   | `0`           |
| `max`                | `number`   | `1`           |
| `isAlphaThreshold`   | `boolean`  | `undefined`   |

#### Returns

`void`

---

### drawCrosshairs3D()

```ts
drawCrosshairs3D(
   isDepthTest: boolean,
   alpha: number,
   mvpMtx: mat4,
   is2DView: boolean,
   isSliceMM: boolean): void;
```

Defined in: [niivue/index.ts:12002](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12002)

#### Parameters

| Parameter     | Type      | Default value |
| ------------- | --------- | ------------- |
| `isDepthTest` | `boolean` | `true`        |
| `alpha`       | `number`  | `1.0`         |
| `mvpMtx`      | `mat4`    | `null`        |
| `is2DView`    | `boolean` | `false`       |
| `isSliceMM`   | `boolean` | `true`        |

#### Returns

`void`

---

### drawCrossLines()

```ts
drawCrossLines(
   sliceIndex: number,
   axCorSag: SLICE_TYPE,
   axiMM: number[],
   corMM: number[],
   sagMM: number[]): void;
```

Defined in: [niivue/index.ts:12535](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12535)

#### Parameters

| Parameter    | Type         |
| ------------ | ------------ |
| `sliceIndex` | `number`     |
| `axCorSag`   | `SLICE_TYPE` |
| `axiMM`      | `number`[]   |
| `corMM`      | `number`[]   |
| `sagMM`      | `number`[]   |

#### Returns

`void`

---

### drawCrossLinesMM()

```ts
drawCrossLinesMM(
   sliceIndex: number,
   axCorSag: SLICE_TYPE,
   axiMM: number[],
   corMM: number[],
   sagMM: number[]): void;
```

Defined in: [niivue/index.ts:12396](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12396)

#### Parameters

| Parameter    | Type         |
| ------------ | ------------ |
| `sliceIndex` | `number`     |
| `axCorSag`   | `SLICE_TYPE` |
| `axiMM`      | `number`[]   |
| `corMM`      | `number`[]   |
| `sagMM`      | `number`[]   |

#### Returns

`void`

---

### drawDottedLine()

```ts
drawDottedLine(
   startXYendXY: number[],
   thickness: number,
   lineColor: number[]): void;
```

Defined in: [niivue/index.ts:12324](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12324)

#### Parameters

| Parameter      | Type       | Default value |
| -------------- | ---------- | ------------- |
| `startXYendXY` | `number`[] | `undefined`   |
| `thickness`    | `number`   | `1`           |
| `lineColor`    | `number`[] | `...`         |

#### Returns

`void`

---

### drawFloodFill()

```ts
drawFloodFill(
   seedXYZ: number[],
   newColor: number,
   growSelectedCluster: number,
   forceMin: number,
   forceMax: number,
   neighbors: number,
   maxDistanceMM: number,
   is2D: boolean,
   targetBitmap: Uint8Array,
   isGrowClusterTool: boolean): void;
```

Defined in: [niivue/index.ts:5563](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5563)

#### Parameters

| Parameter             | Type         | Default value              |
| --------------------- | ------------ | -------------------------- |
| `seedXYZ`             | `number`[]   | `undefined`                |
| `newColor`            | `number`     | `0`                        |
| `growSelectedCluster` | `number`     | `0`                        |
| `forceMin`            | `number`     | `NaN`                      |
| `forceMax`            | `number`     | `NaN`                      |
| `neighbors`           | `number`     | `6`                        |
| `maxDistanceMM`       | `number`     | `Number.POSITIVE_INFINITY` |
| `is2D`                | `boolean`    | `false`                    |
| `targetBitmap`        | `Uint8Array` | `null`                     |
| `isGrowClusterTool`   | `boolean`    | `false`                    |

#### Returns

`void`

---

### drawFloodFillCore()

```ts
drawFloodFillCore(
   img: Uint8Array,
   seedVx: number,
   neighbors: number): void;
```

Defined in: [niivue/index.ts:5471](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5471)

#### Parameters

| Parameter   | Type         | Default value |
| ----------- | ------------ | ------------- |
| `img`       | `Uint8Array` | `undefined`   |
| `seedVx`    | `number`     | `undefined`   |
| `neighbors` | `number`     | `6`           |

#### Returns

`void`

---

### drawGraph()

```ts
drawGraph(): void;
```

Defined in: [niivue/index.ts:10919](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10919)

#### Returns

`void`

---

### drawGraphLine()

```ts
drawGraphLine(
   LTRB: number[],
   color: number[],
   thickness: number): void;
```

Defined in: [niivue/index.ts:12391](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12391)

#### Parameters

| Parameter   | Type       | Default value |
| ----------- | ---------- | ------------- |
| `LTRB`      | `number`[] | `undefined`   |
| `color`     | `number`[] | `...`         |
| `thickness` | `number`   | `2`           |

#### Returns

`void`

---

### drawGrowCut()

```ts
drawGrowCut(): void;
```

Defined in: [niivue/index.ts:5082](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5082)

dilate drawing so all voxels are colored.
works on drawing with multiple colors

#### Returns

`void`

#### Example

```ts
niivue.drawGrowCut();
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/draw2.html)

---

### drawImage3D()

```ts
drawImage3D(
   mvpMatrix: mat4,
   azimuth: number,
   elevation: number): void;
```

Defined in: [niivue/index.ts:11240](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11240)

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `mvpMatrix` | `mat4`   |
| `azimuth`   | `number` |
| `elevation` | `number` |

#### Returns

`void`

---

### drawingBinaryDilationWithSeed()

```ts
drawingBinaryDilationWithSeed(seedXYZ: number[], neighbors: 6 | 18 | 26): void;
```

Defined in: [niivue/index.ts:5339](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5339)

Performs a 1-voxel binary dilation on a connected cluster within the drawing mask using the drawFloodFillCore function.

#### Parameters

| Parameter   | Type                | Default value | Description                                                                   |
| ----------- | ------------------- | ------------- | ----------------------------------------------------------------------------- |
| `seedXYZ`   | `number`[]          | `undefined`   | voxel index of the seed voxel in the mask array.                              |
| `neighbors` | `6` \| `18` \| `26` | `6`           | Number of neighbors to consider for connectivity and dilation (6, 18, or 26). |

#### Returns

`void`

---

### drawLabelLine()

```ts
drawLabelLine(
   label: NVLabel3D,
   pos: vec2,
   mvpMatrix: mat4,
   leftTopWidthHeight: number[],
   secondPass: boolean): void;
```

Defined in: [niivue/index.ts:11593](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11593)

#### Parameters

| Parameter            | Type        | Default value |
| -------------------- | ----------- | ------------- |
| `label`              | `NVLabel3D` | `undefined`   |
| `pos`                | `vec2`      | `undefined`   |
| `mvpMatrix`          | `mat4`      | `undefined`   |
| `leftTopWidthHeight` | `number`[]  | `undefined`   |
| `secondPass`         | `boolean`   | `false`       |

#### Returns

`void`

---

### drawLine()

```ts
drawLine(
   startXYendXY: number[],
   thickness: number,
   lineColor: number[]): void;
```

Defined in: [niivue/index.ts:12284](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12284)

#### Parameters

| Parameter      | Type       | Default value |
| -------------- | ---------- | ------------- |
| `startXYendXY` | `number`[] | `undefined`   |
| `thickness`    | `number`   | `1`           |
| `lineColor`    | `number`[] | `...`         |

#### Returns

`void`

---

### drawLoadingText()

```ts
drawLoadingText(text: string): void;
```

Defined in: [niivue/index.ts:10062](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10062)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `text`    | `string` |

#### Returns

`void`

---

### drawMeasurementTool()

```ts
drawMeasurementTool(startXYendXY: number[]): void;
```

Defined in: [niivue/index.ts:9529](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9529)

#### Parameters

| Parameter      | Type       |
| -------------- | ---------- |
| `startXYendXY` | `number`[] |

#### Returns

`void`

---

### drawMesh3D()

```ts
drawMesh3D(
   isDepthTest: boolean,
   alpha: number,
   m?: mat4,
   modelMtx?: mat4,
   normMtx?: mat4): void;
```

Defined in: [niivue/index.ts:11882](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11882)

#### Parameters

| Parameter     | Type      | Default value |
| ------------- | --------- | ------------- |
| `isDepthTest` | `boolean` | `true`        |
| `alpha`       | `number`  | `1.0`         |
| `m?`          | `mat4`    | `undefined`   |
| `modelMtx?`   | `mat4`    | `undefined`   |
| `normMtx?`    | `mat4`    | `undefined`   |

#### Returns

`void`

---

### drawMosaic()

```ts
drawMosaic(mosaicStr: string): void;
```

Defined in: [niivue/index.ts:12598](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12598)

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

[live demo usage](https://niivue.github.io/niivue/features/mosaics.html)

---

### drawOrientationCube()

```ts
drawOrientationCube(
   leftTopWidthHeight: number[],
   azimuth: number,
   elevation: number): void;
```

Defined in: [niivue/index.ts:11308](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11308)

#### Parameters

| Parameter            | Type       | Default value |
| -------------------- | ---------- | ------------- |
| `leftTopWidthHeight` | `number`[] | `undefined`   |
| `azimuth`            | `number`   | `0`           |
| `elevation`          | `number`   | `0`           |

#### Returns

`void`

---

### drawOtsu()

```ts
drawOtsu(levels: number): void;
```

Defined in: [niivue/index.ts:3388](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3388)

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

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### drawPenFilled()

```ts
drawPenFilled(): void;
```

Defined in: [niivue/index.ts:5817](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5817)

#### Returns

`void`

---

### drawPenLine()

```ts
drawPenLine(
   ptA: number[],
   ptB: number[],
   penValue: number): void;
```

Defined in: [niivue/index.ts:5254](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5254)

#### Parameters

| Parameter  | Type       |
| ---------- | ---------- |
| `ptA`      | `number`[] |
| `ptB`      | `number`[] |
| `penValue` | `number`   |

#### Returns

`void`

---

### drawPt()

```ts
drawPt(
   x: number,
   y: number,
   z: number,
   penValue: number,
   drawBitmap: Uint8Array): void;
```

Defined in: [niivue/index.ts:5210](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5210)

#### Parameters

| Parameter    | Type         | Default value |
| ------------ | ------------ | ------------- |
| `x`          | `number`     | `undefined`   |
| `y`          | `number`     | `undefined`   |
| `z`          | `number`     | `undefined`   |
| `penValue`   | `number`     | `undefined`   |
| `drawBitmap` | `Uint8Array` | `null`        |

#### Returns

`void`

---

### drawRect()

```ts
drawRect(leftTopWidthHeight: number[], lineColor: number[]): void;
```

Defined in: [niivue/index.ts:9635](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9635)

#### Parameters

| Parameter            | Type       |
| -------------------- | ---------- |
| `leftTopWidthHeight` | `number`[] |
| `lineColor`          | `number`[] |

#### Returns

`void`

---

### drawRuler()

```ts
drawRuler(): void;
```

Defined in: [niivue/index.ts:9390](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9390)

#### Returns

`void`

---

### drawRuler10cm()

```ts
drawRuler10cm(
   startXYendXY: number[],
   rulerColor: number[],
   rulerWidth: number): void;
```

Defined in: [niivue/index.ts:9424](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9424)

#### Parameters

| Parameter      | Type       | Default value |
| -------------- | ---------- | ------------- |
| `startXYendXY` | `number`[] | `undefined`   |
| `rulerColor`   | `number`[] | `undefined`   |
| `rulerWidth`   | `number`   | `1`           |

#### Returns

`void`

---

### drawScene()

```ts
drawScene(): string | void;
```

Defined in: [niivue/index.ts:13273](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L13273)

#### Returns

`string` \| `void`

---

### drawSceneCore()

```ts
drawSceneCore(): string | void;
```

Defined in: [niivue/index.ts:12808](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12808)

#### Returns

`string` \| `void`

---

### drawSelectionBox()

```ts
drawSelectionBox(leftTopWidthHeight: number[]): void;
```

Defined in: [niivue/index.ts:9706](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9706)

#### Parameters

| Parameter            | Type       |
| -------------------- | ---------- |
| `leftTopWidthHeight` | `number`[] |

#### Returns

`void`

---

### drawSliceOrientationText()

```ts
drawSliceOrientationText(
   leftTopWidthHeight: number[],
   axCorSag: SLICE_TYPE,
   padLeftTop: number[]): void;
```

Defined in: [niivue/index.ts:10394](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10394)

#### Parameters

| Parameter            | Type         |
| -------------------- | ------------ |
| `leftTopWidthHeight` | `number`[]   |
| `axCorSag`           | `SLICE_TYPE` |
| `padLeftTop`         | `number`[]   |

#### Returns

`void`

---

### drawText()

```ts
drawText(
   xy: number[],
   str: string,
   scale: number,
   color: Float32List): void;
```

Defined in: [niivue/index.ts:10076](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10076)

#### Parameters

| Parameter | Type          | Default value |
| --------- | ------------- | ------------- |
| `xy`      | `number`[]    | `undefined`   |
| `str`     | `string`      | `undefined`   |
| `scale`   | `number`      | `1`           |
| `color`   | `Float32List` | `null`        |

#### Returns

`void`

---

### drawTextBelow()

```ts
drawTextBelow(
   xy: number[],
   str: string,
   scale: number,
   color: number[]): void;
```

Defined in: [niivue/index.ts:10161](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10161)

#### Parameters

| Parameter | Type       | Default value |
| --------- | ---------- | ------------- |
| `xy`      | `number`[] | `undefined`   |
| `str`     | `string`   | `undefined`   |
| `scale`   | `number`   | `1`           |
| `color`   | `number`[] | `null`        |

#### Returns

`void`

---

### drawTextBetween()

```ts
drawTextBetween(
   startXYendXY: number[],
   str: string,
   scale: number,
   color: number[]): void;
```

Defined in: [niivue/index.ts:10135](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10135)

#### Parameters

| Parameter      | Type       | Default value |
| -------------- | ---------- | ------------- |
| `startXYendXY` | `number`[] | `undefined`   |
| `str`          | `string`   | `undefined`   |
| `scale`        | `number`   | `1`           |
| `color`        | `number`[] | `null`        |

#### Returns

`void`

---

### drawTextLeft()

```ts
drawTextLeft(
   xy: number[],
   str: string,
   scale: number,
   color: number[]): void;
```

Defined in: [niivue/index.ts:10113](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10113)

#### Parameters

| Parameter | Type       | Default value |
| --------- | ---------- | ------------- |
| `xy`      | `number`[] | `undefined`   |
| `str`     | `string`   | `undefined`   |
| `scale`   | `number`   | `1`           |
| `color`   | `number`[] | `null`        |

#### Returns

`void`

---

### drawTextRight()

```ts
drawTextRight(
   xy: number[],
   str: string,
   scale: number,
   color: number[]): void;
```

Defined in: [niivue/index.ts:10103](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10103)

#### Parameters

| Parameter | Type       | Default value |
| --------- | ---------- | ------------- |
| `xy`      | `number`[] | `undefined`   |
| `str`     | `string`   | `undefined`   |
| `scale`   | `number`   | `1`           |
| `color`   | `number`[] | `null`        |

#### Returns

`void`

---

### drawTextRightBelow()

```ts
drawTextRightBelow(
   xy: number[],
   str: string,
   scale: number,
   color: number[]): void;
```

Defined in: [niivue/index.ts:10125](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10125)

#### Parameters

| Parameter | Type       | Default value |
| --------- | ---------- | ------------- |
| `xy`      | `number`[] | `undefined`   |
| `str`     | `string`   | `undefined`   |
| `scale`   | `number`   | `1`           |
| `color`   | `number`[] | `null`        |

#### Returns

`void`

---

### drawThumbnail()

```ts
drawThumbnail(): void;
```

Defined in: [niivue/index.ts:12259](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12259)

#### Returns

`void`

---

### drawUndo()

```ts
drawUndo(): void;
```

Defined in: [niivue/index.ts:3115](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3115)

Restore drawing to previous state

#### Returns

`void`

#### Example

```ts
niivue.drawUndo();
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### dropListener()

```ts
dropListener(e: DragEvent): Promise<void>;
```

Defined in: [niivue/index.ts:2596](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2596)

#### Parameters

| Parameter | Type        |
| --------- | ----------- |
| `e`       | `DragEvent` |

#### Returns

`Promise`\<`void`\>

---

### effectiveCanvasHeight()

```ts
effectiveCanvasHeight(): number;
```

Defined in: [niivue/index.ts:9717](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9717)

#### Returns

`number`

---

### effectiveCanvasWidth()

```ts
effectiveCanvasWidth(): number;
```

Defined in: [niivue/index.ts:9722](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9722)

#### Returns

`number`

---

### fill_tratab()

```ts
fill_tratab(
   tt: Uint32Array,
   nabo: Uint32Array,
   nr_set: number): void;
```

Defined in: [niivue/index.ts:8168](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8168)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `tt`      | `Uint32Array` |
| `nabo`    | `Uint32Array` |
| `nr_set`  | `number`      |

#### Returns

`void`

---

### findOtsu()

```ts
findOtsu(mlevel: number): number[];
```

Defined in: [niivue/index.ts:3275](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3275)

#### Parameters

| Parameter | Type     | Default value |
| --------- | -------- | ------------- |
| `mlevel`  | `number` | `2`           |

#### Returns

`number`[]

---

### frac2mm()

```ts
frac2mm(
   frac: vec3,
   volIdx: number,
   isForceSliceMM: boolean): vec4;
```

Defined in: [niivue/index.ts:12163](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12163)

#### Parameters

| Parameter        | Type      | Default value |
| ---------------- | --------- | ------------- |
| `frac`           | `vec3`    | `undefined`   |
| `volIdx`         | `number`  | `0`           |
| `isForceSliceMM` | `boolean` | `false`       |

#### Returns

`vec4`

---

### frac2vox()

```ts
frac2vox(frac: vec3, volIdx: number): vec3;
```

Defined in: [niivue/index.ts:12126](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12126)

#### Parameters

| Parameter | Type     | Default value |
| --------- | -------- | ------------- |
| `frac`    | `vec3`   | `undefined`   |
| `volIdx`  | `number` | `0`           |

#### Returns

`vec3`

---

### generateHTML()

```ts
generateHTML(canvasId: string, esm: string): Promise<string>;
```

Defined in: [niivue/index.ts:4536](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4536)

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

Defined in: [niivue/index.ts:4495](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4495)

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

---

### generateMouseUpCallback()

```ts
generateMouseUpCallback(fracStart: vec3, fracEnd: vec3): void;
```

Defined in: [niivue/index.ts:1563](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1563)

#### Parameters

| Parameter   | Type   |
| ----------- | ------ |
| `fracStart` | `vec3` |
| `fracEnd`   | `vec3` |

#### Returns

`void`

---

### getAllLabels()

```ts
getAllLabels(): NVLabel3D[];
```

Defined in: [niivue/index.ts:9726](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9726)

#### Returns

`NVLabel3D`[]

---

### getBulletMarginWidth()

```ts
getBulletMarginWidth(): number;
```

Defined in: [niivue/index.ts:9767](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9767)

#### Returns

`number`

---

### getConnectomeLabels()

```ts
getConnectomeLabels(): NVLabel3D[];
```

Defined in: [niivue/index.ts:9736](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9736)

#### Returns

`NVLabel3D`[]

---

### getCustomLayout()

```ts
getCustomLayout(): object[];
```

Defined in: [niivue/index.ts:2915](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2915)

Get the current custom layout if set

#### Returns

`object`[]

The current custom layout or null if using built-in layouts

---

### getDescriptives()

```ts
getDescriptives(options: object): Descriptive;
```

Defined in: [niivue/index.ts:7112](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7112)

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

[live demo usage](https://niivue.github.io/niivue/features/draw2.html)

---

### getDicomLoader()

```ts
getDicomLoader(): DicomLoader;
```

Defined in: [niivue/index.ts:2578](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2578)

#### Returns

[`DicomLoader`](../type-aliases/DicomLoader.md)

---

### getFileExt()

```ts
getFileExt(fullname: string, upperCase: boolean): string;
```

Defined in: [niivue/index.ts:2278](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2278)

#### Parameters

| Parameter   | Type      | Default value |
| ----------- | --------- | ------------- |
| `fullname`  | `string`  | `undefined`   |
| `upperCase` | `boolean` | `true`        |

#### Returns

`string`

---

### getFrame4D()

```ts
getFrame4D(id: string): number;
```

Defined in: [niivue/index.ts:8828](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8828)

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

[live demo usage](https://niivue.github.io/niivue/features/timeseries.html)

---

### getGradientTextureData()

```ts
getGradientTextureData(): Float32Array;
```

Defined in: [niivue/index.ts:6895](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6895)

#### Returns

`Float32Array`

---

### getLabelAtPoint()

```ts
getLabelAtPoint(screenPoint: [number, number]): NVLabel3D;
```

Defined in: [niivue/index.ts:11494](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L11494)

#### Parameters

| Parameter     | Type                   |
| ------------- | ---------------------- |
| `screenPoint` | \[`number`, `number`\] |

#### Returns

`NVLabel3D`

---

### getLegendPanelHeight()

```ts
getLegendPanelHeight(panelScale: number): number;
```

Defined in: [niivue/index.ts:9824](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9824)

#### Parameters

| Parameter    | Type     | Default value |
| ------------ | -------- | ------------- |
| `panelScale` | `number` | `1.0`         |

#### Returns

`number`

---

### getLegendPanelWidth()

```ts
getLegendPanelWidth(): number;
```

Defined in: [niivue/index.ts:9793](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9793)

#### Returns

`number`

---

### getMaxVols()

```ts
getMaxVols(): number;
```

Defined in: [niivue/index.ts:10893](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10893)

#### Returns

`number`

---

### getMediaByUrl()

```ts
getMediaByUrl(url: string):
  | NVMesh
  | NVImage;
```

Defined in: [niivue/index.ts:2383](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2383)

Find media by url

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `url`     | `string` |

#### Returns

\| [`NVMesh`](../../nvmesh/classes/NVMesh.md)
\| [`NVImage`](../../nvimage/classes/NVImage.md)

---

### getMeshIndexByID()

```ts
getMeshIndexByID(id: string | number): number;
```

Defined in: [niivue/index.ts:3577](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3577)

#### Parameters

| Parameter | Type                 |
| --------- | -------------------- |
| `id`      | `string` \| `number` |

#### Returns

`number`

---

### getNoPaddingNoBorderCanvasRelativeMousePosition()

```ts
getNoPaddingNoBorderCanvasRelativeMousePosition(event: MouseEvent, target: EventTarget): object;
```

Defined in: [niivue/index.ts:1351](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1351)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `event`   | `MouseEvent`  |
| `target`  | `EventTarget` |

#### Returns

`object`

| Name | Type     | Defined in                                                                                                   |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `x`  | `number` | [niivue/index.ts:1354](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1354) |
| `y`  | `number` | [niivue/index.ts:1354](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1354) |

---

### getOverlayIndexByID()

```ts
getOverlayIndexByID(id: string): number;
```

Defined in: [niivue/index.ts:3723](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3723)

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

Defined in: [niivue/index.ts:3013](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3013)

Detect if display is using radiological or neurological convention.

#### Returns

`boolean`

radiological convention status

#### Example

```ts
let rc = niivue.getRadiologicalConvention();
```

---

### getRelativeMousePosition()

```ts
getRelativeMousePosition(event: MouseEvent, target?: EventTarget): object;
```

Defined in: [niivue/index.ts:1335](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1335)

**`Internal`**

callback to handle mouse move events relative to the canvas

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `event`   | `MouseEvent`  |
| `target?` | `EventTarget` |

#### Returns

`object`

the mouse position relative to the canvas

| Name | Type     | Defined in                                                                                                   |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------ |
| `x`  | `number` | [niivue/index.ts:1335](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1335) |
| `y`  | `number` | [niivue/index.ts:1335](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1335) |

---

### getScale()

```ts
getScale(
   volume: NVImage,
   dst_min: number,
   dst_max: number,
   f_low: number,
   f_high: number): [number, number];
```

Defined in: [niivue/index.ts:8362](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8362)

#### Parameters

| Parameter | Type                                          | Default value |
| --------- | --------------------------------------------- | ------------- |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) | `undefined`   |
| `dst_min` | `number`                                      | `0`           |
| `dst_max` | `number`                                      | `255`         |
| `f_low`   | `number`                                      | `0.0`         |
| `f_high`  | `number`                                      | `0.999`       |

#### Returns

\[`number`, `number`\]

---

### getVolumeIndexByID()

```ts
getVolumeIndexByID(id: string): number;
```

Defined in: [niivue/index.ts:3071](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3071)

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

### gradientGL()

```ts
gradientGL(hdr: NiftiHeader): void;
```

Defined in: [niivue/index.ts:6807](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6807)

#### Parameters

| Parameter | Type                                                     |
| --------- | -------------------------------------------------------- |
| `hdr`     | [`NiftiHeader`](../../types/type-aliases/NiftiHeader.md) |

#### Returns

`void`

---

### handleNodeAdded()

```ts
handleNodeAdded(event: object): void;
```

Defined in: [niivue/index.ts:4958](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4958)

#### Parameters

| Parameter           | Type                                               |
| ------------------- | -------------------------------------------------- |
| `event`             | \{ `detail`: \{ `node`: `NVConnectomeNode`; \}; \} |
| `event.detail`      | \{ `node`: `NVConnectomeNode`; \}                  |
| `event.detail.node` | `NVConnectomeNode`                                 |

#### Returns

`void`

---

### handlePinchZoom()

```ts
handlePinchZoom(e: TouchEvent): void;
```

Defined in: [niivue/index.ts:1990](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1990)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `TouchEvent` |

#### Returns

`void`

---

### idx()

```ts
idx(
   A: number,
   B: number,
   C: number,
   DIM: Uint32Array): number;
```

Defined in: [niivue/index.ts:8004](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8004)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `A`       | `number`      |
| `B`       | `number`      |
| `C`       | `number`      |
| `DIM`     | `Uint32Array` |

#### Returns

`number`

---

### indexNearestXYZmm()

```ts
indexNearestXYZmm(
   mesh: number,
   Xmm: number,
   Ymm: number,
   Zmm: number): number[];
```

Defined in: [niivue/index.ts:3627](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3627)

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

[live demo usage](https://niivue.github.io/niivue/features/clipplanes.html)

---

### inGraphTile()

```ts
inGraphTile(x: number, y: number): boolean;
```

Defined in: [niivue/index.ts:9071](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9071)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`boolean`

---

### init()

```ts
init(): Promise<Niivue>;
```

Defined in: [niivue/index.ts:6620](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6620)

#### Returns

`Promise`\<`Niivue`\>

---

### initFontMets()

```ts
initFontMets(): void;
```

Defined in: [niivue/index.ts:6405](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6405)

#### Returns

`void`

---

### initRenderShader()

```ts
initRenderShader(shader: Shader, gradientAmount: number): void;
```

Defined in: [niivue/index.ts:6599](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6599)

#### Parameters

| Parameter        | Type                                       | Default value |
| ---------------- | ------------------------------------------ | ------------- |
| `shader`         | [`Shader`](../../shader/classes/Shader.md) | `undefined`   |
| `gradientAmount` | `number`                                   | `0.0`         |

#### Returns

`void`

---

### initText()

```ts
initText(): Promise<void>;
```

Defined in: [niivue/index.ts:6484](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6484)

#### Returns

`Promise`\<`void`\>

---

### inRenderTile()

```ts
inRenderTile(x: number, y: number): number;
```

Defined in: [niivue/index.ts:9017](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9017)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`number`

---

### isMeshExt()

```ts
isMeshExt(url: string): boolean;
```

Defined in: [niivue/index.ts:2479](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2479)

Returns boolean: true if filename ends with mesh extension (TRK, pial, etc)

#### Parameters

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `url`     | `string` | filename    |

#### Returns

`boolean`

---

### json()

```ts
json(): ExportDocumentData;
```

Defined in: [niivue/index.ts:4624](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4624)

Converts NiiVue scene to JSON

#### Returns

[`ExportDocumentData`](../../nvdocument/type-aliases/ExportDocumentData.md)

---

### keyDownListener()

```ts
keyDownListener(e: KeyboardEvent): void;
```

Defined in: [niivue/index.ts:2058](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2058)

#### Parameters

| Parameter | Type            |
| --------- | --------------- |
| `e`       | `KeyboardEvent` |

#### Returns

`void`

---

### keyUpListener()

```ts
keyUpListener(e: KeyboardEvent): void;
```

Defined in: [niivue/index.ts:2012](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2012)

#### Parameters

| Parameter | Type            |
| --------- | --------------- |
| `e`       | `KeyboardEvent` |

#### Returns

`void`

---

### largest_original_cluster_labels()

```ts
largest_original_cluster_labels(
   bw: Uint32Array,
   cl: number,
   ls: Uint32Array): [number, Uint32Array];
```

Defined in: [niivue/index.ts:8215](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8215)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `bw`      | `Uint32Array` |
| `cl`      | `number`      |
| `ls`      | `Uint32Array` |

#### Returns

\[`number`, `Uint32Array`\]

---

### loadBmpTexture()

```ts
loadBmpTexture(bmpUrl: string): Promise<WebGLTexture>;
```

Defined in: [niivue/index.ts:6388](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6388)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `bmpUrl`  | `string` |

#### Returns

`Promise`\<`WebGLTexture`\>

---

### loadConnectome()

```ts
loadConnectome(json:
  | Connectome
  | LegacyConnectome): this;
```

Defined in: [niivue/index.ts:5001](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5001)

load a connectome specified by json

#### Parameters

| Parameter | Type                                                                                                                            | Description      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| `json`    | \| [`Connectome`](../../types/type-aliases/Connectome.md) \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) | connectome model |

#### Returns

`this`

Niivue instance

#### See

[live demo usage](https://niivue.github.io/niivue/features/connectome.html)

---

### loadConnectomeAsMesh()

```ts
loadConnectomeAsMesh(json:
  | Connectome
  | LegacyConnectome
  | FreeSurferConnectome): NVMesh;
```

Defined in: [niivue/index.ts:4977](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4977)

#### Parameters

| Parameter | Type                                                                                                                                                                                                                 |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `json`    | \| [`Connectome`](../../types/type-aliases/Connectome.md) \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) \| [`FreeSurferConnectome`](../../nvconnectome/type-aliases/FreeSurferConnectome.md) |

#### Returns

[`NVMesh`](../../nvmesh/classes/NVMesh.md)

---

### loadConnectomeFromUrl()

```ts
loadConnectomeFromUrl(url: string, headers: object): Promise<Niivue>;
```

Defined in: [niivue/index.ts:4928](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4928)

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

[live demo usage](https://niivue.github.io/niivue/features/connectome.html)

---

### loadDefaultFont()

```ts
loadDefaultFont(): Promise<void>;
```

Defined in: [niivue/index.ts:6477](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6477)

#### Returns

`Promise`\<`void`\>

---

### loadDefaultMatCap()

```ts
loadDefaultMatCap(): Promise<WebGLTexture>;
```

Defined in: [niivue/index.ts:6472](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6472)

#### Returns

`Promise`\<`WebGLTexture`\>

---

### loadDeferred4DVolumes()

```ts
loadDeferred4DVolumes(id: string): Promise<void>;
```

Defined in: [niivue/index.ts:8769](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8769)

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

Defined in: [niivue/index.ts:4713](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4713)

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

Defined in: [niivue/index.ts:4359](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4359)

Loads an NVDocument

#### Parameters

| Parameter  | Type         |
| ---------- | ------------ |
| `document` | `NVDocument` |

#### Returns

`Promise`\<`Niivue`\>

Niivue instance

#### See

[live demo usage](https://niivue.github.io/niivue/features/document.load.html)

---

### loadDocumentFromUrl()

```ts
loadDocumentFromUrl(url: string): Promise<void>;
```

Defined in: [niivue/index.ts:4349](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4349)

#### Parameters

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `url`     | `string` | URL of NVDocument |

#### Returns

`Promise`\<`void`\>

---

### loadDrawing()

```ts
loadDrawing(drawingBitmap: NVImage): boolean;
```

Defined in: [niivue/index.ts:3136](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3136)

#### Parameters

| Parameter       | Type                                          |
| --------------- | --------------------------------------------- |
| `drawingBitmap` | [`NVImage`](../../nvimage/classes/NVImage.md) |

#### Returns

`boolean`

---

### loadDrawingFromUrl()

```ts
loadDrawingFromUrl(fnm: string, isBinarize: boolean): Promise<boolean>;
```

Defined in: [niivue/index.ts:3255](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3255)

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

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### loadFont()

```ts
loadFont(fontSheetUrl: any, metricsUrl: object): Promise<void>;
```

Defined in: [niivue/index.ts:6454](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6454)

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
niivue.loadMatCapTexture("Cortex");
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/selectfont.html)

---

### loadFontTexture()

```ts
loadFontTexture(fontUrl: string): Promise<WebGLTexture>;
```

Defined in: [niivue/index.ts:6382](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6382)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `fontUrl` | `string` |

#### Returns

`Promise`\<`WebGLTexture`\>

---

### loadFreeSurferConnectome()

```ts
loadFreeSurferConnectome(json: FreeSurferConnectome): Promise<Niivue>;
```

Defined in: [niivue/index.ts:4953](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4953)

load a connectome specified by json

#### Parameters

| Parameter | Type                                                                              | Description      |
| --------- | --------------------------------------------------------------------------------- | ---------------- |
| `json`    | [`FreeSurferConnectome`](../../nvconnectome/type-aliases/FreeSurferConnectome.md) | freesurfer model |

#### Returns

`Promise`\<`Niivue`\>

Niivue instance

#### See

[live demo usage](https://niivue.github.io/niivue/features/connectome.html)

---

### loadFreeSurferConnectomeFromUrl()

```ts
loadFreeSurferConnectomeFromUrl(url: string, headers: object): Promise<Niivue>;
```

Defined in: [niivue/index.ts:4941](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4941)

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

[live demo usage](https://niivue.github.io/niivue/features/connectome.html)

---

### loadFromArrayBuffer()

```ts
loadFromArrayBuffer(buffer: ArrayBuffer, name: string): Promise<void>;
```

Defined in: [niivue/index.ts:2492](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2492)

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

Defined in: [niivue/index.ts:2508](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2508)

Load a mesh or image from a file object

#### Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `file`    | `File` | File object |

#### Returns

`Promise`\<`void`\>

---

### loadFromUrl()

```ts
loadFromUrl(fnm: string): Promise<NVImage>;
```

Defined in: [niivue/index.ts:8536](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8536)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `fnm`     | `string` |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

---

### loadImages()

```ts
loadImages(images: (
  | ImageFromUrlOptions
| LoadFromUrlParams)[]): Promise<Niivue>;
```

Defined in: [niivue/index.ts:4674](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4674)

#### Parameters

| Parameter | Type                                                                                                                                                        |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `images`  | ( \| [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md) \| [`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md))[] |

#### Returns

`Promise`\<`Niivue`\>

---

### loadMatCapTexture()

```ts
loadMatCapTexture(bmpUrl: string): Promise<WebGLTexture>;
```

Defined in: [niivue/index.ts:6399](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6399)

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

[live demo usage](https://niivue.github.io/niivue/features/shiny.volumes.html)

---

### loadMeshes()

```ts
loadMeshes(meshList: LoadFromUrlParams[]): Promise<Niivue>;
```

Defined in: [niivue/index.ts:4890](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4890)

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

[live demo usage](https://niivue.github.io/niivue/features/meshes.html)

---

### loadPngAsTexture()

```ts
loadPngAsTexture(pngUrl: string, textureNum: number): Promise<WebGLTexture>;
```

Defined in: [niivue/index.ts:6326](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6326)

#### Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `pngUrl`     | `string` |
| `textureNum` | `number` |

#### Returns

`Promise`\<`WebGLTexture`\>

---

### loadVolumes()

```ts
loadVolumes(volumeList: ImageFromUrlOptions[]): Promise<Niivue>;
```

Defined in: [niivue/index.ts:4764](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4764)

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

[live demo usage](https://niivue.github.io/niivue/features/mask.html)

---

### meshShaderNames()

```ts
meshShaderNames(sort: boolean): string[];
```

Defined in: [niivue/index.ts:6590](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6590)

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

[live demo usage](https://niivue.github.io/niivue/features/meshes.html)

---

### meshShaderNameToNumber()

```ts
meshShaderNameToNumber(meshShaderName: string): number;
```

Defined in: [niivue/index.ts:6496](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6496)

#### Parameters

| Parameter        | Type     | Default value |
| ---------------- | -------- | ------------- |
| `meshShaderName` | `string` | `'Phong'`     |

#### Returns

`number`

---

### mm2frac()

```ts
mm2frac(
   mm:
  | [number, number, number, number]
  | Float32Array
  | [number, number, number],
   volIdx: number,
   isForceSliceMM: boolean): vec3;
```

Defined in: [niivue/index.ts:12091](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12091)

#### Parameters

| Parameter        | Type                                                                                                | Default value |
| ---------------- | --------------------------------------------------------------------------------------------------- | ------------- |
| `mm`             | \| \[`number`, `number`, `number`, `number`\] \| `Float32Array` \| \[`number`, `number`, `number`\] | `undefined`   |
| `volIdx`         | `number`                                                                                            | `0`           |
| `isForceSliceMM` | `boolean`                                                                                           | `false`       |

#### Returns

`vec3`

---

### mouseCenterButtonHandler()

```ts
mouseCenterButtonHandler(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:1450](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1450)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### mouseClick()

```ts
mouseClick(
   x: number,
   y: number,
   posChange: number,
   isDelta: boolean): void;
```

Defined in: [niivue/index.ts:9220](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9220)

#### Parameters

| Parameter   | Type      | Default value |
| ----------- | --------- | ------------- |
| `x`         | `number`  | `undefined`   |
| `y`         | `number`  | `undefined`   |
| `posChange` | `number`  | `0`           |
| `isDelta`   | `boolean` | `true`        |

#### Returns

`void`

---

### mouseContextMenuListener()

```ts
mouseContextMenuListener(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:1365](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1365)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### mouseDown()

```ts
mouseDown(x: number, y: number): void;
```

Defined in: [niivue/index.ts:3913](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3913)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`void`

---

### mouseDownListener()

```ts
mouseDownListener(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:1372](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1372)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### mouseLeaveListener()

```ts
mouseLeaveListener(): void;
```

Defined in: [niivue/index.ts:1790](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1790)

#### Returns

`void`

---

### mouseLeftButtonHandler()

```ts
mouseLeftButtonHandler(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:1434](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1434)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### mouseMove()

```ts
mouseMove(x: number, y: number): void;
```

Defined in: [niivue/index.ts:3922](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3922)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`void`

---

### mouseMoveListener()

```ts
mouseMoveListener(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:1822](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1822)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### mouseRightButtonHandler()

```ts
mouseRightButtonHandler(e: MouseEvent): void;
```

Defined in: [niivue/index.ts:1467](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1467)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `MouseEvent` |

#### Returns

`void`

---

### mouseUpListener()

```ts
mouseUpListener(): void;
```

Defined in: [niivue/index.ts:1599](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1599)

#### Returns

`void`

---

### moveCrosshairInVox()

```ts
moveCrosshairInVox(
   x: number,
   y: number,
   z: number): void;
```

Defined in: [niivue/index.ts:12144](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12144)

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

[live demo usage](https://niivue.github.io/niivue/features/draw2.html)

---

### moveVolumeDown()

```ts
moveVolumeDown(volume: NVImage): void;
```

Defined in: [niivue/index.ts:3894](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3894)

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

Defined in: [niivue/index.ts:3871](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3871)

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

Defined in: [niivue/index.ts:3906](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3906)

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

Defined in: [niivue/index.ts:3882](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3882)

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

Defined in: [niivue/index.ts:8530](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8530)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `bytes`   | `Uint8Array` |

#### Returns

`Promise`\<[`NVImage`](../../nvimage/classes/NVImage.md)\>

---

### overlayRGBA()

```ts
overlayRGBA(volume: NVImage): Uint8ClampedArray;
```

Defined in: [niivue/index.ts:4298](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4298)

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `volume`  | [`NVImage`](../../nvimage/classes/NVImage.md) |

#### Returns

`Uint8ClampedArray`

---

### r16Tex()

```ts
r16Tex(
   texID: WebGLTexture,
   activeID: number,
   dims: number[],
   img16: Int16Array): WebGLTexture;
```

Defined in: [niivue/index.ts:5041](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L5041)

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `texID`    | `WebGLTexture` |
| `activeID` | `number`       |
| `dims`     | `number`[]     |
| `img16`    | `Int16Array`   |

#### Returns

`WebGLTexture`

---

### r8Tex()

```ts
r8Tex(
   texID: WebGLTexture,
   activeID: number,
   dims: number[],
   isInit: boolean): WebGLTexture;
```

Defined in: [niivue/index.ts:6158](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6158)

#### Parameters

| Parameter  | Type           | Default value |
| ---------- | -------------- | ------------- |
| `texID`    | `WebGLTexture` | `undefined`   |
| `activeID` | `number`       | `undefined`   |
| `dims`     | `number`[]     | `undefined`   |
| `isInit`   | `boolean`      | `false`       |

#### Returns

`WebGLTexture`

---

### r8Tex2D()

```ts
r8Tex2D(
   texID: WebGLTexture,
   activeID: number,
   dims: number[],
   isInit: boolean): WebGLTexture;
```

Defined in: [niivue/index.ts:6126](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6126)

#### Parameters

| Parameter  | Type           | Default value |
| ---------- | -------------- | ------------- |
| `texID`    | `WebGLTexture` | `undefined`   |
| `activeID` | `number`       | `undefined`   |
| `dims`     | `number`[]     | `undefined`   |
| `isInit`   | `boolean`      | `false`       |

#### Returns

`WebGLTexture`

---

### readDirectory()

```ts
readDirectory(directory: FileSystemDirectoryEntry): FileSystemEntry[];
```

Defined in: [niivue/index.ts:2440](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2440)

#### Parameters

| Parameter   | Type                       |
| ----------- | -------------------------- |
| `directory` | `FileSystemDirectoryEntry` |

#### Returns

`FileSystemEntry`[]

---

### refreshColormaps()

```ts
refreshColormaps(): Niivue;
```

Defined in: [niivue/index.ts:8885](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8885)

#### Returns

`Niivue`

---

### refreshDrawing()

```ts
refreshDrawing(isForceRedraw: boolean, useClickToSegmentBitmap: boolean): void;
```

Defined in: [niivue/index.ts:6026](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6026)

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

[live demo usage](https://niivue.github.io/niivue/features/cactus.html)

---

### refreshLayers()

```ts
refreshLayers(overlayItem: NVImage, layer: number): void;
```

Defined in: [niivue/index.ts:7334](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7334)

#### Parameters

| Parameter     | Type                                          |
| ------------- | --------------------------------------------- |
| `overlayItem` | [`NVImage`](../../nvimage/classes/NVImage.md) |
| `layer`       | `number`                                      |

#### Returns

`void`

---

### registerInteractions()

```ts
registerInteractions(): void;
```

Defined in: [niivue/index.ts:2218](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2218)

#### Returns

`void`

---

### removeHaze()

```ts
removeHaze(level: number, volIndex: number): void;
```

Defined in: [niivue/index.ts:3428](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3428)

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

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### removeMesh()

```ts
removeMesh(mesh: NVMesh): void;
```

Defined in: [niivue/index.ts:3839](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3839)

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

[live demo usage](https://niivue.github.io/niivue/features/connectome.html)

---

### removeMeshByUrl()

```ts
removeMeshByUrl(url: string): void;
```

Defined in: [niivue/index.ts:3855](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3855)

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

Defined in: [niivue/index.ts:3806](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3806)

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

[live demo usage](https://niivue.github.io/niivue/features/document.3d.html)

---

### removeVolumeByIndex()

```ts
removeVolumeByIndex(index: number): void;
```

Defined in: [niivue/index.ts:3824](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3824)

Remove a volume by index

#### Parameters

| Parameter | Type     | Description         |
| --------- | -------- | ------------------- |
| `index`   | `number` | of volume to remove |

#### Returns

`void`

---

### removeVolumeByUrl()

```ts
removeVolumeByUrl(url: string): void;
```

Defined in: [niivue/index.ts:2395](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2395)

Remove volume by url

#### Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `url`     | `string` | Volume added by url to remove |

#### Returns

`void`

#### See

[live demo usage](https://niivue.github.io/niivue/features/document.3d.html)

---

### requestCORSIfNotSameOrigin()

```ts
requestCORSIfNotSameOrigin(img: HTMLImageElement, url: string): void;
```

Defined in: [niivue/index.ts:6318](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6318)

#### Parameters

| Parameter | Type               |
| --------- | ------------------ |
| `img`     | `HTMLImageElement` |
| `url`     | `string`           |

#### Returns

`void`

---

### reserveColorbarPanel()

```ts
reserveColorbarPanel(): number[];
```

Defined in: [niivue/index.ts:9841](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9841)

#### Returns

`number`[]

---

### resetBriCon()

```ts
resetBriCon(msg: MouseEvent | TouchEvent): void;
```

Defined in: [niivue/index.ts:1890](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1890)

#### Parameters

| Parameter | Type                         | Default value |
| --------- | ---------------------------- | ------------- |
| `msg`     | `MouseEvent` \| `TouchEvent` | `null`        |

#### Returns

`void`

---

### resizeListener()

```ts
resizeListener(): void;
```

Defined in: [niivue/index.ts:1287](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1287)

**`Internal`**

callback function to handle resize window events, redraws the scene.

#### Returns

`void`

---

### reverseFaces()

```ts
reverseFaces(mesh: number): void;
```

Defined in: [niivue/index.ts:3661](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3661)

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

[live demo usage](https://niivue.github.io/niivue/features/meshes.html)

---

### rgba16Tex()

```ts
rgba16Tex(
   texID: WebGLTexture,
   activeID: number,
   dims: number[],
   isInit: boolean): WebGLTexture;
```

Defined in: [niivue/index.ts:6281](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6281)

#### Parameters

| Parameter  | Type           | Default value |
| ---------- | -------------- | ------------- |
| `texID`    | `WebGLTexture` | `undefined`   |
| `activeID` | `number`       | `undefined`   |
| `dims`     | `number`[]     | `undefined`   |
| `isInit`   | `boolean`      | `false`       |

#### Returns

`WebGLTexture`

---

### rgbaTex()

```ts
rgbaTex(
   texID: WebGLTexture,
   activeID: number,
   dims: number[],
   isInit: boolean): WebGLTexture;
```

Defined in: [niivue/index.ts:6246](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6246)

#### Parameters

| Parameter  | Type           | Default value |
| ---------- | -------------- | ------------- |
| `texID`    | `WebGLTexture` | `undefined`   |
| `activeID` | `number`       | `undefined`   |
| `dims`     | `number`[]     | `undefined`   |
| `isInit`   | `boolean`      | `false`       |

#### Returns

`WebGLTexture`

---

### rgbaTex2D()

```ts
rgbaTex2D(
   texID: WebGLTexture,
   activeID: number,
   dims: number[],
   data: Uint8Array,
   isFlipVertical: boolean): WebGLTexture;
```

Defined in: [niivue/index.ts:6193](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6193)

#### Parameters

| Parameter        | Type           | Default value |
| ---------------- | -------------- | ------------- |
| `texID`          | `WebGLTexture` | `undefined`   |
| `activeID`       | `number`       | `undefined`   |
| `dims`           | `number`[]     | `undefined`   |
| `data`           | `Uint8Array`   | `null`        |
| `isFlipVertical` | `boolean`      | `true`        |

#### Returns

`WebGLTexture`

---

### saveDocument()

```ts
saveDocument(
   fileName: string,
   compress: boolean,
options: object): Promise<void>;
```

Defined in: [niivue/index.ts:4650](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4650)

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

---

### saveHTML()

```ts
saveHTML(
   fileName: string,
   canvasId: string,
esm: string): Promise<void>;
```

Defined in: [niivue/index.ts:4616](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4616)

save current scene as HTML

#### Parameters

| Parameter  | Type     | Default value     | Description                             |
| ---------- | -------- | ----------------- | --------------------------------------- |
| `fileName` | `string` | `'untitled.html'` | the name of the HTML file               |
| `canvasId` | `string` | `'gl1'`           | id of canvas NiiVue will be attached to |
| `esm`      | `string` | `undefined`       | bundled version of NiiVue               |

#### Returns

`Promise`\<`void`\>

---

### saveImage()

```ts
saveImage(options: SaveImageOptions): Promise<boolean | Uint8Array>;
```

Defined in: [niivue/index.ts:3479](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3479)

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

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### saveScene()

```ts
saveScene(filename: string): Promise<void>;
```

Defined in: [niivue/index.ts:966](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L966)

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

[live demo usage](https://niivue.github.io/niivue/features/ui.html)

---

### scalecropFloat32()

```ts
scalecropFloat32(
   img32: Float32Array,
   dst_min: number,
   dst_max: number,
   src_min: number,
scale: number): Promise<Float32Array>;
```

Defined in: [niivue/index.ts:8340](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8340)

#### Parameters

| Parameter | Type           | Default value |
| --------- | -------------- | ------------- |
| `img32`   | `Float32Array` | `undefined`   |
| `dst_min` | `number`       | `0`           |
| `dst_max` | `number`       | `1`           |
| `src_min` | `number`       | `undefined`   |
| `scale`   | `number`       | `undefined`   |

#### Returns

`Promise`\<`Float32Array`\>

---

### scalecropUint8()

```ts
scalecropUint8(
   img32: Float32Array,
   dst_min: number,
   dst_max: number,
   src_min: number,
scale: number): Promise<Uint8Array>;
```

Defined in: [niivue/index.ts:8321](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8321)

#### Parameters

| Parameter | Type           | Default value |
| --------- | -------------- | ------------- |
| `img32`   | `Float32Array` | `undefined`   |
| `dst_min` | `number`       | `0`           |
| `dst_max` | `number`       | `255`         |
| `src_min` | `number`       | `undefined`   |
| `scale`   | `number`       | `undefined`   |

#### Returns

`Promise`\<`Uint8Array`\>

---

### scaleSlice()

```ts
scaleSlice(
   w: number,
   h: number,
   padPixelsWH: [number, number],
   canvasWH: [number, number]): number[];
```

Defined in: [niivue/index.ts:12236](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12236)

#### Parameters

| Parameter     | Type                   |
| ------------- | ---------------------- |
| `w`           | `number`               |
| `h`           | `number`               |
| `padPixelsWH` | \[`number`, `number`\] |
| `canvasWH`    | \[`number`, `number`\] |

#### Returns

`number`[]

---

### sceneExtentsMinMax()

```ts
sceneExtentsMinMax(isSliceMM: boolean): vec3[];
```

Defined in: [niivue/index.ts:10824](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10824)

#### Parameters

| Parameter   | Type      | Default value |
| ----------- | --------- | ------------- |
| `isSliceMM` | `boolean` | `true`        |

#### Returns

`vec3`[]

---

### screenFieldOfViewExtendedMM()

```ts
screenFieldOfViewExtendedMM(axCorSag: number): MM;
```

Defined in: [niivue/index.ts:10364](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10364)

#### Parameters

| Parameter  | Type     | Default value |
| ---------- | -------- | ------------- |
| `axCorSag` | `number` | `0`           |

#### Returns

`MM`

---

### screenFieldOfViewExtendedVox()

```ts
screenFieldOfViewExtendedVox(axCorSag: number): MM;
```

Defined in: [niivue/index.ts:10348](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10348)

#### Parameters

| Parameter  | Type     | Default value |
| ---------- | -------- | ------------- |
| `axCorSag` | `number` | `0`           |

#### Returns

`MM`

---

### screenFieldOfViewMM()

```ts
screenFieldOfViewMM(axCorSag: number, forceSliceMM: boolean): vec3;
```

Defined in: [niivue/index.ts:10320](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10320)

#### Parameters

| Parameter      | Type      | Default value |
| -------------- | --------- | ------------- |
| `axCorSag`     | `number`  | `0`           |
| `forceSliceMM` | `boolean` | `false`       |

#### Returns

`vec3`

---

### screenFieldOfViewVox()

```ts
screenFieldOfViewVox(axCorSag: number): vec3;
```

Defined in: [niivue/index.ts:10313](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10313)

#### Parameters

| Parameter  | Type     | Default value |
| ---------- | -------- | ------------- |
| `axCorSag` | `number` | `0`           |

#### Returns

`vec3`

---

### screenXY2mm()

```ts
screenXY2mm(
   x: number,
   y: number,
   forceSlice: number): vec4;
```

Defined in: [niivue/index.ts:9458](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9458)

#### Parameters

| Parameter    | Type     | Default value |
| ------------ | -------- | ------------- |
| `x`          | `number` | `undefined`   |
| `y`          | `number` | `undefined`   |
| `forceSlice` | `number` | `-1`          |

#### Returns

`vec4`

---

### screenXY2TextureFrac()

```ts
screenXY2TextureFrac(
   x: number,
   y: number,
   i: number,
   restrict0to1: boolean): vec3;
```

Defined in: [niivue/index.ts:12178](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12178)

#### Parameters

| Parameter      | Type      | Default value |
| -------------- | --------- | ------------- |
| `x`            | `number`  | `undefined`   |
| `y`            | `number`  | `undefined`   |
| `i`            | `number`  | `undefined`   |
| `restrict0to1` | `boolean` | `true`        |

#### Returns

`vec3`

---

### setAdditiveBlend()

```ts
setAdditiveBlend(isAdditiveBlend: boolean): void;
```

Defined in: [niivue/index.ts:3003](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3003)

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

[live demo usage](https://niivue.github.io/niivue/features/additive.voxels.html)

---

### setAtlasOutline()

```ts
setAtlasOutline(isOutline: number): void;
```

Defined in: [niivue/index.ts:10205](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10205)

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `isOutline` | `number` |

#### Returns

`void`

---

### setClipPlane()

```ts
setClipPlane(depthAzimuthElevation: number[]): void;
```

Defined in: [niivue/index.ts:3979](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3979)

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

[live demo usage](https://niivue.github.io/niivue/features/mask.html)

---

### setClipPlaneColor()

```ts
setClipPlaneColor(color: number[]): void;
```

Defined in: [niivue/index.ts:4191](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4191)

set the color of the 3D clip plane

#### Parameters

| Parameter | Type       | Description                                                                  |
| --------- | ---------- | ---------------------------------------------------------------------------- |
| `color`   | `number`[] | the new color. expects an array of RGBA values. values can range from 0 to 1 |

#### Returns

`void`

#### Example

```ts
niivue.setClipPlaneColor([1, 1, 1, 0.5]); // white, transparent
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/clipplanes.html)

---

### setClipPlaneThick()

```ts
setClipPlaneThick(thick: number): void;
```

Defined in: [niivue/index.ts:4205](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4205)

adjust thickness of the 3D clip plane

#### Parameters

| Parameter | Type     | Description                                                                |
| --------- | -------- | -------------------------------------------------------------------------- |
| `thick`   | `number` | thickness of slab. Value 0..1.73 (cube opposite corner length is sqrt(3)). |

#### Returns

`void`

#### Example

```ts
niivue.setClipPlaneThick(0.3); // thin slab
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/clipplanes.html)

---

### setClipVolume()

```ts
setClipVolume(low: number[], high: number[]): void;
```

Defined in: [niivue/index.ts:4222](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4222)

set the clipping region for volume rendering

#### Parameters

| Parameter | Type       | Description                                                                                                                                       |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `low`     | `number`[] | 3-component array specifying the lower bound of the clipping region along the X, Y, and Z axes. Values range from 0 (start) to 1 (end of volume). |
| `high`    | `number`[] | 3-component array specifying the upper bound of the clipping region along the X, Y, and Z axes. Values range from 0 to 1.                         |

#### Returns

`void`

#### Example

```ts
niivue.setClipPlaneColor([0.0, 0.0, 0.2], [1.0, 1.0, 0.7]); // remove inferior 20% and superior 30%
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/clipplanes.html)

---

### setColormap()

```ts
setColormap(id: string, colormap: string): void;
```

Defined in: [niivue/index.ts:7995](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7995)

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

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

---

### setColorMap()

```ts
setColorMap(id: string, colormap: string): void;
```

Defined in: [niivue/index.ts:8710](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8710)

#### Parameters

| Parameter  | Type     |
| ---------- | -------- |
| `id`       | `string` |
| `colormap` | `string` |

#### Returns

`void`

---

### setColormapNegative()

```ts
setColormapNegative(id: string, colormapNegative: string): void;
```

Defined in: [niivue/index.ts:8723](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8723)

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

[live demo usage](https://niivue.github.io/niivue/features/mosaics2.html)

---

### setCornerOrientationText()

```ts
setCornerOrientationText(isCornerOrientationText: boolean): void;
```

Defined in: [niivue/index.ts:2819](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2819)

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

[live demo usage](https://niivue.github.io/niivue/features/worldspace2.html)

---

### setCrosshairColor()

```ts
setCrosshairColor(color: number[]): void;
```

Defined in: [niivue/index.ts:4001](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4001)

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

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

---

### setCrosshairWidth()

```ts
setCrosshairWidth(crosshairWidth: number): void;
```

Defined in: [niivue/index.ts:4011](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4011)

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

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

---

### setCustomGradientTexture()

```ts
setCustomGradientTexture(data: Float32Array | Uint8Array, dims?: number[]): void;
```

Defined in: [niivue/index.ts:6983](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6983)

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

---

### setCustomLayout()

```ts
setCustomLayout(layout: object[]): void;
```

Defined in: [niivue/index.ts:2871](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2871)

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

Defined in: [niivue/index.ts:6575](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6575)

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

[live demo usage](https://niivue.github.io/niivue/features/mesh.atlas.html)

---

### setDefaults()

```ts
setDefaults(options: Partial<NVConfigOptions>, resetBriCon: boolean): void;
```

Defined in: [niivue/index.ts:2941](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2941)

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
- [live demo usage](https://niivue.github.io/niivue/features/connectome.html)

#### Example

```ts
niivue.nv1.setDefaults(opts, true);
```

---

### setDragEnd()

```ts
setDragEnd(x: number, y: number): void;
```

Defined in: [niivue/index.ts:1949](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1949)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`void`

---

### setDragStart()

```ts
setDragStart(x: number, y: number): void;
```

Defined in: [niivue/index.ts:1942](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1942)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`void`

---

### setDrawColormap()

```ts
setDrawColormap(name: string): void;
```

Defined in: [niivue/index.ts:4033](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4033)

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

Defined in: [niivue/index.ts:4044](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4044)

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

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### setDrawOpacity()

```ts
setDrawOpacity(opacity: number): void;
```

Defined in: [niivue/index.ts:4084](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4084)

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

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### setFrame4D()

```ts
setFrame4D(id: string, frame4D: number): void;
```

Defined in: [niivue/index.ts:8801](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8801)

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

[live demo usage](https://niivue.github.io/niivue/features/timeseries.html)

---

### setGamma()

```ts
setGamma(gamma: number): void;
```

Defined in: [niivue/index.ts:8760](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8760)

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

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

---

### setGradientOpacity()

```ts
setGradientOpacity(gradientOpacity: number, renderSilhouette: number): Promise<void>;
```

Defined in: [niivue/index.ts:4278](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4278)

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

[live demo usage](https://niivue.github.io/niivue/features/gradient.opacity.html)

---

### setHeroImage()

```ts
setHeroImage(fraction: number): void;
```

Defined in: [niivue/index.ts:2840](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2840)

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

[live demo usage](https://niivue.github.io/niivue/features/layout.html)

---

### setHighResolutionCapable()

```ts
setHighResolutionCapable(forceDevicePixelRatio: number | boolean): void;
```

Defined in: [niivue/index.ts:3023](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3023)

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

[live demo usage](https://niivue.github.io/niivue/features/sync.mesh.html)

---

### setInterpolation()

```ts
setInterpolation(isNearest: boolean): void;
```

Defined in: [niivue/index.ts:10217](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10217)

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

[live demo usage](https://niivue.github.io/niivue/features/draw2.html)

---

### setIsOrientationTextVisible()

```ts
setIsOrientationTextVisible(isOrientationTextVisible: boolean): void;
```

Defined in: [niivue/index.ts:2829](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2829)

determine if orientation text appears in 2D slice view.

#### Parameters

| Parameter                  | Type      | Description               |
| -------------------------- | --------- | ------------------------- |
| `isOrientationTextVisible` | `boolean` | controls position of text |

#### Returns

`void`

#### Example

```ts
niivue.setIsOrientationTextVisible(false);
```

---

### setMesh()

```ts
setMesh(mesh: NVMesh, toIndex: number): void;
```

Defined in: [niivue/index.ts:3774](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3774)

#### Parameters

| Parameter | Type                                       | Default value |
| --------- | ------------------------------------------ | ------------- |
| `mesh`    | [`NVMesh`](../../nvmesh/classes/NVMesh.md) | `undefined`   |
| `toIndex` | `number`                                   | `0`           |

#### Returns

`void`

---

### setMeshLayerProperty()

```ts
setMeshLayerProperty(
   mesh: number,
   layer: number,
   key: keyof NVMeshLayer,
val: number): Promise<void>;
```

Defined in: [niivue/index.ts:3680](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3680)

reverse triangle winding of mesh (swap front and back faces)

#### Parameters

| Parameter | Type                                                            | Description                                       |
| --------- | --------------------------------------------------------------- | ------------------------------------------------- |
| `mesh`    | `number`                                                        | identity of mesh to change                        |
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

[live demo usage](https://niivue.github.io/niivue/features/mesh.4D.html)

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

Defined in: [niivue/index.ts:3602](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3602)

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

[live demo usage](https://niivue.github.io/niivue/features/meshes.html)

---

### setMeshShader()

```ts
setMeshShader(id: number, meshShaderNameOrNumber: number): void;
```

Defined in: [niivue/index.ts:6512](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L6512)

select new shader for triangulated meshes and connectomes. Note that this function requires the mesh is fully loaded: you may want use `await` with loadMeshes (as seen in live demo).

#### Parameters

| Parameter                | Type     | Default value | Description               |
| ------------------------ | -------- | ------------- | ------------------------- |
| `id`                     | `number` | `undefined`   | id of mesh to change      |
| `meshShaderNameOrNumber` | `number` | `2`           | identify shader for usage |

#### Returns

`void`

#### Example

```ts
niivue.setMeshShader("toon");
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/meshes.html)

---

### setMeshThicknessOn2D()

```ts
setMeshThicknessOn2D(meshThicknessOn2D: number): void;
```

Defined in: [niivue/index.ts:2970](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2970)

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

[live demo usage](https://niivue.github.io/niivue/features/worldspace2.html)

---

### setModulationImage()

```ts
setModulationImage(
   idTarget: string,
   idModulation: string,
   modulateAlpha: number): void;
```

Defined in: [niivue/index.ts:8738](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8738)

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

- [live demo scalar usage](https://niivue.github.io/niivue/features/modulate.html)
- [live demo usage](https://niivue.github.io/niivue/features/modulateAfni.html)

---

### setMultiplanarLayout()

```ts
setMultiplanarLayout(layout: number): void;
```

Defined in: [niivue/index.ts:2805](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2805)

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

[live demo usage](https://niivue.github.io/niivue/features/layout.html)

---

### setMultiplanarPadPixels()

```ts
setMultiplanarPadPixels(pixels: number): void;
```

Defined in: [niivue/index.ts:2794](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2794)

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

[live demo usage](https://niivue.github.io/niivue/features/atlas.html)

---

### setOpacity()

```ts
setOpacity(volIdx: number, newOpacity: number): void;
```

Defined in: [niivue/index.ts:4167](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4167)

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

[live demo usage](https://niivue.github.io/niivue/features/atlas.html)

---

### setPan2Dxyzmm()

```ts
setPan2Dxyzmm(xyzmmZoom: vec4): void;
```

Defined in: [niivue/index.ts:3695](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3695)

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

Defined in: [niivue/index.ts:4072](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4072)

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

[live demo usage](https://niivue.github.io/niivue/features/draw.ui.html)

---

### setPivot3D()

```ts
setPivot3D(): void;
```

Defined in: [niivue/index.ts:10876](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10876)

#### Returns

`void`

---

### setRadiologicalConvention()

```ts
setRadiologicalConvention(isRadiologicalConvention: boolean): void;
```

Defined in: [niivue/index.ts:2929](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2929)

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

[live demo usage](https://niivue.github.io/niivue/features/worldspace.html)

---

### setRenderAzimuthElevation()

```ts
setRenderAzimuthElevation(a: number, e: number): void;
```

Defined in: [niivue/index.ts:3708](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3708)

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

[live demo usage](https://niivue.github.io/niivue/features/mask.html)

---

### setRenderDrawAmbientOcclusion()

```ts
setRenderDrawAmbientOcclusion(ao: number): void;
```

Defined in: [niivue/index.ts:8698](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8698)

darken crevices and brighten corners when 3D rendering drawings.

#### Parameters

| Parameter | Type     | Description                               |
| --------- | -------- | ----------------------------------------- |
| `ao`      | `number` | amount of ambient occlusion (default 0.4) |

#### Returns

`void`

#### See

[live demo usage](https://niivue.github.io/niivue/features/torso.html)

---

### setScale()

```ts
setScale(scale: number): void;
```

Defined in: [niivue/index.ts:4179](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4179)

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

[live demo usage](https://niivue.github.io/niivue/features/shiny.volumes.html)

---

### setSelectionBoxColor()

```ts
setSelectionBoxColor(color: number[]): void;
```

Defined in: [niivue/index.ts:4097](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4097)

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

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

---

### setSliceMM()

```ts
setSliceMM(isSliceMM: boolean): void;
```

Defined in: [niivue/index.ts:2992](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2992)

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

[live demo usage](https://niivue.github.io/niivue/features/worldspace2.html)

---

### setSliceMosaicString()

```ts
setSliceMosaicString(str: string): void;
```

Defined in: [niivue/index.ts:2981](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2981)

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

[live demo usage](https://niivue.github.io/niivue/features/mosaics.html)

---

### setSliceType()

```ts
setSliceType(st: SLICE_TYPE): this;
```

Defined in: [niivue/index.ts:4152](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4152)

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

[live demo usage](https://niivue.github.io/niivue/features/basic.multiplanar.html)

---

### setVolume()

```ts
setVolume(volume: NVImage, toIndex: number): void;
```

Defined in: [niivue/index.ts:3742](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3742)

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

Defined in: [niivue/index.ts:4242](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4242)

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

- [live demo usage](https://niivue.github.io/niivue/features/shiny.volumes.html)
- [live demo usage](https://niivue.github.io/niivue/features/gradient.order.html)

---

### sliceScale()

```ts
sliceScale(forceVox: boolean): SliceScale;
```

Defined in: [niivue/index.ts:8990](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8990)

#### Parameters

| Parameter  | Type      | Default value |
| ---------- | --------- | ------------- |
| `forceVox` | `boolean` | `false`       |

#### Returns

`SliceScale`

---

### sliceScroll2D()

```ts
sliceScroll2D(
   posChange: number,
   x: number,
   y: number,
   isDelta: boolean): void;
```

Defined in: [niivue/index.ts:4102](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4102)

#### Parameters

| Parameter   | Type      | Default value |
| ----------- | --------- | ------------- |
| `posChange` | `number`  | `undefined`   |
| `x`         | `number`  | `undefined`   |
| `y`         | `number`  | `undefined`   |
| `isDelta`   | `boolean` | `true`        |

#### Returns

`void`

---

### sliceScroll3D()

```ts
sliceScroll3D(posChange: number): void;
```

Defined in: [niivue/index.ts:9028](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9028)

#### Parameters

| Parameter   | Type     | Default value |
| ----------- | -------- | ------------- |
| `posChange` | `number` | `0`           |

#### Returns

`void`

---

### sph2cartDeg()

```ts
sph2cartDeg(azimuth: number, elevation: number): number[];
```

Defined in: [niivue/index.ts:3951](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L3951)

convert spherical AZIMUTH, ELEVATION to Cartesian

#### Parameters

| Parameter   | Type     | Description      |
| ----------- | -------- | ---------------- |
| `azimuth`   | `number` | azimuth number   |
| `elevation` | `number` | elevation number |

#### Returns

`number`[]

the converted [x, y, z] coordinates

#### Example

```ts
niivue = new Niivue();
xyz = niivue.sph2cartDeg(42, 42);
```

---

### sumBitmap()

```ts
sumBitmap(img: Uint8Array): number;
```

Defined in: [niivue/index.ts:9102](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9102)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `img`     | `Uint8Array` |

#### Returns

`number`

---

### swizzleVec3MM()

```ts
swizzleVec3MM(v3: vec3, axCorSag: SLICE_TYPE): vec3;
```

Defined in: [niivue/index.ts:10300](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10300)

#### Parameters

| Parameter  | Type         |
| ---------- | ------------ |
| `v3`       | `vec3`       |
| `axCorSag` | `SLICE_TYPE` |

#### Returns

`vec3`

---

### sync()

```ts
sync(): void;
```

Defined in: [niivue/index.ts:1185](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1185)

**`Internal`**

Sync the scene controls (orientation, crosshair location, etc.) from one Niivue instance to another. useful for using one canvas to drive another.

#### Returns

`void`

#### Example

```ts
niivue1 = new Niivue();
niivue2 = new Niivue();
niivue2.syncWith(niivue1);
niivue2.sync();
```

---

### ~~syncWith()~~

```ts
syncWith(otherNV: Niivue | Niivue[], syncOpts: object): void;
```

Defined in: [niivue/index.ts:1090](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1090)

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

[live demo usage](https://niivue.github.io/niivue/features/sync.mesh.html)

---

### textHeight()

```ts
textHeight(scale: number, str: string): number;
```

Defined in: [niivue/index.ts:10029](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10029)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `scale`   | `number` |
| `str`     | `string` |

#### Returns

`number`

---

### textSizePoints()

```ts
textSizePoints(): void;
```

Defined in: [niivue/index.ts:1255](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1255)

Compute point size for screen text that scales with resolution and screen size.

- Keeps physical font size consistent across different DPIs.
- Uses fontSizeScaling to scale with canvas size above a reference threshold.

#### Returns

`void`

---

### textWidth()

```ts
textWidth(scale: number, str: string): number;
```

Defined in: [niivue/index.ts:10016](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10016)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `scale`   | `number` |
| `str`     | `string` |

#### Returns

`number`

---

### tileIndex()

```ts
tileIndex(x: number, y: number): number;
```

Defined in: [niivue/index.ts:9005](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9005)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `x`       | `number` |
| `y`       | `number` |

#### Returns

`number`

---

### touchEndListener()

```ts
touchEndListener(e: TouchEvent): void;
```

Defined in: [niivue/index.ts:1704](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1704)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `TouchEvent` |

#### Returns

`void`

---

### touchMoveListener()

```ts
touchMoveListener(e: TouchEvent): void;
```

Defined in: [niivue/index.ts:1959](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1959)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `TouchEvent` |

#### Returns

`void`

---

### touchStartListener()

```ts
touchStartListener(e: TouchEvent): void;
```

Defined in: [niivue/index.ts:1666](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1666)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `TouchEvent` |

#### Returns

`void`

---

### translate_labels()

```ts
translate_labels(
   il: Uint32Array,
   dim: Uint32Array,
   tt: Uint32Array,
   ttn: number): [number, Uint32Array];
```

Defined in: [niivue/index.ts:8193](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L8193)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `il`      | `Uint32Array` |
| `dim`     | `Uint32Array` |
| `tt`      | `Uint32Array` |
| `ttn`     | `number`      |

#### Returns

\[`number`, `Uint32Array`\]

---

### traverseFileTree()

```ts
traverseFileTree(
   item: any,
   path: string,
fileArray: any): Promise<File[]>;
```

Defined in: [niivue/index.ts:2404](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2404)

#### Parameters

| Parameter   | Type     | Default value |
| ----------- | -------- | ------------- |
| `item`      | `any`    | `undefined`   |
| `path`      | `string` | `''`          |
| `fileArray` | `any`    | `undefined`   |

#### Returns

`Promise`\<`File`[]\>

---

### updateBitmapFromClickToSegment()

```ts
updateBitmapFromClickToSegment(): void;
```

Defined in: [niivue/index.ts:9086](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L9086)

#### Returns

`void`

---

### updateGLVolume()

```ts
updateGLVolume(): void;
```

Defined in: [niivue/index.ts:7060](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L7060)

update the webGL 2.0 scene after making changes to the array of volumes. It's always good to call this method after altering one or more volumes manually (outside of Niivue setter methods)

#### Returns

`void`

#### Example

```ts
niivue = new Niivue();
niivue.updateGLVolume();
```

#### See

[live demo usage](https://niivue.github.io/niivue/features/colormaps.html)

---

### updateInterpolation()

```ts
updateInterpolation(layer: number, isForceLinear: boolean): void;
```

Defined in: [niivue/index.ts:10183](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10183)

#### Parameters

| Parameter       | Type      | Default value |
| --------------- | --------- | ------------- |
| `layer`         | `number`  | `undefined`   |
| `isForceLinear` | `boolean` | `false`       |

#### Returns

`void`

---

### useDicomLoader()

```ts
useDicomLoader(loader: DicomLoader): void;
```

Defined in: [niivue/index.ts:2574](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2574)

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

Defined in: [niivue/index.ts:2564](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2564)

#### Parameters

| Parameter | Type      |
| --------- | --------- |
| `loader`  | `unknown` |
| `fileExt` | `string`  |
| `toExt`   | `string`  |

#### Returns

`void`

---

### vox2frac()

```ts
vox2frac(vox: vec3, volIdx: number): vec3;
```

Defined in: [niivue/index.ts:12121](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L12121)

#### Parameters

| Parameter | Type     | Default value |
| --------- | -------- | ------------- |
| `vox`     | `vec3`   | `undefined`   |
| `volIdx`  | `number` | `0`           |

#### Returns

`vec3`

---

### vox2mm()

```ts
vox2mm(XYZ: number[], mtx: mat4): vec3;
```

Defined in: [niivue/index.ts:4329](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L4329)

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `XYZ`     | `number`[] |
| `mtx`     | `mat4`     |

#### Returns

`vec3`

---

### wheelListener()

```ts
wheelListener(e: WheelEvent): void;
```

Defined in: [niivue/index.ts:2099](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L2099)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `e`       | `WheelEvent` |

#### Returns

`void`

---

### windowingHandler()

```ts
windowingHandler(
   x: number,
   y: number,
   volIdx: number): void;
```

Defined in: [niivue/index.ts:1730](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L1730)

#### Parameters

| Parameter | Type     | Default value |
| --------- | -------- | ------------- |
| `x`       | `number` | `undefined`   |
| `y`       | `number` | `undefined`   |
| `volIdx`  | `number` | `0`           |

#### Returns

`void`

---

### xyMM2xyzMM()

```ts
xyMM2xyzMM(axCorSag: SLICE_TYPE, sliceFrac: number): number[];
```

Defined in: [niivue/index.ts:10441](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/index.ts#L10441)

#### Parameters

| Parameter   | Type         |
| ----------- | ------------ |
| `axCorSag`  | `SLICE_TYPE` |
| `sliceFrac` | `number`     |

#### Returns

`number`[]
