# Class: NVMeshFromUrlOptions

Defined in: [nvmesh.ts:83](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L83)

## Constructors

### Constructor

```ts
new NVMeshFromUrlOptions(
   url: string,
   gl: any,
   name: string,
   opacity: number,
   rgba255: Uint8Array,
   visible: boolean,
   layers: any[],
   colorbarVisible: boolean,
   meshShaderIndex: number): NVMeshFromUrlOptions;
```

Defined in: [nvmesh.ts:94](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L94)

#### Parameters

| Parameter         | Type         | Default value |
| ----------------- | ------------ | ------------- |
| `url`             | `string`     | `''`          |
| `gl`              | `any`        | `null`        |
| `name`            | `string`     | `''`          |
| `opacity`         | `number`     | `1.0`         |
| `rgba255`         | `Uint8Array` | `...`         |
| `visible`         | `boolean`    | `true`        |
| `layers`          | `any`[]      | `[]`          |
| `colorbarVisible` | `boolean`    | `true`        |
| `meshShaderIndex` | `number`     | `0`           |

#### Returns

`NVMeshFromUrlOptions`

## Properties

| Property                                       | Type                                              | Defined in                                                                                   |
| ---------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| <a id="colorbarvisible"></a> `colorbarVisible` | `boolean`                                         | [nvmesh.ts:91](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L91) |
| <a id="gl"></a> `gl`                           | `WebGL2RenderingContext`                          | [nvmesh.ts:85](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L85) |
| <a id="layers"></a> `layers`                   | [`NVMeshLayer`](../type-aliases/NVMeshLayer.md)[] | [nvmesh.ts:90](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L90) |
| <a id="meshshaderindex"></a> `meshShaderIndex` | `number`                                          | [nvmesh.ts:92](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L92) |
| <a id="name"></a> `name`                       | `string`                                          | [nvmesh.ts:86](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L86) |
| <a id="opacity"></a> `opacity`                 | `number`                                          | [nvmesh.ts:87](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L87) |
| <a id="rgba255"></a> `rgba255`                 | `Uint8Array`                                      | [nvmesh.ts:88](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L88) |
| <a id="url"></a> `url`                         | `string`                                          | [nvmesh.ts:84](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L84) |
| <a id="visible"></a> `visible`                 | `boolean`                                         | [nvmesh.ts:89](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L89) |
