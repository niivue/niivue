# Function: eulerToRotationMatrix()

```ts
function eulerToRotationMatrix(rx: number, ry: number, rz: number): mat4;
```

Defined in: [nvimage/affineUtils.ts:32](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/affineUtils.ts#L32)

Create a rotation matrix from Euler angles (XYZ order).
Angles are in degrees.

## Parameters

| Parameter | Type     |
| --------- | -------- |
| `rx`      | `number` |
| `ry`      | `number` |
| `rz`      | `number` |

## Returns

`mat4`
