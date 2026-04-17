# Class: NVUtilities

Defined in: [nvutilities.ts:240](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L240)

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

Defined in: [nvutilities.ts:241](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L241)

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

Defined in: [nvutilities.ts:631](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L631)

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

Defined in: [nvutilities.ts:359](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L359)

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

Defined in: [nvutilities.ts:452](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L452)

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

Defined in: [nvutilities.ts:540](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L540)

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

Defined in: [nvutilities.ts:556](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L556)

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

Defined in: [nvutilities.ts:471](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L471)

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

Defined in: [nvutilities.ts:246](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L246)

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

Defined in: [nvutilities.ts:626](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L626)

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

Defined in: [nvutilities.ts:460](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L460)

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

Defined in: [nvutilities.ts:260](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L260)

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

Defined in: [nvutilities.ts:430](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L430)

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

Defined in: [nvutilities.ts:561](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L561)

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

Defined in: [nvutilities.ts:643](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L643)

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

Defined in: [nvutilities.ts:439](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L439)

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

Defined in: [nvutilities.ts:265](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L265)

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

Defined in: [nvutilities.ts:655](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L655)

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

Defined in: [nvutilities.ts:578](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L578)

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

Defined in: [nvutilities.ts:484](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L484)

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

Defined in: [nvutilities.ts:377](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L377)

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

Defined in: [nvutilities.ts:672](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvutilities.ts#L672)

#### Parameters

| Parameter | Type       |
| --------- | ---------- |
| `XYZ`     | `number`[] |
| `mtx`     | `mat4`     |

#### Returns

`vec3`
