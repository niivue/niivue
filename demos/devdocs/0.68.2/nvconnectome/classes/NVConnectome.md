# Class: NVConnectome

Defined in: [nvconnectome.ts:44](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L44)

Represents a connectome

## Extends

- [`NVMesh`](../../nvmesh/classes/NVMesh.md)

## Constructors

### Constructor

```ts
new NVConnectome(gl: WebGL2RenderingContext, connectome: LegacyConnectome): NVConnectome;
```

Defined in: [nvconnectome.ts:48](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L48)

#### Parameters

| Parameter    | Type                                                               |
| ------------ | ------------------------------------------------------------------ |
| `gl`         | `WebGL2RenderingContext`                                           |
| `connectome` | [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) |

#### Returns

`NVConnectome`

#### Overrides

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`constructor`](../../nvmesh/classes/NVMesh.md#constructor)

## Properties

| Property                                                             | Type                                                                                                                                          | Default value   | Inherited from                                                                                                                       | Defined in                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| <a id="anatomicalstructureprimary"></a> `anatomicalStructurePrimary` | `string`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`anatomicalStructurePrimary`](../../nvmesh/classes/NVMesh.md#anatomicalstructureprimary) | [nvmesh.ts:136](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L136)           |
| <a id="colorbarvisible"></a> `colorbarVisible`                       | `boolean`                                                                                                                                     | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`colorbarVisible`](../../nvmesh/classes/NVMesh.md#colorbarvisible)                       | [nvmesh.ts:137](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L137)           |
| <a id="colormap"></a> `colormap?`                                    | \| `string` \| [`ColorMap`](../../colortables/type-aliases/ColorMap.md) \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`colormap`](../../nvmesh/classes/NVMesh.md#colormap)                                     | [nvmesh.ts:173](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L173)           |
| <a id="colormapinvert"></a> `colormapInvert`                         | `boolean`                                                                                                                                     | `false`         | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`colormapInvert`](../../nvmesh/classes/NVMesh.md#colormapinvert)                         | [nvmesh.ts:146](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L146)           |
| <a id="connectome"></a> `connectome?`                                | \| `string` \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md)                                                             | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`connectome`](../../nvmesh/classes/NVMesh.md#connectome)                                 | [nvmesh.ts:179](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L179)           |
| <a id="data_type"></a> `data_type?`                                  | `string`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`data_type`](../../nvmesh/classes/NVMesh.md#data_type)                                   | [nvmesh.ts:159](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L159)           |
| <a id="dpg"></a> `dpg?`                                              | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`dpg`](../../nvmesh/classes/NVMesh.md#dpg)                                               | [nvmesh.ts:174](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L174)           |
| <a id="dps"></a> `dps?`                                              | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`dps`](../../nvmesh/classes/NVMesh.md#dps)                                               | [nvmesh.ts:175](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L175)           |
| <a id="dpsthreshold"></a> `dpsThreshold`                             | `number`                                                                                                                                      | `NaN`           | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`dpsThreshold`](../../nvmesh/classes/NVMesh.md#dpsthreshold)                             | [nvmesh.ts:171](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L171)           |
| <a id="dpv"></a> `dpv?`                                              | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`dpv`](../../nvmesh/classes/NVMesh.md#dpv)                                               | [nvmesh.ts:176](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L176)           |
| <a id="edgecolormap"></a> `edgeColormap`                             | `string`                                                                                                                                      | `'warm'`        | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`edgeColormap`](../../nvmesh/classes/NVMesh.md#edgecolormap)                             | [nvmesh.ts:189](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L189)           |
| <a id="edgecolormapnegative"></a> `edgeColormapNegative?`            | `string`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`edgeColormapNegative`](../../nvmesh/classes/NVMesh.md#edgecolormapnegative)             | [nvmesh.ts:191](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L191)           |
| <a id="edgemax"></a> `edgeMax?`                                      | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`edgeMax`](../../nvmesh/classes/NVMesh.md#edgemax)                                       | [nvmesh.ts:195](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L195)           |
| <a id="edgemin"></a> `edgeMin?`                                      | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`edgeMin`](../../nvmesh/classes/NVMesh.md#edgemin)                                       | [nvmesh.ts:194](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L194)           |
| <a id="edges"></a> `edges?`                                          | `number`[] \| `NVConnectomeEdge`[]                                                                                                            | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`edges`](../../nvmesh/classes/NVMesh.md#edges)                                           | [nvmesh.ts:199](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L199)           |
| <a id="edgescale"></a> `edgeScale`                                   | `number`                                                                                                                                      | `1`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`edgeScale`](../../nvmesh/classes/NVMesh.md#edgescale)                                   | [nvmesh.ts:185](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L185)           |
| <a id="extentsmax"></a> `extentsMax`                                 | `number` \| `number`[]                                                                                                                        | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`extentsMax`](../../nvmesh/classes/NVMesh.md#extentsmax)                                 | [nvmesh.ts:140](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L140)           |
| <a id="extentsmin"></a> `extentsMin`                                 | `number` \| `number`[]                                                                                                                        | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`extentsMin`](../../nvmesh/classes/NVMesh.md#extentsmin)                                 | [nvmesh.ts:139](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L139)           |
| <a id="f32pervertex"></a> `f32PerVertex`                             | `number`                                                                                                                                      | `5`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`f32PerVertex`](../../nvmesh/classes/NVMesh.md#f32pervertex)                             | [nvmesh.ts:170](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L170)           |
| <a id="fibercolor"></a> `fiberColor`                                 | `string`                                                                                                                                      | `'Global'`      | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberColor`](../../nvmesh/classes/NVMesh.md#fibercolor)                                 | [nvmesh.ts:165](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L165)           |
| <a id="fiberdecimationstride"></a> `fiberDecimationStride`           | `number`                                                                                                                                      | `1`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberDecimationStride`](../../nvmesh/classes/NVMesh.md#fiberdecimationstride)           | [nvmesh.ts:166](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L166)           |
| <a id="fiberdensity"></a> `fiberDensity?`                            | `Float32Array`                                                                                                                                | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberDensity`](../../nvmesh/classes/NVMesh.md#fiberdensity)                             | [nvmesh.ts:163](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L163)           |
| <a id="fiberdither"></a> `fiberDither`                               | `number`                                                                                                                                      | `0.1`           | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberDither`](../../nvmesh/classes/NVMesh.md#fiberdither)                               | [nvmesh.ts:164](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L164)           |
| <a id="fibergroupcolormap"></a> `fiberGroupColormap`                 | [`ColorMap`](../../colortables/type-aliases/ColorMap.md)                                                                                      | `null`          | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberGroupColormap`](../../nvmesh/classes/NVMesh.md#fibergroupcolormap)                 | [nvmesh.ts:147](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L147)           |
| <a id="fiberlength"></a> `fiberLength?`                              | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberLength`](../../nvmesh/classes/NVMesh.md#fiberlength)                               | [nvmesh.ts:161](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L161)           |
| <a id="fiberlengths"></a> `fiberLengths?`                            | `Uint32Array`                                                                                                                                 | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberLengths`](../../nvmesh/classes/NVMesh.md#fiberlengths)                             | [nvmesh.ts:162](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L162)           |
| <a id="fibermask"></a> `fiberMask?`                                  | `unknown`[]                                                                                                                                   | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberMask`](../../nvmesh/classes/NVMesh.md#fibermask)                                   | [nvmesh.ts:172](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L172)           |
| <a id="fiberocclusion"></a> `fiberOcclusion`                         | `number`                                                                                                                                      | `0`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberOcclusion`](../../nvmesh/classes/NVMesh.md#fiberocclusion)                         | [nvmesh.ts:169](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L169)           |
| <a id="fiberradius"></a> `fiberRadius`                               | `number`                                                                                                                                      | `0`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberRadius`](../../nvmesh/classes/NVMesh.md#fiberradius)                               | [nvmesh.ts:168](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L168)           |
| <a id="fibersides"></a> `fiberSides`                                 | `number`                                                                                                                                      | `5`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`fiberSides`](../../nvmesh/classes/NVMesh.md#fibersides)                                 | [nvmesh.ts:167](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L167)           |
| <a id="furthestvertexfromorigin"></a> `furthestVertexFromOrigin`     | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`furthestVertexFromOrigin`](../../nvmesh/classes/NVMesh.md#furthestvertexfromorigin)     | [nvmesh.ts:138](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L138)           |
| <a id="gl"></a> `gl`                                                 | `WebGL2RenderingContext`                                                                                                                      | `undefined`     | -                                                                                                                                    | [nvconnectome.ts:45](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L45) |
| <a id="groups"></a> `groups?`                                        | [`ValuesArray`](../../nvmesh-types/type-aliases/ValuesArray.md)                                                                               | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`groups`](../../nvmesh/classes/NVMesh.md#groups)                                         | [nvmesh.ts:177](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L177)           |
| <a id="hasconnectome"></a> `hasConnectome`                           | `boolean`                                                                                                                                     | `false`         | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`hasConnectome`](../../nvmesh/classes/NVMesh.md#hasconnectome)                           | [nvmesh.ts:178](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L178)           |
| <a id="id"></a> `id`                                                 | `string`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`id`](../../nvmesh/classes/NVMesh.md#id)                                                 | [nvmesh.ts:134](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L134)           |
| <a id="indexbuffer"></a> `indexBuffer`                               | `WebGLBuffer`                                                                                                                                 | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`indexBuffer`](../../nvmesh/classes/NVMesh.md#indexbuffer)                               | [nvmesh.ts:149](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L149)           |
| <a id="indexcount"></a> `indexCount?`                                | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`indexCount`](../../nvmesh/classes/NVMesh.md#indexcount)                                 | [nvmesh.ts:182](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L182)           |
| <a id="layers"></a> `layers`                                         | [`NVMeshLayer`](../../nvmesh/type-aliases/NVMeshLayer.md)[]                                                                                   | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`layers`](../../nvmesh/classes/NVMesh.md#layers)                                         | [nvmesh.ts:156](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L156)           |
| <a id="legendlinethickness"></a> `legendLineThickness`               | `number`                                                                                                                                      | `0`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`legendLineThickness`](../../nvmesh/classes/NVMesh.md#legendlinethickness)               | [nvmesh.ts:186](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L186)           |
| <a id="meshshaderindex"></a> `meshShaderIndex`                       | `number`                                                                                                                                      | `0`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`meshShaderIndex`](../../nvmesh/classes/NVMesh.md#meshshaderindex)                       | [nvmesh.ts:143](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L143)           |
| <a id="name"></a> `name`                                             | `string`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`name`](../../nvmesh/classes/NVMesh.md#name)                                             | [nvmesh.ts:135](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L135)           |
| <a id="nodecolormap"></a> `nodeColormap`                             | `string`                                                                                                                                      | `'warm'`        | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`nodeColormap`](../../nvmesh/classes/NVMesh.md#nodecolormap)                             | [nvmesh.ts:188](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L188)           |
| <a id="nodecolormapnegative"></a> `nodeColormapNegative?`            | `string`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`nodeColormapNegative`](../../nvmesh/classes/NVMesh.md#nodecolormapnegative)             | [nvmesh.ts:190](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L190)           |
| <a id="nodemaxcolor"></a> `nodeMaxColor?`                            | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`nodeMaxColor`](../../nvmesh/classes/NVMesh.md#nodemaxcolor)                             | [nvmesh.ts:193](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L193)           |
| <a id="nodemincolor"></a> `nodeMinColor?`                            | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`nodeMinColor`](../../nvmesh/classes/NVMesh.md#nodemincolor)                             | [nvmesh.ts:192](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L192)           |
| <a id="nodes"></a> `nodes?`                                          | \| [`LegacyNodes`](../../types/type-aliases/LegacyNodes.md) \| `NVConnectomeNode`[]                                                           | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`nodes`](../../nvmesh/classes/NVMesh.md#nodes)                                           | [nvmesh.ts:197](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L197)           |
| <a id="nodescale"></a> `nodeScale`                                   | `number`                                                                                                                                      | `4`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`nodeScale`](../../nvmesh/classes/NVMesh.md#nodescale)                                   | [nvmesh.ts:184](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L184)           |
| <a id="nodeschanged"></a> `nodesChanged`                             | `EventTarget`                                                                                                                                 | `undefined`     | -                                                                                                                                    | [nvconnectome.ts:46](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L46) |
| <a id="offsetpt0"></a> `offsetPt0`                                   | `Uint32Array`                                                                                                                                 | `null`          | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`offsetPt0`](../../nvmesh/classes/NVMesh.md#offsetpt0)                                   | [nvmesh.ts:144](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L144)           |
| <a id="opacity"></a> `opacity`                                       | `number`                                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`opacity`](../../nvmesh/classes/NVMesh.md#opacity)                                       | [nvmesh.ts:141](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L141)           |
| <a id="points"></a> `points?`                                        | [`Point`](../../types/type-aliases/Point.md)[]                                                                                                | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`points`](../../nvmesh/classes/NVMesh.md#points)                                         | [nvmesh.ts:201](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L201)           |
| <a id="pts"></a> `pts`                                               | `Float32Array`                                                                                                                                | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`pts`](../../nvmesh/classes/NVMesh.md#pts)                                               | [nvmesh.ts:154](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L154)           |
| <a id="rgba255"></a> `rgba255`                                       | `Uint8Array`                                                                                                                                  | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`rgba255`](../../nvmesh/classes/NVMesh.md#rgba255)                                       | [nvmesh.ts:160](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L160)           |
| <a id="showlegend"></a> `showLegend`                                 | `boolean`                                                                                                                                     | `true`          | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`showLegend`](../../nvmesh/classes/NVMesh.md#showlegend)                                 | [nvmesh.ts:187](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L187)           |
| <a id="tris"></a> `tris?`                                            | `Uint32Array`                                                                                                                                 | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`tris`](../../nvmesh/classes/NVMesh.md#tris)                                             | [nvmesh.ts:155](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L155)           |
| <a id="type"></a> `type`                                             | [`MeshType`](../../nvmesh/enumerations/MeshType.md)                                                                                           | `MeshType.MESH` | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`type`](../../nvmesh/classes/NVMesh.md#type)                                             | [nvmesh.ts:157](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L157)           |
| <a id="vao"></a> `vao`                                               | `WebGLVertexArrayObject`                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`vao`](../../nvmesh/classes/NVMesh.md#vao)                                               | [nvmesh.ts:151](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L151)           |
| <a id="vaofiber"></a> `vaoFiber`                                     | `WebGLVertexArrayObject`                                                                                                                      | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`vaoFiber`](../../nvmesh/classes/NVMesh.md#vaofiber)                                     | [nvmesh.ts:152](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L152)           |
| <a id="vertexbuffer"></a> `vertexBuffer`                             | `WebGLBuffer`                                                                                                                                 | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`vertexBuffer`](../../nvmesh/classes/NVMesh.md#vertexbuffer)                             | [nvmesh.ts:150](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L150)           |
| <a id="vertexcount"></a> `vertexCount`                               | `number`                                                                                                                                      | `1`             | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`vertexCount`](../../nvmesh/classes/NVMesh.md#vertexcount)                               | [nvmesh.ts:183](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L183)           |
| <a id="visible"></a> `visible`                                       | `boolean`                                                                                                                                     | `undefined`     | [`NVMesh`](../../nvmesh/classes/NVMesh.md).[`visible`](../../nvmesh/classes/NVMesh.md#visible)                                       | [nvmesh.ts:142](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L142)           |

## Methods

### addConnectomeEdge()

```ts
addConnectomeEdge(
   first: number,
   second: number,
   colorValue: number): NVConnectomeEdge;
```

Defined in: [nvconnectome.ts:255](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L255)

#### Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `first`      | `number` |
| `second`     | `number` |
| `colorValue` | `number` |

#### Returns

`NVConnectomeEdge`

---

### addConnectomeNode()

```ts
addConnectomeNode(node: NVConnectomeNode): void;
```

Defined in: [nvconnectome.ts:209](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L209)

#### Parameters

| Parameter | Type               |
| --------- | ------------------ |
| `node`    | `NVConnectomeNode` |

#### Returns

`void`

---

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

| Parameter      | Type                                                      | Default value |
| -------------- | --------------------------------------------------------- | ------------- |
| `u8`           | `Uint8Array`                                              | `undefined`   |
| `additiveRGBA` | `Uint8Array`                                              | `undefined`   |
| `layer`        | [`NVMeshLayer`](../../nvmesh/type-aliases/NVMeshLayer.md) | `undefined`   |
| `mn`           | `number`                                                  | `undefined`   |
| `mx`           | `number`                                                  | `undefined`   |
| `lut`          | `Uint8ClampedArray`                                       | `undefined`   |
| `invert`       | `boolean`                                                 | `false`       |

#### Returns

`void`

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`blendColormap`](../../nvmesh/classes/NVMesh.md#blendcolormap)

---

### createFiberDensityMap()

```ts
createFiberDensityMap(): void;
```

Defined in: [nvmesh.ts:518](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L518)

#### Returns

`void`

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`createFiberDensityMap`](../../nvmesh/classes/NVMesh.md#createfiberdensitymap)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`decimateFaces`](../../nvmesh/classes/NVMesh.md#decimatefaces)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`decimateHierarchicalMesh`](../../nvmesh/classes/NVMesh.md#decimatehierarchicalmesh)

---

### deleteConnectomeEdge()

```ts
deleteConnectomeEdge(first: number, second: number): NVConnectomeEdge;
```

Defined in: [nvconnectome.ts:267](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L267)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `first`   | `number` |
| `second`  | `number` |

#### Returns

`NVConnectomeEdge`

---

### deleteConnectomeNode()

```ts
deleteConnectomeNode(node: NVConnectomeNode): void;
```

Defined in: [nvconnectome.ts:220](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L220)

#### Parameters

| Parameter | Type               |
| --------- | ------------------ |
| `node`    | `NVConnectomeNode` |

#### Returns

`void`

---

### findClosestConnectomeNode()

```ts
findClosestConnectomeNode(point: number[], distance: number): NVConnectomeNode;
```

Defined in: [nvconnectome.ts:280](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L280)

#### Parameters

| Parameter  | Type       |
| ---------- | ---------- |
| `point`    | `number`[] |
| `distance` | `number`   |

#### Returns

`NVConnectomeNode`

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`generatePosNormClr`](../../nvmesh/classes/NVMesh.md#generateposnormclr)

---

### hierarchicalOrder()

```ts
hierarchicalOrder(): number;
```

Defined in: [nvmesh.ts:1488](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1488)

#### Returns

`number`

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`hierarchicalOrder`](../../nvmesh/classes/NVMesh.md#hierarchicalorder)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`indexNearestXYZmm`](../../nvmesh/classes/NVMesh.md#indexnearestxyzmm)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`initValuesArray`](../../nvmesh/classes/NVMesh.md#initvaluesarray)

---

### json()

```ts
json(): Connectome;
```

Defined in: [nvconnectome.ts:435](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L435)

#### Returns

[`Connectome`](../../types/type-aliases/Connectome.md)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`linesToCylinders`](../../nvmesh/classes/NVMesh.md#linestocylinders)

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

`Promise`\<[`NVMesh`](../../nvmesh/classes/NVMesh.md)\>

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`loadFromBase64`](../../nvmesh/classes/NVMesh.md#loadfrombase64)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`reverseFaces`](../../nvmesh/classes/NVMesh.md#reversefaces)

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
| `layer`          | [`NVMeshLayer`](../../nvmesh/type-aliases/NVMeshLayer.md)             | `undefined`   |
| `scalars`        | [`AnyNumberArray`](../../nvmesh-types/type-aliases/AnyNumberArray.md) | `undefined`   |
| `isNegativeCmap` | `boolean`                                                             | `false`       |

#### Returns

`Uint8ClampedArray`

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`scalars2RGBA`](../../nvmesh/classes/NVMesh.md#scalars2rgba)

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

| Parameter | Type                                                            |
| --------- | --------------------------------------------------------------- |
| `id`      | `number`                                                        |
| `key`     | keyof [`NVMeshLayer`](../../nvmesh/type-aliases/NVMeshLayer.md) |
| `val`     | `string` \| `number` \| `boolean`                               |
| `gl`      | `WebGL2RenderingContext`                                        |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`setLayerProperty`](../../nvmesh/classes/NVMesh.md#setlayerproperty)

---

### setProperty()

```ts
setProperty(
   key: keyof NVConnectome,
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
| `key`     | keyof `NVConnectome`                                                                                                                                                                                                   |
| `val`     | \| `string` \| `number` \| `boolean` \| `number`[] \| [`ColorMap`](../../colortables/type-aliases/ColorMap.md) \| `Float32Array` \| `Uint8Array` \| [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) |
| `gl`      | `WebGL2RenderingContext`                                                                                                                                                                                               |

#### Returns

`void`

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`setProperty`](../../nvmesh/classes/NVMesh.md#setproperty)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`unloadMesh`](../../nvmesh/classes/NVMesh.md#unloadmesh)

---

### updateConnectome()

```ts
updateConnectome(gl: WebGL2RenderingContext): void;
```

Defined in: [nvconnectome.ts:301](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L301)

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

#### Returns

`void`

---

### updateConnectomeNodeByIndex()

```ts
updateConnectomeNodeByIndex(index: number, updatedNode: NVConnectomeNode): void;
```

Defined in: [nvconnectome.ts:234](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L234)

#### Parameters

| Parameter     | Type               |
| ------------- | ------------------ |
| `index`       | `number`           |
| `updatedNode` | `NVConnectomeNode` |

#### Returns

`void`

---

### updateConnectomeNodeByPoint()

```ts
updateConnectomeNodeByPoint(point: [number, number, number], updatedNode: NVConnectomeNode): void;
```

Defined in: [nvconnectome.ts:241](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L241)

#### Parameters

| Parameter     | Type                             |
| ------------- | -------------------------------- |
| `point`       | \[`number`, `number`, `number`\] |
| `updatedNode` | `NVConnectomeNode`               |

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`updateFibers`](../../nvmesh/classes/NVMesh.md#updatefibers)

---

### updateLabels()

```ts
updateLabels(): void;
```

Defined in: [nvconnectome.ts:128](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L128)

#### Returns

`void`

---

### updateMesh()

```ts
updateMesh(gl: WebGL2RenderingContext): void;
```

Defined in: [nvconnectome.ts:430](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L430)

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |

#### Returns

`void`

#### Overrides

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`updateMesh`](../../nvmesh/classes/NVMesh.md#updatemesh)

---

### convertFreeSurferConnectome()

```ts
static convertFreeSurferConnectome(json: FreeSurferConnectome, colormap: string): Connectome;
```

Defined in: [nvconnectome.ts:95](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L95)

#### Parameters

| Parameter  | Type                                                              | Default value |
| ---------- | ----------------------------------------------------------------- | ------------- |
| `json`     | [`FreeSurferConnectome`](../type-aliases/FreeSurferConnectome.md) | `undefined`   |
| `colormap` | `string`                                                          | `'warm'`      |

#### Returns

[`Connectome`](../../types/type-aliases/Connectome.md)

---

### convertLegacyConnectome()

```ts
static convertLegacyConnectome(json: LegacyConnectome): Connectome;
```

Defined in: [nvconnectome.ts:61](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L61)

#### Parameters

| Parameter | Type                                                               |
| --------- | ------------------------------------------------------------------ |
| `json`    | [`LegacyConnectome`](../../types/type-aliases/LegacyConnectome.md) |

#### Returns

[`Connectome`](../../types/type-aliases/Connectome.md)

---

### loadConnectomeFromUrl()

```ts
static loadConnectomeFromUrl(gl: WebGL2RenderingContext, url: string): Promise<NVConnectome>;
```

Defined in: [nvconnectome.ts:449](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvconnectome.ts#L449)

Factory method to create connectome from options

#### Parameters

| Parameter | Type                     |
| --------- | ------------------------ |
| `gl`      | `WebGL2RenderingContext` |
| `url`     | `string`                 |

#### Returns

`Promise`\<`NVConnectome`\>

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

`Promise`\<[`NVMesh`](../../nvmesh/classes/NVMesh.md)\>

NVMesh instance

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`loadFromFile`](../../nvmesh/classes/NVMesh.md#loadfromfile)

---

### loadFromUrl()

```ts
static loadFromUrl(__namedParameters: Partial<LoadFromUrlParams>): Promise<NVMesh>;
```

Defined in: [nvmesh.ts:1939](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1939)

factory function to load and return a new NVMesh instance from a given URL

#### Parameters

| Parameter           | Type                                                                               |
| ------------------- | ---------------------------------------------------------------------------------- |
| `__namedParameters` | `Partial`\<[`LoadFromUrlParams`](../../nvmesh/type-aliases/LoadFromUrlParams.md)\> |

#### Returns

`Promise`\<[`NVMesh`](../../nvmesh/classes/NVMesh.md)\>

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`loadFromUrl`](../../nvmesh/classes/NVMesh.md#loadfromurl)

---

### loadLayer()

```ts
static loadLayer(layer: NVMeshLayer, nvmesh: NVMesh): Promise<void>;
```

Defined in: [nvmesh.ts:1852](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L1852)

#### Parameters

| Parameter | Type                                                      |
| --------- | --------------------------------------------------------- |
| `layer`   | [`NVMeshLayer`](../../nvmesh/type-aliases/NVMeshLayer.md) |
| `nvmesh`  | [`NVMesh`](../../nvmesh/classes/NVMesh.md)                |

#### Returns

`Promise`\<`void`\>

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`loadLayer`](../../nvmesh/classes/NVMesh.md#loadlayer)

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

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`readFileAsync`](../../nvmesh/classes/NVMesh.md#readfileasync)

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

`Promise`\<[`NVMesh`](../../nvmesh/classes/NVMesh.md)\>

#### Inherited from

[`NVMesh`](../../nvmesh/classes/NVMesh.md).[`readMesh`](../../nvmesh/classes/NVMesh.md#readmesh)
