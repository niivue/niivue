# Function: NVImageFromUrlOptions()

```ts
function NVImageFromUrlOptions(
  url: string,
  urlImageData: string,
  name: string,
  colormap: string,
  opacity: number,
  cal_min: number,
  cal_max: number,
  trustCalMinMax: boolean,
  percentileFrac: number,
  ignoreZeroVoxels: boolean,
  useQFormNotSForm: boolean,
  colormapNegative: string,
  frame4D: number,
  imageType: ImageType,
  cal_minNeg: number,
  cal_maxNeg: number,
  colorbarVisible: boolean,
  alphaThreshold: boolean,
  colormapLabel: any,
): ImageFromUrlOptions;
```

Defined in: [nvimage/utils.ts:297](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvimage/utils.ts#L297)

## Parameters

| Parameter          | Type                                        | Default value          |
| ------------------ | ------------------------------------------- | ---------------------- |
| `url`              | `string`                                    | `undefined`            |
| `urlImageData`     | `string`                                    | `''`                   |
| `name`             | `string`                                    | `''`                   |
| `colormap`         | `string`                                    | `'gray'`               |
| `opacity`          | `number`                                    | `1.0`                  |
| `cal_min`          | `number`                                    | `NaN`                  |
| `cal_max`          | `number`                                    | `NaN`                  |
| `trustCalMinMax`   | `boolean`                                   | `true`                 |
| `percentileFrac`   | `number`                                    | `0.02`                 |
| `ignoreZeroVoxels` | `boolean`                                   | `false`                |
| `useQFormNotSForm` | `boolean`                                   | `false`                |
| `colormapNegative` | `string`                                    | `''`                   |
| `frame4D`          | `number`                                    | `0`                    |
| `imageType`        | [`ImageType`](../enumerations/ImageType.md) | `NVIMAGE_TYPE.UNKNOWN` |
| `cal_minNeg`       | `number`                                    | `NaN`                  |
| `cal_maxNeg`       | `number`                                    | `NaN`                  |
| `colorbarVisible`  | `boolean`                                   | `true`                 |
| `alphaThreshold`   | `boolean`                                   | `false`                |
| `colormapLabel`    | `any`                                       | `null`                 |

## Returns

[`ImageFromUrlOptions`](../type-aliases/ImageFromUrlOptions.md)
