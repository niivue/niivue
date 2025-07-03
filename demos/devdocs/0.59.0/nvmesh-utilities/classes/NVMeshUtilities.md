# Class: NVMeshUtilities

Defined in: [nvmesh-utilities.ts:12](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L12)

Utilities class for common mesh functions

## Constructors

### Constructor

```ts
new NVMeshUtilities(): NVMeshUtilities;
```

#### Returns

`NVMeshUtilities`

## Methods

### createMZ3()

```ts
static createMZ3(
   vertices: Float32Array,
   indices: Uint32Array,
   compress: boolean,
   colors: Uint8Array): ArrayBuffer;
```

Defined in: [nvmesh-utilities.ts:52](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L52)

#### Parameters

| Parameter  | Type           | Default value |
| ---------- | -------------- | ------------- |
| `vertices` | `Float32Array` | `undefined`   |
| `indices`  | `Uint32Array`  | `undefined`   |
| `compress` | `boolean`      | `false`       |
| `colors`   | `Uint8Array`   | `null`        |

#### Returns

`ArrayBuffer`

---

### createMZ3Async()

```ts
static createMZ3Async(
   vertices: Float32Array,
   indices: Uint32Array,
   compress: boolean,
colors: Uint8Array): Promise<ArrayBuffer>;
```

Defined in: [nvmesh-utilities.ts:99](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L99)

#### Parameters

| Parameter  | Type           | Default value |
| ---------- | -------------- | ------------- |
| `vertices` | `Float32Array` | `undefined`   |
| `indices`  | `Uint32Array`  | `undefined`   |
| `compress` | `boolean`      | `false`       |
| `colors`   | `Uint8Array`   | `null`        |

#### Returns

`Promise`\<`ArrayBuffer`\>

---

### createOBJ()

```ts
static createOBJ(vertices: Float32Array, indices: Uint32Array): ArrayBuffer;
```

Defined in: [nvmesh-utilities.ts:112](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L112)

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `vertices` | `Float32Array` |
| `indices`  | `Uint32Array`  |

#### Returns

`ArrayBuffer`

---

### createSTL()

```ts
static createSTL(vertices: Float32Array, indices: Uint32Array): ArrayBuffer;
```

Defined in: [nvmesh-utilities.ts:131](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L131)

#### Parameters

| Parameter  | Type           |
| ---------- | -------------- |
| `vertices` | `Float32Array` |
| `indices`  | `Uint32Array`  |

#### Returns

`ArrayBuffer`

---

### downloadArrayBuffer()

```ts
static downloadArrayBuffer(buffer: ArrayBuffer, filename: string): void;
```

Defined in: [nvmesh-utilities.ts:177](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L177)

#### Parameters

| Parameter  | Type          |
| ---------- | ------------- |
| `buffer`   | `ArrayBuffer` |
| `filename` | `string`      |

#### Returns

`void`

---

### generateNormals()

```ts
static generateNormals(pts: number[] | Float32Array, tris: number[] | Uint32Array): Float32Array;
```

Defined in: [nvmesh-utilities.ts:261](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L261)

#### Parameters

| Parameter | Type                         |
| --------- | ---------------------------- |
| `pts`     | `number`[] \| `Float32Array` |
| `tris`    | `number`[] \| `Uint32Array`  |

#### Returns

`Float32Array`

---

### getClusterBoundary()

```ts
static getClusterBoundary(rgba8: Uint8Array, faces: number[] | Uint32Array): boolean[];
```

Defined in: [nvmesh-utilities.ts:215](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L215)

#### Parameters

| Parameter | Type                        |
| --------- | --------------------------- |
| `rgba8`   | `Uint8Array`                |
| `faces`   | `number`[] \| `Uint32Array` |

#### Returns

`boolean`[]

---

### getClusterBoundaryU8()

```ts
static getClusterBoundaryU8(u8: Uint8Array, faces: number[] | Uint32Array): boolean[];
```

Defined in: [nvmesh-utilities.ts:13](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L13)

#### Parameters

| Parameter | Type                        |
| --------- | --------------------------- |
| `u8`      | `Uint8Array`                |
| `faces`   | `number`[] \| `Uint32Array` |

#### Returns

`boolean`[]

---

### getExtents()

```ts
static getExtents(pts: number[] | Float32Array): Extents;
```

Defined in: [nvmesh-utilities.ts:239](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L239)

#### Parameters

| Parameter | Type                         |
| --------- | ---------------------------- |
| `pts`     | `number`[] \| `Float32Array` |

#### Returns

`Extents`

---

### gzip()

```ts
static gzip(data: Uint8Array): Promise<Uint8Array>;
```

Defined in: [nvmesh-utilities.ts:41](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L41)

#### Parameters

| Parameter | Type         |
| --------- | ------------ |
| `data`    | `Uint8Array` |

#### Returns

`Promise`\<`Uint8Array`\>

---

### saveMesh()

```ts
static saveMesh(
   vertices: Float32Array,
   indices: Uint32Array,
   filename: string,
compress: boolean): Promise<ArrayBuffer>;
```

Defined in: [nvmesh-utilities.ts:192](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh-utilities.ts#L192)

#### Parameters

| Parameter  | Type           | Default value |
| ---------- | -------------- | ------------- |
| `vertices` | `Float32Array` | `undefined`   |
| `indices`  | `Uint32Array`  | `undefined`   |
| `filename` | `string`       | `'.mz3'`      |
| `compress` | `boolean`      | `false`       |

#### Returns

`Promise`\<`ArrayBuffer`\>
