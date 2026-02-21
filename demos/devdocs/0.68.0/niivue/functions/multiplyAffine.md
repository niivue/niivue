# Function: multiplyAffine()

```ts
function multiplyAffine(original: number[][], transform: mat4): number[][];
```

Defined in: [nvimage/affineUtils.ts:114](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/affineUtils.ts#L114)

Multiply a transformation matrix by an affine matrix (as 2D array).
Returns the result as a 2D array.

The transform is applied to the left: result = transform \* original
This means the transform happens in world coordinate space.

## Parameters

| Parameter   | Type         |
| ----------- | ------------ |
| `original`  | `number`[][] |
| `transform` | `mat4`       |

## Returns

`number`[][]
