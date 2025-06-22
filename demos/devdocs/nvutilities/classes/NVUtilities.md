# Class: NVUtilities

Defined in: [nvutilities.ts:250](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L250)

## Constructors

### Constructor

```ts
new NVUtilities(): NVUtilities;
```

#### Returns

`NVUtilities`

## Methods

### arrayBufferToBase64()

```ts
static arrayBufferToBase64(arrayBuffer: ArrayBuffer): string;
```

Defined in: [nvutilities.ts:251](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L251)

#### Parameters

| Parameter     | Type          |
| ------------- | ------------- |
| `arrayBuffer` | `ArrayBuffer` |

#### Returns

`string`

---

### arraysAreEqual()

```ts
static arraysAreEqual(a: unknown[], b: unknown[]): boolean;
```

Defined in: [nvutilities.ts:649](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L649)

#### Parameters

| Parameter | Type        |
| --------- | ----------- |
| `a`       | `unknown`[] |
| `b`       | `unknown`[] |

#### Returns

`boolean`

---

### b64toUint8()

```ts
static b64toUint8(base64: string): Uint8Array;
```

Defined in: [nvutilities.ts:376](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L376)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `base64`  | `string` |

#### Returns

`Uint8Array`

---

### blobToBase64()

```ts
static blobToBase64(blob: Blob): Promise<string>;
```

Defined in: [nvutilities.ts:469](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L469)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `blob`    | `Blob` |

#### Returns

`Promise`\<`string`\>

---

### compress()

```ts
static compress(data: Uint8Array, format: CompressionFormat): Promise<ArrayBuffer>;
```

Defined in: [nvutilities.ts:557](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L557)

#### Parameters

| Parameter | Type                | Default value |
| --------- | ------------------- | ------------- |
| `data`    | `Uint8Array`        | `undefined`   |
| `format`  | `CompressionFormat` | `'gzip'`      |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### compressStringToArrayBuffer()

```ts
static compressStringToArrayBuffer(input: string): Promise<ArrayBuffer>;
```

Defined in: [nvutilities.ts:573](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L573)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `input`   | `string` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### compressToBase64String()

```ts
static compressToBase64String(string: string): Promise<string>;
```

Defined in: [nvutilities.ts:488](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L488)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `string`  | `string` |

#### Returns

`Promise`\<`string`\>

---

### decompress()

```ts
static decompress(data: Uint8Array): Promise<Uint8Array>;
```

Defined in: [nvutilities.ts:256](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L256)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `data`    | `Uint8Array` |

#### Returns

`Promise`\<`Uint8Array`\>

---

### decompressArrayBuffer()

```ts
static decompressArrayBuffer(buffer: ArrayBuffer): Promise<string>;
```

Defined in: [nvutilities.ts:644](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L644)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`Promise`\<`string`\>

---

### decompressBase64String()

```ts
static decompressBase64String(base64: string): Promise<string>;
```

Defined in: [nvutilities.ts:477](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L477)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `base64`  | `string` |

#### Returns

`Promise`\<`string`\>

---

### decompressToBuffer()

```ts
static decompressToBuffer(data: Uint8Array): Promise<ArrayBuffer>;
```

Defined in: [nvutilities.ts:274](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L274)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `data`    | `Uint8Array` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### download()

```ts
static download(
   content: string | ArrayBuffer,
   fileName: string,
   contentType: string): void;
```

Defined in: [nvutilities.ts:447](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L447)

#### Parameters

| Parameter     | Type                      |
| ------------- | ------------------------- |
| `content`     | `string` \| `ArrayBuffer` |
| `fileName`    | `string`                  |
| `contentType` | `string`                  |

#### Returns

`void`

---

### isArrayBufferCompressed()

```ts
static isArrayBufferCompressed(buffer: ArrayBuffer): boolean;
```

Defined in: [nvutilities.ts:578](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L578)

#### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `buffer`  | `ArrayBuffer` |

#### Returns

`boolean`

---

### range()

```ts
static range(
   start: number,
   stop: number,
   step: number): number[];
```

Defined in: [nvutilities.ts:661](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L661)

Generate a pre-filled number array.

#### Parameters

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `start`   | `number` | start value |
| `stop`    | `number` | stop value  |
| `step`    | `number` | step value  |

#### Returns

`number`[]

filled number array

---

### readFileAsync()

```ts
static readFileAsync(file: Blob): Promise<ArrayBuffer>;
```

Defined in: [nvutilities.ts:456](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L456)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `file`    | `Blob` |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### readMatV4()

```ts
static readMatV4(buffer: ArrayBuffer, isReplaceDots: boolean): Promise<Record<string, TypedNumberArray>>;
```

Defined in: [nvutilities.ts:279](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L279)

#### Parameters

| Parameter       | Type          | Default value |
| --------------- | ------------- | ------------- |
| `buffer`        | `ArrayBuffer` | `undefined`   |
| `isReplaceDots` | `boolean`     | `false`       |

#### Returns

`Promise`\<`Record`\<`string`, `TypedNumberArray`\>\>

---

### sph2cartDeg()

```ts
static sph2cartDeg(azimuth: number, elevation: number): number[];
```

Defined in: [nvutilities.ts:673](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L673)

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
xyz = NVUtilities.sph2cartDeg(42, 42);
```

---

### strFromU8()

```ts
static strFromU8(dat: Uint8Array, latin1?: boolean): string;
```

Defined in: [nvutilities.ts:595](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L595)

Converts a Uint8Array to a string (101arrowz/fflate: MIT License)

#### Parameters

| Parameter | Type         | Description                                                                                                        |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `dat`     | `Uint8Array` | The data to decode to string                                                                                       |
| `latin1?` | `boolean`    | Whether or not to interpret the data as Latin-1. This should not need to be true unless encoding to binary string. |

#### Returns

`string`

The original UTF-8/Latin-1 string

---

### strToU8()

```ts
static strToU8(str: string, latin1?: boolean): Uint8Array;
```

Defined in: [nvutilities.ts:501](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L501)

Converts a string into a Uint8Array for use with compression/decompression methods (101arrowz/fflate: MIT License)

#### Parameters

| Parameter | Type      | Description                                                                                                       |
| --------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| `str`     | `string`  | The string to encode                                                                                              |
| `latin1?` | `boolean` | Whether or not to interpret the data as Latin-1. This should not need to be true unless decoding a binary string. |

#### Returns

`Uint8Array`

The string encoded in UTF-8/Latin-1 binary

---

### uint8tob64()

```ts
static uint8tob64(bytes: Uint8Array): string;
```

Defined in: [nvutilities.ts:394](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L394)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `bytes`   | `Uint8Array` |

#### Returns

`string`

---

### vox2mm()

```ts
static vox2mm(XYZ: number[], mtx: mat4): vec3;
```

Defined in: [nvutilities.ts:690](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L690)

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `XYZ`     | `number`[] |
| `mtx`     | `mat4`     |

#### Returns

`vec3`
