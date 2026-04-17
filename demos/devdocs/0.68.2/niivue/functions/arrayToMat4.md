# Function: arrayToMat4()

```ts
function arrayToMat4(arr: number[][]): mat4;
```

Defined in: [nvimage/affineUtils.ts:70](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/affineUtils.ts#L70)

Convert a 2D array (row-major, as used by NIfTI) to gl-matrix mat4 (column-major).

## Parameters

| Parameter | Type         |
| --------- | ------------ |
| `arr`     | `number`[][] |

## Returns

`mat4`
