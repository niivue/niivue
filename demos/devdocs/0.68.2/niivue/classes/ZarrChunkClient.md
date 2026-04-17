# Class: ZarrChunkClient

Defined in: [nvimage/zarr/ZarrChunkClient.ts:92](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L92)

## Constructors

### Constructor

```ts
new ZarrChunkClient(config: ZarrChunkClientConfig): ZarrChunkClient;
```

Defined in: [nvimage/zarr/ZarrChunkClient.ts:101](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L101)

#### Parameters

| Parameter | Type                    |
| --------- | ----------------------- |
| `config`  | `ZarrChunkClientConfig` |

#### Returns

`ZarrChunkClient`

## Methods

### clearArrayCache()

```ts
clearArrayCache(): void;
```

Defined in: [nvimage/zarr/ZarrChunkClient.ts:540](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L540)

Clear cached array references

#### Returns

`void`

---

### fetchChunk()

```ts
fetchChunk(
   level: number,
   x: number,
   y: number,
   z?: number,
   nonSpatialCoords?: Record<string, number>,
signal?: AbortSignal): Promise<TypedArray>;
```

Defined in: [nvimage/zarr/ZarrChunkClient.ts:374](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L374)

Fetch a single chunk by spatial coordinates.
Uses the axis mapping to build full chunk coordinates including non-spatial dims.
Returns the spatial-only decoded TypedArray data.

#### Parameters

| Parameter           | Type                           | Description                                                         |
| ------------------- | ------------------------------ | ------------------------------------------------------------------- |
| `level`             | `number`                       | Pyramid level                                                       |
| `x`                 | `number`                       | Spatial X chunk index                                               |
| `y`                 | `number`                       | Spatial Y chunk index                                               |
| `z?`                | `number`                       | Spatial Z chunk index (for 3D)                                      |
| `nonSpatialCoords?` | `Record`\<`string`, `number`\> | Optional overrides for non-spatial dimensions (e.g., channel index) |
| `signal?`           | `AbortSignal`                  | -                                                                   |

#### Returns

`Promise`\<`TypedArray`\>

---

### fetchChunks()

```ts
fetchChunks(
   name: string,
   level: number,
coords: ChunkCoord[]): Promise<Map<string, TypedArray>>;
```

Defined in: [nvimage/zarr/ZarrChunkClient.ts:442](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L442)

Fetch multiple chunks in parallel.
Returns a Map from chunk key to TypedArray.

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `name`    | `string`                                      |
| `level`   | `number`                                      |
| `coords`  | [`ChunkCoord`](../interfaces/ChunkCoord.md)[] |

#### Returns

`Promise`\<`Map`\<`string`, `TypedArray`\>\>

---

### fetchInfo()

```ts
fetchInfo(): Promise<ZarrPyramidInfo>;
```

Defined in: [nvimage/zarr/ZarrChunkClient.ts:110](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L110)

Discover pyramid structure by reading OME-ZARR multiscales metadata,
or falling back to probing for arrays at /0, /1, /2, etc.

#### Returns

`Promise`\<[`ZarrPyramidInfo`](../interfaces/ZarrPyramidInfo.md)\>

---

### fetchRegion()

```ts
fetchRegion(level: number, region: object): Promise<{
  data: TypedArray;
  shape: number[];
}>;
```

Defined in: [nvimage/zarr/ZarrChunkClient.ts:462](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L462)

Fetch a rectangular region using zarr.get with slices.
Useful for fetching exact viewport regions rather than whole chunks.
Uses axis mapping to handle non-spatial dimensions.

#### Parameters

| Parameter        | Type                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `level`          | `number`                                                                                                                  |
| `region`         | \{ `xEnd`: `number`; `xStart`: `number`; `yEnd`: `number`; `yStart`: `number`; `zEnd?`: `number`; `zStart?`: `number`; \} |
| `region.xEnd`    | `number`                                                                                                                  |
| `region.xStart`  | `number`                                                                                                                  |
| `region.yEnd`    | `number`                                                                                                                  |
| `region.yStart`  | `number`                                                                                                                  |
| `region.zEnd?`   | `number`                                                                                                                  |
| `region.zStart?` | `number`                                                                                                                  |

#### Returns

`Promise`\<\{
`data`: `TypedArray`;
`shape`: `number`[];
\}\>

---

### getUrl()

```ts
getUrl(): string;
```

Defined in: [nvimage/zarr/ZarrChunkClient.ts:533](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkClient.ts#L533)

Get the zarr store URL

#### Returns

`string`
