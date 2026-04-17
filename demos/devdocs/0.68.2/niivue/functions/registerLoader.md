# Function: registerLoader()

```ts
function registerLoader(params: RegisterLoaderParams): LoaderRegistry;
```

Defined in: [niivue/data/FileLoader.ts:180](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L180)

Register a custom loader for a specific file extension

## Parameters

| Parameter | Type                                                            | Description       |
| --------- | --------------------------------------------------------------- | ----------------- |
| `params`  | [`RegisterLoaderParams`](../interfaces/RegisterLoaderParams.md) | Parameters object |

## Returns

[`LoaderRegistry`](../interfaces/LoaderRegistry.md)

New loader registry with the added loader
