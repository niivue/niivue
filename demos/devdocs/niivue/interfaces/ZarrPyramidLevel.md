# Interface: ZarrPyramidLevel

Defined in: [nvimage/zarr/ZarrChunkClient.ts:15](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L15)

## Properties

| Property                                  | Type       | Description                                                                                        | Defined in                                                                                                                               |
| ----------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| <a id="chunks"></a> `chunks`              | `number`[] | Spatial-only chunk dimensions matching shape order                                                 | [nvimage/zarr/ZarrChunkClient.ts:23](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L23) |
| <a id="dtype"></a> `dtype`                | `string`   | Data type (e.g., "uint8", "uint16", "float32")                                                     | [nvimage/zarr/ZarrChunkClient.ts:25](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L25) |
| <a id="index"></a> `index`                | `number`   | Level index (0 = highest resolution)                                                               | [nvimage/zarr/ZarrChunkClient.ts:17](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L17) |
| <a id="path"></a> `path`                  | `string`   | Path to this level in the zarr hierarchy (e.g., "/0", "/1")                                        | [nvimage/zarr/ZarrChunkClient.ts:19](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L19) |
| <a id="scales"></a> `scales?`             | `number`[] | Physical scale factors per spatial axis in OME metadata order from coordinateTransformations       | [nvimage/zarr/ZarrChunkClient.ts:27](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L27) |
| <a id="shape"></a> `shape`                | `number`[] | Spatial-only shape in OME metadata order (non-spatial dims stripped)                               | [nvimage/zarr/ZarrChunkClient.ts:21](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L21) |
| <a id="translations"></a> `translations?` | `number`[] | Physical translation offsets per spatial axis in OME metadata order from coordinateTransformations | [nvimage/zarr/ZarrChunkClient.ts:29](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L29) |
