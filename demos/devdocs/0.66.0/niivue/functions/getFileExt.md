# Function: getFileExt()

## Call Signature

```ts
function getFileExt(options: GetFileExtOptions): string;
```

Defined in: [niivue/data/FileLoader.ts:103](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L103)

Extracts and normalizes the file extension, handling special cases like .gz and .cbor.

### Parameters

| Parameter | Type                                                      | Description                                             |
| --------- | --------------------------------------------------------- | ------------------------------------------------------- |
| `options` | [`GetFileExtOptions`](../interfaces/GetFileExtOptions.md) | Options containing fullname and optional upperCase flag |

### Returns

`string`

The normalized file extension

## Call Signature

```ts
function getFileExt(fullname: string, upperCase?: boolean): string;
```

Defined in: [niivue/data/FileLoader.ts:110](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L110)

Extracts and normalizes the file extension, handling special cases like .gz and .cbor.

### Parameters

| Parameter    | Type      | Description                                           |
| ------------ | --------- | ----------------------------------------------------- |
| `fullname`   | `string`  | The full filename or path                             |
| `upperCase?` | `boolean` | Whether to return uppercase extension (default: true) |

### Returns

`string`

The normalized file extension
