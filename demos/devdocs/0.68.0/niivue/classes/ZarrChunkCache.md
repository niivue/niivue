# Class: ZarrChunkCache

Defined in: [nvimage/zarr/ZarrChunkCache.ts:10](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L10)

## Constructors

### Constructor

```ts
new ZarrChunkCache(maxChunks: number): ZarrChunkCache;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:15](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L15)

#### Parameters

| Parameter   | Type     | Default value |
| ----------- | -------- | ------------- |
| `maxChunks` | `number` | `500`         |

#### Returns

`ZarrChunkCache`

## Accessors

### loadingCount

#### Get Signature

```ts
get loadingCount(): number;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:107](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L107)

Get the number of chunks currently loading

##### Returns

`number`

---

### size

#### Get Signature

```ts
get size(): number;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:100](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L100)

Get the number of cached chunks

##### Returns

`number`

## Methods

### clear()

```ts
clear(): void;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:114](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L114)

Clear the entire cache

#### Returns

`void`

---

### delete()

```ts
delete(key: string): boolean;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:122](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L122)

Delete a specific chunk from cache

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`boolean`

---

### doneLoading()

```ts
doneLoading(key: string): void;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:93](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L93)

Mark a chunk as done loading

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`void`

---

### get()

```ts
get(key: string): TypedArray;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:43](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L43)

Get a chunk from the cache.
Also moves the entry to the end (most recently used).

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`TypedArray`

---

### has()

```ts
has(key: string): boolean;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:35](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L35)

Check if a chunk is in the cache

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`boolean`

---

### isLoading()

```ts
isLoading(key: string): boolean;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:79](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L79)

Check if a chunk is currently being loaded

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`boolean`

---

### keys()

```ts
keys(): IterableIterator<string>;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:130](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L130)

Get all cached keys

#### Returns

`IterableIterator`\<`string`\>

---

### set()

```ts
set(key: string, chunk: TypedArray): void;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:57](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L57)

Store a chunk in the cache.
Evicts oldest entries if capacity is exceeded.

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `key`     | `string`     |
| `chunk`   | `TypedArray` |

#### Returns

`void`

---

### startLoading()

```ts
startLoading(key: string): void;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:86](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L86)

Mark a chunk as loading (to prevent duplicate requests)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `key`     | `string` |

#### Returns

`void`

---

### getKey()

```ts
static getKey(
   name: string,
   level: number,
   x: number,
   y: number,
   z?: number): string;
```

Defined in: [nvimage/zarr/ZarrChunkCache.ts:25](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/ZarrChunkCache.ts#L25)

Generate a unique key for a chunk.
Format: "name:level/x/y" for 2D or "name:level/x/y/z" for 3D

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |
| `level`   | `number` |
| `x`       | `number` |
| `y`       | `number` |
| `z?`      | `number` |

#### Returns

`string`
