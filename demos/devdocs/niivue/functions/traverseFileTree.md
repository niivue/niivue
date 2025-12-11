# Function: traverseFileTree()

```ts
function traverseFileTree(
  item: FileSystemEntry,
  path: string,
  fileArray: File[],
): Promise<File[]>;
```

Defined in: [niivue/data/FileLoader.ts:217](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L217)

Recursively traverse a file tree and collect all files

## Parameters

| Parameter   | Type              | Default value | Description                 |
| ----------- | ----------------- | ------------- | --------------------------- |
| `item`      | `FileSystemEntry` | `undefined`   | FileSystemEntry to traverse |
| `path`      | `string`          | `''`          | Current path prefix         |
| `fileArray` | `File`[]          | `undefined`   | Array to accumulate files   |

## Returns

`Promise`\<`File`[]\>

Promise resolving to array of files with fullPath and \_webkitRelativePath properties
