# Function: transformsEqual()

```ts
function transformsEqual(
  a: AffineTransform,
  b: AffineTransform,
  epsilon: number,
): boolean;
```

Defined in: [nvimage/affineUtils.ts:131](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/affineUtils.ts#L131)

Check if two transforms are approximately equal.

## Parameters

| Parameter | Type                                                  | Default value |
| --------- | ----------------------------------------------------- | ------------- |
| `a`       | [`AffineTransform`](../interfaces/AffineTransform.md) | `undefined`   |
| `b`       | [`AffineTransform`](../interfaces/AffineTransform.md) | `undefined`   |
| `epsilon` | `number`                                              | `0.0001`      |

## Returns

`boolean`
