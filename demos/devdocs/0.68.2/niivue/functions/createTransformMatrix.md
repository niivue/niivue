# Function: createTransformMatrix()

```ts
function createTransformMatrix(transform: AffineTransform): mat4;
```

Defined in: [nvimage/affineUtils.ts:51](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/affineUtils.ts#L51)

Create a 4x4 transformation matrix from decomposed transform components.
Order: Scale -> Rotate -> Translate

## Parameters

| Parameter   | Type                                                  |
| ----------- | ----------------------------------------------------- |
| `transform` | [`AffineTransform`](../interfaces/AffineTransform.md) |

## Returns

`mat4`
