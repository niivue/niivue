# Class: ColorTables

Defined in: [colortables.ts:29](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L29)

## Constructors

### Constructor

```ts
new ColorTables(): ColorTables;
```

Defined in: [colortables.ts:37](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L37)

Sets cluts to alphabetically sorted cmaps

#### Returns

`ColorTables`

## Properties

| Property                       | Type                                                            | Default value | Defined in                                                                                             |
| ------------------------------ | --------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| <a id="cluts"></a> `cluts`     | `Record`\<`string`, [`ColorMap`](../type-aliases/ColorMap.md)\> | `{}`          | [colortables.ts:32](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L32) |
| <a id="gamma"></a> `gamma`     | `number`                                                        | `1.0`         | [colortables.ts:30](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L30) |
| <a id="version"></a> `version` | `number`                                                        | `0.1`         | [colortables.ts:31](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L31) |

## Methods

### addColormap()

```ts
addColormap(key: string, cmap: ColorMap): void;
```

Defined in: [colortables.ts:49](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L49)

#### Parameters

| Parameter | Type                                      |
| --------- | ----------------------------------------- |
| `key`     | `string`                                  |
| `cmap`    | [`ColorMap`](../type-aliases/ColorMap.md) |

#### Returns

`void`

---

### colormap()

```ts
colormap(key: string, isInvert: boolean): Uint8ClampedArray;
```

Defined in: [colortables.ts:89](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L89)

#### Parameters

| Parameter  | Type      | Default value |
| ---------- | --------- | ------------- |
| `key`      | `string`  | `''`          |
| `isInvert` | `boolean` | `false`       |

#### Returns

`Uint8ClampedArray`

---

### colormapFromKey()

```ts
colormapFromKey(name: string): ColorMap;
```

Defined in: [colortables.ts:63](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L63)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

#### Returns

[`ColorMap`](../type-aliases/ColorMap.md)

---

### colormaps()

```ts
colormaps(): string[];
```

Defined in: [colortables.ts:53](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L53)

#### Returns

`string`[]

---

### colorMaps()

```ts
colorMaps(): string[];
```

Defined in: [colortables.ts:58](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L58)

#### Returns

`string`[]

---

### makeDrawLut()

```ts
makeDrawLut(name: string | ColorMap): LUT;
```

Defined in: [colortables.ts:168](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L168)

#### Parameters

| Parameter | Type                                                  |
| --------- | ----------------------------------------------------- |
| `name`    | `string` \| [`ColorMap`](../type-aliases/ColorMap.md) |

#### Returns

[`LUT`](../type-aliases/LUT.md)

---

### makeLabelLut()

```ts
makeLabelLut(
   cm: ColorMap,
   alphaFill: number,
   maxIdx: number): LUT;
```

Defined in: [colortables.ts:94](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L94)

#### Parameters

| Parameter   | Type                                      | Default value |
| ----------- | ----------------------------------------- | ------------- |
| `cm`        | [`ColorMap`](../type-aliases/ColorMap.md) | `undefined`   |
| `alphaFill` | `number`                                  | `255`         |
| `maxIdx`    | `number`                                  | `Infinity`    |

#### Returns

[`LUT`](../type-aliases/LUT.md)

---

### makeLabelLutFromUrl()

```ts
makeLabelLutFromUrl(
   name: string,
   alphaFill: number,
maxIdx: number): Promise<LUT>;
```

Defined in: [colortables.ts:160](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L160)

#### Parameters

| Parameter   | Type     | Default value |
| ----------- | -------- | ------------- |
| `name`      | `string` | `undefined`   |
| `alphaFill` | `number` | `255`         |
| `maxIdx`    | `number` | `Infinity`    |

#### Returns

`Promise`\<[`LUT`](../type-aliases/LUT.md)\>

---

### makeLut()

```ts
makeLut(
   Rsi: number[],
   Gsi: number[],
   Bsi: number[],
   Asi: number[],
   Isi: number[],
   isInvert: boolean): Uint8ClampedArray;
```

Defined in: [colortables.ts:214](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L214)

#### Parameters

| Parameter  | Type       |
| ---------- | ---------- |
| `Rsi`      | `number`[] |
| `Gsi`      | `number`[] |
| `Bsi`      | `number`[] |
| `Asi`      | `number`[] |
| `Isi`      | `number`[] |
| `isInvert` | `boolean`  |

#### Returns

`Uint8ClampedArray`
