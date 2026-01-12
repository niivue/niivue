# Function: readDirectory()

```ts
function readDirectory(directory: FileSystemDirectoryEntry): FileSystemEntry[];
```

Defined in: [niivue/data/FileLoader.ts:255](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L255)

Read all entries from a directory

## Parameters

| Parameter   | Type                       | Description                      |
| ----------- | -------------------------- | -------------------------------- |
| `directory` | `FileSystemDirectoryEntry` | FileSystemDirectoryEntry to read |

## Returns

`FileSystemEntry`[]

Array of file system entries (accumulated asynchronously)
