# Type Alias: Scene

```ts
type Scene = object;
```

Defined in: [nvdocument.ts:373](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L373)

## Properties

### \_azimuth?

```ts
optional _azimuth: number;
```

Defined in: [nvdocument.ts:386](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L386)

---

### \_elevation?

```ts
optional _elevation: number;
```

Defined in: [nvdocument.ts:385](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L385)

---

### clipPlane

```ts
clipPlane: number[];
```

Defined in: [nvdocument.ts:381](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L381)

---

### clipPlaneDepthAziElevs

```ts
clipPlaneDepthAziElevs: number[][];
```

Defined in: [nvdocument.ts:383](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L383)

---

### clipPlanes

```ts
clipPlanes: number[][];
```

Defined in: [nvdocument.ts:382](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L382)

---

### crosshairPos

```ts
crosshairPos: vec3;
```

Defined in: [nvdocument.ts:380](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L380)

---

### gamma?

```ts
optional gamma: number;
```

Defined in: [nvdocument.ts:387](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L387)

---

### onAzimuthElevationChange()

```ts
onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
```

Defined in: [nvdocument.ts:374](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L374)

#### Parameters

| Parameter   | Type     |
| ----------- | -------- |
| `azimuth`   | `number` |
| `elevation` | `number` |

#### Returns

`void`

---

### onZoom3DChange()

```ts
onZoom3DChange: (scale: number) => void;
```

Defined in: [nvdocument.ts:375](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L375)

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `scale`   | `number` |

#### Returns

`void`

---

### pan2Dxyzmm

```ts
pan2Dxyzmm: vec4;
```

Defined in: [nvdocument.ts:384](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L384)

---

### renderAzimuth

```ts
renderAzimuth: number;
```

Defined in: [nvdocument.ts:377](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L377)

---

### renderElevation

```ts
renderElevation: number;
```

Defined in: [nvdocument.ts:378](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L378)

---

### sceneData

```ts
sceneData: SceneData;
```

Defined in: [nvdocument.ts:376](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L376)

---

### volScaleMultiplier

```ts
volScaleMultiplier: number;
```

Defined in: [nvdocument.ts:379](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L379)
