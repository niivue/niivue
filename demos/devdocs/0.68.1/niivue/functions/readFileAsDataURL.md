# Function: readFileAsDataURL()

```ts
function readFileAsDataURL(entry: FileSystemFileEntry): Promise<string>;
```

Defined in: [niivue/data/FileLoader.ts:294](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L294)

Read a file as a data URL

## Parameters

| Parameter | Type                  | Description                 |
| --------- | --------------------- | --------------------------- |
| `entry`   | `FileSystemFileEntry` | FileSystemFileEntry to read |

## Returns

`Promise`\<`string`\>

Promise resolving to data URL string
