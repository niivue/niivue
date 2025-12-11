# Class: NVMeshFromUrlOptions

Defined in: [nvmesh.ts:70](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L70)

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

Defined in: [nvmesh.ts:81](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L81)

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
| <a id="colorbarvisible"></a> `colorbarVisible` | `boolean`                                         | [nvmesh.ts:78](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L78) |
| <a id="gl"></a> `gl`                           | `WebGL2RenderingContext`                          | [nvmesh.ts:72](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L72) |
| <a id="layers"></a> `layers`                   | [`NVMeshLayer`](../type-aliases/NVMeshLayer.md)[] | [nvmesh.ts:77](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L77) |
| <a id="meshshaderindex"></a> `meshShaderIndex` | `number`                                          | [nvmesh.ts:79](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L79) |
| <a id="name"></a> `name`                       | `string`                                          | [nvmesh.ts:73](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L73) |
| <a id="opacity"></a> `opacity`                 | `number`                                          | [nvmesh.ts:74](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L74) |
| <a id="rgba255"></a> `rgba255`                 | `Uint8Array`                                      | [nvmesh.ts:75](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L75) |
| <a id="url"></a> `url`                         | `string`                                          | [nvmesh.ts:71](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L71) |
| <a id="visible"></a> `visible`                 | `boolean`                                         | [nvmesh.ts:76](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvmesh.ts#L76) |
