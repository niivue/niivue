# Function: hdrToArrayBuffer()

```ts
function hdrToArrayBuffer(
  hdr: NiftiHeader,
  isDrawing8: boolean,
  isInputEndian: boolean,
): Uint8Array;
```

Defined in: [nvimage/utils.ts:415](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/utils.ts#L415)

## Parameters

| Parameter       | Type                                                     | Default value |
| --------------- | -------------------------------------------------------- | ------------- |
| `hdr`           | [`NiftiHeader`](../../types/type-aliases/NiftiHeader.md) | `undefined`   |
| `isDrawing8`    | `boolean`                                                | `false`       |
| `isInputEndian` | `boolean`                                                | `false`       |

## Returns

`Uint8Array`
