# Class: NVZarrHelper

Defined in: [nvimage/zarr/NVZarrHelper.ts:142](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L142)

## Properties

| Property                                            | Type         | Default value | Defined in                                                                                                                           |
| --------------------------------------------------- | ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| <a id="centeratdragstart"></a> `centerAtDragStart`  | `object`     | `null`        | [nvimage/zarr/NVZarrHelper.ts:183](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L183) |
| `centerAtDragStart.x`                               | `number`     | `undefined`   | [nvimage/zarr/NVZarrHelper.ts:183](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L183) |
| `centerAtDragStart.y`                               | `number`     | `undefined`   | [nvimage/zarr/NVZarrHelper.ts:183](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L183) |
| `centerAtDragStart.z`                               | `number`     | `undefined`   | [nvimage/zarr/NVZarrHelper.ts:183](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L183) |
| <a id="onallchunksloaded"></a> `onAllChunksLoaded?` | () => `void` | `undefined`   | [nvimage/zarr/NVZarrHelper.ts:186](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L186) |
| <a id="onchunksupdated"></a> `onChunksUpdated?`     | () => `void` | `undefined`   | [nvimage/zarr/NVZarrHelper.ts:185](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L185) |

## Methods

### beginDrag()

```ts
beginDrag(): void;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:518](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L518)

#### Returns

`void`

---

### clearCache()

```ts
clearCache(): void;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:1034](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L1034)

#### Returns

`void`

---

### endDrag()

```ts
endDrag(): void;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:522](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L522)

#### Returns

`void`

---

### getLevelDims()

```ts
getLevelDims(): object;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:594](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L594)

#### Returns

`object`

| Name     | Type     | Defined in                                                                                                                           |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `depth`  | `number` | [nvimage/zarr/NVZarrHelper.ts:594](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L594) |
| `height` | `number` | [nvimage/zarr/NVZarrHelper.ts:594](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L594) |
| `width`  | `number` | [nvimage/zarr/NVZarrHelper.ts:594](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L594) |

---

### getPyramidInfo()

```ts
getPyramidInfo(): ZarrPyramidInfo;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:586](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L586)

#### Returns

[`ZarrPyramidInfo`](../interfaces/ZarrPyramidInfo.md)

---

### getPyramidLevel()

```ts
getPyramidLevel(): number;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:590](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L590)

#### Returns

`number`

---

### getViewportState()

```ts
getViewportState(): object;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:577](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L577)

#### Returns

`object`

| Name      | Type     | Defined in                                                                                                                           |
| --------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `centerX` | `number` | [nvimage/zarr/NVZarrHelper.ts:577](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L577) |
| `centerY` | `number` | [nvimage/zarr/NVZarrHelper.ts:577](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L577) |
| `centerZ` | `number` | [nvimage/zarr/NVZarrHelper.ts:577](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L577) |
| `level`   | `number` | [nvimage/zarr/NVZarrHelper.ts:577](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L577) |

---

### getVolumeDims()

```ts
getVolumeDims(): object;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:598](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L598)

#### Returns

`object`

| Name     | Type     | Defined in                                                                                                                           |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `depth`  | `number` | [nvimage/zarr/NVZarrHelper.ts:598](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L598) |
| `height` | `number` | [nvimage/zarr/NVZarrHelper.ts:598](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L598) |
| `width`  | `number` | [nvimage/zarr/NVZarrHelper.ts:598](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L598) |

---

### getWorldOffset()

```ts
getWorldOffset(): [number, number, number];
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:602](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L602)

#### Returns

\[`number`, `number`, `number`\]

---

### loadInitialChunks()

```ts
loadInitialChunks(): Promise<void>;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:269](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L269)

#### Returns

`Promise`\<`void`\>

---

### mmToLevelCoords()

```ts
mmToLevelCoords(
   mmX: number,
   mmY: number,
   mmZ: number): object;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:648](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L648)

Convert physical (mm) coordinates back to real zarr level pixel coordinates.
Inverts the affine: levelPixel = (mm - OME_translation) / scale

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `mmX`     | `number` |
| `mmY`     | `number` |
| `mmZ`     | `number` |

#### Returns

`object`

| Name               | Type     | Defined in                                                                                                                           |
| ------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `depth`            | `number` | [nvimage/zarr/NVZarrHelper.ts:655](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L655) |
| `height`           | `number` | [nvimage/zarr/NVZarrHelper.ts:654](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L654) |
| `level`            | `number` | [nvimage/zarr/NVZarrHelper.ts:656](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L656) |
| `levelDims`        | `object` | [nvimage/zarr/NVZarrHelper.ts:657](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L657) |
| `levelDims.depth`  | `number` | [nvimage/zarr/NVZarrHelper.ts:657](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L657) |
| `levelDims.height` | `number` | [nvimage/zarr/NVZarrHelper.ts:657](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L657) |
| `levelDims.width`  | `number` | [nvimage/zarr/NVZarrHelper.ts:657](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L657) |
| `width`            | `number` | [nvimage/zarr/NVZarrHelper.ts:653](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L653) |

---

### panBy()

```ts
panBy(
   dx: number,
   dy: number,
dz: number): Promise<void>;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:526](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L526)

#### Parameters

| Parameter | Type     | Default value |
| --------- | -------- | ------------- |
| `dx`      | `number` | `undefined`   |
| `dy`      | `number` | `undefined`   |
| `dz`      | `number` | `0`           |

#### Returns

`Promise`\<`void`\>

---

### panTo()

```ts
panTo(
   newCenterX: number,
   newCenterY: number,
newCenterZ?: number): Promise<void>;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:535](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L535)

#### Parameters

| Parameter     | Type     |
| ------------- | -------- |
| `newCenterX`  | `number` |
| `newCenterY`  | `number` |
| `newCenterZ?` | `number` |

#### Returns

`Promise`\<`void`\>

---

### refresh()

```ts
refresh(): Promise<void>;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:1038](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L1038)

#### Returns

`Promise`\<`void`\>

---

### setPyramidLevel()

```ts
setPyramidLevel(level: number): Promise<void>;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:556](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L556)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `level`   | `number` |

#### Returns

`Promise`\<`void`\>

---

### setWorldCenter()

```ts
setWorldCenter(targetMM: [number, number, number]): void;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:611](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L611)

Set the world-space offset so the full level's center maps to targetMM in world space.
Computes the native physical center of the zarr level, then sets worldOffsetMM
so that center aligns with targetMM. Also centers the viewport on the level center.

#### Parameters

| Parameter  | Type                             |
| ---------- | -------------------------------- |
| `targetMM` | \[`number`, `number`, `number`\] |

#### Returns

`void`

---

### create()

```ts
static create(
   hostImage: NVImage,
   url: string,
options: NVZarrHelperOptions): Promise<NVZarrHelper>;
```

Defined in: [nvimage/zarr/NVZarrHelper.ts:208](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/zarr/NVZarrHelper.ts#L208)

#### Parameters

| Parameter   | Type                                                          |
| ----------- | ------------------------------------------------------------- |
| `hostImage` | [`NVImage`](../../nvimage/classes/NVImage.md)                 |
| `url`       | `string`                                                      |
| `options`   | [`NVZarrHelperOptions`](../interfaces/NVZarrHelperOptions.md) |

#### Returns

`Promise`\<`NVZarrHelper`\>
