# Interface: RegisterLoaderParams

Defined in: [niivue/data/FileLoader.ts:167](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L167)

Parameters for registerLoader

## Properties

| Property                       | Type                                                                      | Defined in                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| <a id="fileext"></a> `fileExt` | `string`                                                                  | [niivue/data/FileLoader.ts:171](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L171) |
| <a id="loader"></a> `loader`   | (`data`: `string` \| `ArrayBuffer` \| `Uint8Array`) => `Promise`\<`any`\> | [niivue/data/FileLoader.ts:170](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L170) |
| <a id="loaders"></a> `loaders` | [`LoaderRegistry`](LoaderRegistry.md)                                     | [niivue/data/FileLoader.ts:168](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L168) |
| <a id="toext"></a> `toExt`     | `string`                                                                  | [niivue/data/FileLoader.ts:172](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L172) |
