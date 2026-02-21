# Class: NVMesh

Defined in: [nvmesh.ts:133](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L133)

a NVMesh encapsulates some mesh data and provides methods to query and operate on meshes

## Extended by

- [`NVConnectome`](../../nvconnectome/classes/NVConnectome.md)

## Constructors

### Constructor

```ts
new NVMesh(
   pts: Float32Array,
   tris: Uint32Array,
   name: string,
   rgba255: Uint8Array,
   opacity: number,
   visible: boolean,
   gl: WebGL2RenderingContext,
   connectome:
  | string
  | LegacyConnectome,
   dpg: ValuesArray,
   dps: ValuesArray,
   dpv: ValuesArray,
   groups: ValuesArray,
   colorbarVisible: boolean,
   anatomicalStructurePrimary: string): NVMesh;
```

Defined in: [nvmesh.ts:219](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L219)

#### Parameters

| Parameter                    | Type                                                                              | Default value | Description                                                                                              |
| ---------------------------- | --------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------------------------------------- |
| `pts`                        | `Float32Array`                                                                    | `undefined`   | a 3xN array of vertex positions (X,Y,Z coordinates).                                                     |
| `tris`                       | `Uint32Array`                                                                     | `undefined`   | a 3xN array of triangle indices (I,J,K; indexed from zero). Each triangle generated from three vertices. |
| `name`                       | `string`                                                                          | `''`          | a name for this image. Default is an empty string                                                        |
| `rgba255`                    | `Uint8Array`                                                                      | `...`         | the base color of the mesh. RGBA values from 0 to 255. Default is white                                  |
| `opacity`                    | `number`                                                                          | `1.0`         | the opacity for this mesh. default is 1                                                                  |
| `visible`                    | `boolean`                                                                         | `true`        | whether or not this image is to be visible                                                               |
| `gl`                         | `WebGL2RenderingContext`                                                          | `undefined`   | WebGL rendering context                                                                                  |
| `connectome`                 | \| `string` \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) | `null`        | specify connectome edges and nodes. Default is null (not a connectome).                                  |
| `dpg`                        | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                   | `null`        | Data per group for tractography, see TRK format. Default is null (not tractograpgy)                      |
| `dps`                        | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                   | `null`        | Data per streamline for tractography, see TRK format. Default is null (not tractograpgy)                 |
| `dpv`                        | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                   | `null`        | Data per vertex for tractography, see TRK format. Default is null (not tractograpgy)                     |
| `groups`                     | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                   | `null`        | Groups for tractography, see TRK format. Default is null (not tractograpgy)                              |
| `colorbarVisible`            | `boolean`                                                                         | `true`        | does this mesh display a colorbar                                                                        |
| `anatomicalStructurePrimary` | `string`                                                                          | `''`          | region for mesh. Default is an empty string                                                              |

#### Returns

`NVMesh`

## Properties

| Property                                                             | Type                                                                                                                                          | Default value   | Defined in                                                                                     |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------- |
| <a id="anatomicalstructureprimary"></a> `anatomicalStructurePrimary` | `string`                                                                                                                                      | `undefined`     | [nvmesh.ts:136](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L136) |
| <a id="colorbarvisible"></a> `colorbarVisible`                       | `boolean`                                                                                                                                     | `undefined`     | [nvmesh.ts:137](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L137) |
| <a id="colormap"></a> `colormap?`                                    | \| `string` \| [`ColorMap`](../../colortables/type-aliases/ColorMap.md) \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) | `undefined`     | [nvmesh.ts:173](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L173) |
| <a id="colormapinvert"></a> `colormapInvert`                         | `boolean`                                                                                                                                     | `false`         | [nvmesh.ts:146](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L146) |
| <a id="connectome"></a> `connectome?`                                | \| `string` \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md)                                                             | `undefined`     | [nvmesh.ts:179](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L179) |
| <a id="data_type"></a> `data_type?`                                  | `string`                                                                                                                                      | `undefined`     | [nvmesh.ts:159](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L159) |
| <a id="dpg"></a> `dpg?`                                              | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [nvmesh.ts:174](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L174) |
| <a id="dps"></a> `dps?`                                              | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [nvmesh.ts:175](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L175) |
| <a id="dpsthreshold"></a> `dpsThreshold`                             | `number`                                                                                                                                      | `NaN`           | [nvmesh.ts:171](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L171) |
| <a id="dpv"></a> `dpv?`                                              | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [nvmesh.ts:176](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L176) |
| <a id="edgecolormap"></a> `edgeColormap`                             | `string`                                                                                                                                      | `'warm'`        | [nvmesh.ts:189](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L189) |
| <a id="edgecolormapnegative"></a> `edgeColormapNegative?`            | `string`                                                                                                                                      | `undefined`     | [nvmesh.ts:191](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L191) |
| <a id="edgemax"></a> `edgeMax?`                                      | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:195](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L195) |
| <a id="edgemin"></a> `edgeMin?`                                      | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:194](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L194) |
| <a id="edges"></a> `edges?`                                          | `number`[] \| `NVConnectomeEdge`[]                                                                                                            | `undefined`     | [nvmesh.ts:199](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L199) |
| <a id="edgescale"></a> `edgeScale`                                   | `number`                                                                                                                                      | `1`             | [nvmesh.ts:185](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L185) |
| <a id="extentsmax"></a> `extentsMax`                                 | `number` \| `number`[]                                                                                                                        | `undefined`     | [nvmesh.ts:140](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L140) |
| <a id="extentsmin"></a> `extentsMin`                                 | `number` \| `number`[]                                                                                                                        | `undefined`     | [nvmesh.ts:139](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L139) |
| <a id="f32pervertex"></a> `f32PerVertex`                             | `number`                                                                                                                                      | `5`             | [nvmesh.ts:170](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L170) |
| <a id="fibercolor"></a> `fiberColor`                                 | `string`                                                                                                                                      | `'Global'`      | [nvmesh.ts:165](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L165) |
| <a id="fiberdecimationstride"></a> `fiberDecimationStride`           | `number`                                                                                                                                      | `1`             | [nvmesh.ts:166](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L166) |
| <a id="fiberdensity"></a> `fiberDensity?`                            | `Float32Array`                                                                                                                                | `undefined`     | [nvmesh.ts:163](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L163) |
| <a id="fiberdither"></a> `fiberDither`                               | `number`                                                                                                                                      | `0.1`           | [nvmesh.ts:164](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L164) |
| <a id="fibergroupcolormap"></a> `fiberGroupColormap`                 | [`ColorMap`](../../colortables/type-aliases/ColorMap.md)                                                                                      | `null`          | [nvmesh.ts:147](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L147) |
| <a id="fiberlength"></a> `fiberLength?`                              | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:161](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L161) |
| <a id="fiberlengths"></a> `fiberLengths?`                            | `Uint32Array`                                                                                                                                 | `undefined`     | [nvmesh.ts:162](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L162) |
| <a id="fibermask"></a> `fiberMask?`                                  | `unknown`[]                                                                                                                                   | `undefined`     | [nvmesh.ts:172](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L172) |
| <a id="fiberocclusion"></a> `fiberOcclusion`                         | `number`                                                                                                                                      | `0`             | [nvmesh.ts:169](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L169) |
| <a id="fiberradius"></a> `fiberRadius`                               | `number`                                                                                                                                      | `0`             | [nvmesh.ts:168](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L168) |
| <a id="fibersides"></a> `fiberSides`                                 | `number`                                                                                                                                      | `5`             | [nvmesh.ts:167](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L167) |
| <a id="furthestvertexfromorigin"></a> `furthestVertexFromOrigin`     | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:138](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L138) |
| <a id="groups"></a> `groups?`                                        | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [nvmesh.ts:177](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L177) |
| <a id="hasconnectome"></a> `hasConnectome`                           | `boolean`                                                                                                                                     | `false`         | [nvmesh.ts:178](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L178) |
| <a id="id"></a> `id`                                                 | `string`                                                                                                                                      | `undefined`     | [nvmesh.ts:134](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L134) |
| <a id="indexbuffer"></a> `indexBuffer`                               | `WebGLBuffer`                                                                                                                                 | `undefined`     | [nvmesh.ts:149](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L149) |
| <a id="indexcount"></a> `indexCount?`                                | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:182](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L182) |
| <a id="layers"></a> `layers`                                         | [`NVMeshLayer`](../type-aliases/NVMeshLayer.md)[]                                                                                             | `undefined`     | [nvmesh.ts:156](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L156) |
| <a id="legendlinethickness"></a> `legendLineThickness`               | `number`                                                                                                                                      | `0`             | [nvmesh.ts:186](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L186) |
| <a id="meshshaderindex"></a> `meshShaderIndex`                       | `number`                                                                                                                                      | `0`             | [nvmesh.ts:143](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L143) |
| <a id="name"></a> `name`                                             | `string`                                                                                                                                      | `undefined`     | [nvmesh.ts:135](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L135) |
| <a id="nodecolormap"></a> `nodeColormap`                             | `string`                                                                                                                                      | `'warm'`        | [nvmesh.ts:188](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L188) |
| <a id="nodecolormapnegative"></a> `nodeColormapNegative?`            | `string`                                                                                                                                      | `undefined`     | [nvmesh.ts:190](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L190) |
| <a id="nodemaxcolor"></a> `nodeMaxColor?`                            | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:193](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L193) |
| <a id="nodemincolor"></a> `nodeMinColor?`                            | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:192](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L192) |
| <a id="nodes"></a> `nodes?`                                          | \| [`LegacyNodes`](../../types/type-aliases/LegacyNodes.md) \| `NVConnectomeNode`[]                                                           | `undefined`     | [nvmesh.ts:197](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L197) |
| <a id="nodescale"></a> `nodeScale`                                   | `number`                                                                                                                                      | `4`             | [nvmesh.ts:184](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L184) |
| <a id="offsetpt0"></a> `offsetPt0`                                   | `Uint32Array`                                                                                                                                 | `null`          | [nvmesh.ts:144](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L144) |
| <a id="opacity"></a> `opacity`                                       | `number`                                                                                                                                      | `undefined`     | [nvmesh.ts:141](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L141) |
| <a id="points"></a> `points?`                                        | [`Point`](../../types/type-aliases/Point.md)[]                                                                                                | `undefined`     | [nvmesh.ts:201](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L201) |
| <a id="pts"></a> `pts`                                               | `Float32Array`                                                                                                                                | `undefined`     | [nvmesh.ts:154](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L154) |
| <a id="rgba255"></a> `rgba255`                                       | `Uint8Array`                                                                                                                                  | `undefined`     | [nvmesh.ts:160](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L160) |
| <a id="showlegend"></a> `showLegend`                                 | `boolean`                                                                                                                                     | `true`          | [nvmesh.ts:187](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L187) |
| <a id="tris"></a> `tris?`                                            | `Uint32Array`                                                                                                                                 | `undefined`     | [nvmesh.ts:155](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L155) |
| <a id="type"></a> `type`                                             | [`MeshType`](../enumerations/MeshType.md)                                                                                                     | `MeshType.MESH` | [nvmesh.ts:157](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L157) |
| <a id="vao"></a> `vao`                                               | `WebGLVertexArrayObject`                                                                                                                      | `undefined`     | [nvmesh.ts:151](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L151) |
| <a id="vaofiber"></a> `vaoFiber`                                     | `WebGLVertexArrayObject`                                                                                                                      | `undefined`     | [nvmesh.ts:152](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L152) |
| <a id="vertexbuffer"></a> `vertexBuffer`                             | `WebGLBuffer`                                                                                                                                 | `undefined`     | [nvmesh.ts:150](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L150) |
| <a id="vertexcount"></a> `vertexCount`                               | `number`                                                                                                                                      | `1`             | [nvmesh.ts:183](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L183) |
| <a id="visible"></a> `visible`                                       | `boolean`                                                                                                                                     | `undefined`     | [nvmesh.ts:142](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L142) |

## Methods

### blendColormap()

```ts
blendColormap(
   u8: Uint8Array,
   additiveRGBA: Uint8Array,
   layer: NVMeshLayer,
   mn: number,
   mx: number,
   lut: Uint8ClampedArray,
   invert: boolean): void;
```

Defined in: [nvmesh.ts:1085](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1085)

#### Parameters

| Parameter      | Type                                            | Default value |
| -------------- | ----------------------------------------------- | ------------- |
| `u8`           | `Uint8Array`                                    | `undefined`   |
| `additiveRGBA` | `Uint8Array`                                    | `undefined`   |
| `layer`        | [`NVMeshLayer`](../type-aliases/NVMeshLayer.md) | `undefined`   |
| `mn`           | `number`                                        | `undefined`   |
| `mx`           | `number`                                        | `undefined`   |
| `lut`          | `Uint8ClampedArray`                             | `undefined`   |
| `invert`       | `boolean`                                       | `false`       |

#### Returns

`void`

---

### createFiberDensityMap()

```ts
createFiberDensityMap(): void;
```

Defined in: [nvmesh.ts:518](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L518)

#### Returns

`void`

---

### decimateFaces()

```ts
decimateFaces(n: number, ntarget: number): void;
```

Defined in: [nvmesh.ts:1521](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1521)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `n`       | `number` |
| `ntarget` | `number` |

#### Returns

`void`

---

### decimateHierarchicalMesh()

```ts
decimateHierarchicalMesh(gl: WebGL2RenderingContext, order: number): boolean;
```

Defined in: [nvmesh.ts:1555](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1555)

#### Parameters

| Parameter | Type                     | Default value |
| --------- | ------------------------ | ------------- |
| `gl`      | `WebGL2RenderingContext` | `undefined`   |
| `order`   | `number`                 | `4`           |

#### Returns

`boolean`

---

### generatePosNormClr()

```ts
generatePosNormClr(
   pts: Float32Array,
   tris: Uint32Array,
   rgba255: Uint8Array): Float32Array;
```

Defined in: [nvmesh.ts:1629](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1629)

#### Parameters

| Parameter | Type           |
| --------- | -------------- |
| `pts`     | `Float32Array` |
| `tris`    | `Uint32Array`  |
| `rgba255` | `Uint8Array`   |

#### Returns

`Float32Array`

---

### hierarchicalOrder()

```ts
hierarchicalOrder(): number;
```

Defined in: [nvmesh.ts:1488](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1488)

#### Returns

`number`

---

### indexNearestXYZmm()

```ts
indexNearestXYZmm(
   Xmm: number,
   Ymm: number,
   Zmm: number): number[];
```

Defined in: [nvmesh.ts:972](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L972)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `Xmm`     | `number` |
| `Ymm`     | `number` |
| `Zmm`     | `number` |

#### Returns

`number`[]

---

### initValuesArray()

```ts
initValuesArray(va: ValuesArray): ValuesArray;
```

Defined in: [nvmesh.ts:338](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L338)

#### Parameters

| Parameter | Type                                                            |
| --------- | --------------------------------------------------------------- |
| `va`      | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md) |

#### Returns

[`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)

---

### linesToCylinders()

```ts
linesToCylinders(
   gl: WebGL2RenderingContext,
   posClrF32: Float32Array,
   indices: number[]): void;
```

Defined in: [nvmesh.ts:351](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L351)

#### Parameters

| Parameter   | Type                     |
| ----------- | ------------------------ |
| `gl`        | `WebGL2RenderingContext` |
| `posClrF32` | `Float32Array`           |
| `indices`   | `number`[]               |

#### Returns

`void`

---

### loadFromBase64()

```ts
loadFromBase64(__namedParameters: Partial<LoadFromBase64Params>): Promise<NVMesh>;
```

Defined in: [nvmesh.ts:2051](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L2051)

load and return a new NVMesh instance from a base64 encoded string

#### Parameters

| Parameter           | Type                                |
| ------------------- | ----------------------------------- |
| `__namedParameters` | `Partial`\<`LoadFromBase64Params`\> |

#### Returns

`Promise`\<`NVMesh`\>

---

### reverseFaces()

```ts
reverseFaces(gl: WebGL2RenderingContext): void;
```

Defined in: [nvmesh.ts:1472](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1472)

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

#### Returns

`void`

---

### scalars2RGBA()

```ts
scalars2RGBA(
   rgba: Uint8ClampedArray,
   layer: NVMeshLayer,
   scalars: AnyNumberArray,
   isNegativeCmap: boolean): Uint8ClampedArray;
```

Defined in: [nvmesh.ts:1024](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1024)

#### Parameters

| Parameter        | Type                                                                  | Default value |
| ---------------- | --------------------------------------------------------------------- | ------------- |
| `rgba`           | `Uint8ClampedArray`                                                   | `undefined`   |
| `layer`          | [`NVMeshLayer`](../type-aliases/NVMeshLayer.md)                       | `undefined`   |
| `scalars`        | [`AnyNumberArray`](../../nvmesh-types/type-aliases/AnyNumberArray.md) | `undefined`   |
| `isNegativeCmap` | `boolean`                                                             | `false`       |

#### Returns

`Uint8ClampedArray`

---

### setLayerProperty()

```ts
setLayerProperty(
   id: number,
   key: keyof NVMeshLayer,
   val: string | number | boolean,
gl: WebGL2RenderingContext): Promise<void>;
```

Defined in: [nvmesh.ts:1586](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1586)

#### Parameters

| Parameter | Type                                                  |
| --------- | ----------------------------------------------------- |
| `id`      | `number`                                              |
| `key`     | keyof [`NVMeshLayer`](../type-aliases/NVMeshLayer.md) |
| `val`     | `string` \| `number` \| `boolean`                     |
| `gl`      | `WebGL2RenderingContext`                              |

#### Returns

`Promise`\<`void`\>

---

### setProperty()

```ts
setProperty(
   key: keyof NVMesh,
   val:
  | string
  | number
  | boolean
  | number[]
  | ColorMap
  | Float32Array
  | Uint8Array
  | LegacyConnectome,
   gl: WebGL2RenderingContext): void;
```

Defined in: [nvmesh.ts:1614](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1614)

#### Parameters

| Parameter | Type                                                                                                                                                                                                                   |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`     | keyof `NVMesh`                                                                                                                                                                                                         |
| `val`     | \| `string` \| `number` \| `boolean` \| `number`[] \| [`ColorMap`](../../colortables/type-aliases/ColorMap.md) \| `Float32Array` \| `Uint8Array` \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) |
| `gl`      | `WebGL2RenderingContext`                                                                                                                                                                                               |

#### Returns

`void`

---

### unloadMesh()

```ts
unloadMesh(gl: WebGL2RenderingContext): void;
```

Defined in: [nvmesh.ts:993](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L993)

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

#### Returns

`void`

---

### updateFibers()

```ts
updateFibers(gl: WebGL2RenderingContext): void;
```

Defined in: [nvmesh.ts:644](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L644)

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

#### Returns

`void`

---

### updateMesh()

```ts
updateMesh(gl: WebGL2RenderingContext): void;
```

Defined in: [nvmesh.ts:1177](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1177)

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

#### Returns

`void`

---

### loadFromFile()

```ts
static loadFromFile(__namedParameters: Partial<LoadFromFileParams>): Promise<NVMesh>;
```

Defined in: [nvmesh.ts:2024](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L2024)

factory function to load and return a new NVMesh instance from a file in the browser

#### Parameters

| Parameter           | Type                              |
| ------------------- | --------------------------------- |
| `__namedParameters` | `Partial`\<`LoadFromFileParams`\> |

#### Returns

`Promise`\<`NVMesh`\>

NVMesh instance

---

### loadFromUrl()

```ts
static loadFromUrl(__namedParameters: Partial<LoadFromUrlParams>): Promise<NVMesh>;
```

Defined in: [nvmesh.ts:1939](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1939)

factory function to load and return a new NVMesh instance from a given URL

#### Parameters

| Parameter           | Type                                                                     |
| ------------------- | ------------------------------------------------------------------------ |
| `__namedParameters` | `Partial`\<[`LoadFromUrlParams`](../type-aliases/LoadFromUrlParams.md)\> |

#### Returns

`Promise`\<`NVMesh`\>

---

### loadLayer()

```ts
static loadLayer(layer: NVMeshLayer, nvmesh: NVMesh): Promise<void>;
```

Defined in: [nvmesh.ts:1852](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1852)

#### Parameters

| Parameter | Type                                            |
| --------- | ----------------------------------------------- |
| `layer`   | [`NVMeshLayer`](../type-aliases/NVMeshLayer.md) |
| `nvmesh`  | `NVMesh`                                        |

#### Returns

`Promise`\<`void`\>

---

### readFileAsync()

```ts
static readFileAsync(file: Blob): Promise<ArrayBuffer>;
```

Defined in: [nvmesh.ts:2005](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L2005)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `file`    | `Blob` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readMesh()

```ts
static readMesh(
   buffer: ArrayBuffer,
   name: string,
   gl: WebGL2RenderingContext,
   opacity: number,
   rgba255: Uint8Array,
visible: boolean): Promise<NVMesh>;
```

Defined in: [nvmesh.ts:1675](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1675)

#### Parameters

| Parameter | Type                     | Default value |
| --------- | ------------------------ | ------------- |
| `buffer`  | `ArrayBuffer`            | `undefined`   |
| `name`    | `string`                 | `undefined`   |
| `gl`      | `WebGL2RenderingContext` | `undefined`   |
| `opacity` | `number`                 | `1.0`         |
| `rgba255` | `Uint8Array`             | `...`         |
| `visible` | `boolean`                | `true`        |

#### Returns

`Promise`\<`NVMesh`\>
