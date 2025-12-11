# Interface: CustomLoader

Defined in: [niivue/data/FileLoader.ts:39](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L39)

Custom file loader configuration.
The loader function can return either:

- ArrayBuffer for volume data
- MeshLoaderResult for mesh data with positions and indices

## Properties

| Property                     | Type                                                                      | Defined in                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| <a id="loader"></a> `loader` | (`data`: `string` \| `ArrayBuffer` \| `Uint8Array`) => `Promise`\<`any`\> | [niivue/data/FileLoader.ts:41](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L41) |
| <a id="toext"></a> `toExt`   | `string`                                                                  | [niivue/data/FileLoader.ts:42](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L42) |
