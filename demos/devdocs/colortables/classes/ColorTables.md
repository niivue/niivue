# Class: ColorTables

Defined in: [colortables.ts:23](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L23)

## Constructors

### Constructor

```ts
new ColorTables(): ColorTables;
```

Defined in: [colortables.ts:31](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L31)

Sets cluts to alphabetically sorted cmaps

#### Returns

`ColorTables`

## Properties

| Property                       | Type                                                            | Default value | Defined in                                                                                             |
| ------------------------------ | --------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| <a id="cluts"></a> `cluts`     | `Record`\<`string`, [`ColorMap`](../type-aliases/ColorMap.md)\> | `{}`          | [colortables.ts:26](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L26) |
| <a id="gamma"></a> `gamma`     | `number`                                                        | `1.0`         | [colortables.ts:24](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L24) |
| <a id="version"></a> `version` | `number`                                                        | `0.1`         | [colortables.ts:25](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L25) |

## Methods

### addColormap()

```ts
addColormap(key: string, cmap: ColorMap): void;
```

Defined in: [colortables.ts:43](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L43)

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

Defined in: [colortables.ts:83](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L83)

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

Defined in: [colortables.ts:57](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L57)

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

Defined in: [colortables.ts:47](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L47)

#### Returns

`string`[]

---

### colorMaps()

```ts
colorMaps(): string[];
```

Defined in: [colortables.ts:52](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L52)

#### Returns

`string`[]

---

### makeDrawLut()

```ts
makeDrawLut(name: string | ColorMap): LUT;
```

Defined in: [colortables.ts:152](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L152)

#### Parameters

| Parameter | Type                                                  |
| --------- | ----------------------------------------------------- |
| `name`    | `string` \| [`ColorMap`](../type-aliases/ColorMap.md) |

#### Returns

[`LUT`](../type-aliases/LUT.md)

---

### makeLabelLut()

```ts
makeLabelLut(cm: ColorMap, alphaFill: number): LUT;
```

Defined in: [colortables.ts:88](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L88)

#### Parameters

| Parameter   | Type                                      | Default value |
| ----------- | ----------------------------------------- | ------------- |
| `cm`        | [`ColorMap`](../type-aliases/ColorMap.md) | `undefined`   |
| `alphaFill` | `number`                                  | `255`         |

#### Returns

[`LUT`](../type-aliases/LUT.md)

---

### makeLabelLutFromUrl()

```ts
makeLabelLutFromUrl(name: string): Promise<LUT>;
```

Defined in: [colortables.ts:144](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L144)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

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

Defined in: [colortables.ts:205](https://github.com/niivue/niivue/blob/main/packages/niivue/src/colortables.ts#L205)

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
