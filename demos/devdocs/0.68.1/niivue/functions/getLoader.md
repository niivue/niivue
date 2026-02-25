# Function: getLoader()

```ts
function getLoader(loaders: LoaderRegistry, ext: string): CustomLoader;
```

Defined in: [niivue/data/FileLoader.ts:197](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L197)

Get a loader for a specific file extension

## Parameters

| Parameter | Type                                                | Description               |
| --------- | --------------------------------------------------- | ------------------------- |
| `loaders` | [`LoaderRegistry`](../interfaces/LoaderRegistry.md) | Loader registry           |
| `ext`     | `string`                                            | File extension to look up |

## Returns

[`CustomLoader`](../interfaces/CustomLoader.md)

The loader configuration if found, undefined otherwise
