# Interface: ZarrPyramidInfo

Defined in: [nvimage/zarr/ZarrChunkClient.ts:47](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L47)

## Properties

| Property                                  | Type                                        | Description                                                                     | Defined in                                                                                                                               |
| ----------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="axismapping"></a> `axisMapping`    | `AxisMapping`                               | Mapping from spatial to full array coordinates                                  | [nvimage/zarr/ZarrChunkClient.ts:57](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L57) |
| <a id="is3d"></a> `is3D`                  | `boolean`                                   | Whether this is a 3D dataset (based on spatial dimensions)                      | [nvimage/zarr/ZarrChunkClient.ts:53](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L53) |
| <a id="levels"></a> `levels`              | [`ZarrPyramidLevel`](ZarrPyramidLevel.md)[] | Pyramid levels (index 0 = highest resolution)                                   | [nvimage/zarr/ZarrChunkClient.ts:51](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L51) |
| <a id="name"></a> `name`                  | `string`                                    | Name/URL of the zarr store                                                      | [nvimage/zarr/ZarrChunkClient.ts:49](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L49) |
| <a id="ndim"></a> `ndim`                  | `number`                                    | Number of spatial dimensions (2 or 3)                                           | [nvimage/zarr/ZarrChunkClient.ts:55](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L55) |
| <a id="spatialunits"></a> `spatialUnits?` | `string`[]                                  | Units for spatial axes in OME metadata order (e.g., "micrometer", "millimeter") | [nvimage/zarr/ZarrChunkClient.ts:59](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L59) |
