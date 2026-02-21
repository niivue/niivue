# Function: getMediaByUrl()

```ts
function getMediaByUrl(
  url: string,
  mediaUrlMap: Map<NVMesh | NVImage, string>,
): NVMesh | NVImage;
```

Defined in: [niivue/data/FileLoader.ts:157](https://github.com/niivue/niivue/blob/main/packages/niivue/src/niivue/data/FileLoader.ts#L157)

Get media (volume or mesh) by URL from a media URL map

## Parameters

| Parameter     | Type                                                                                                               | Description                  |
| ------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `url`         | `string`                                                                                                           | URL to search for            |
| `mediaUrlMap` | `Map`\< \| [`NVMesh`](../../nvmesh/classes/NVMesh.md) \| [`NVImage`](../../nvimage/classes/NVImage.md), `string`\> | Map of media objects to URLs |

## Returns

\| [`NVMesh`](../../nvmesh/classes/NVMesh.md)
\| [`NVImage`](../../nvimage/classes/NVImage.md)

The media object if found, undefined otherwise
