# Type Alias: Scene

```ts
type Scene = object;
```

Defined in: [nvdocument.ts:347](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L347)

## Properties

### \_azimuth?

```ts
optional _azimuth: number;
```

Defined in: [nvdocument.ts:359](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L359)

---

### \_elevation?

```ts
optional _elevation: number;
```

Defined in: [nvdocument.ts:358](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L358)

---

### clipPlane

```ts
clipPlane: number[];
```

Defined in: [nvdocument.ts:355](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L355)

---

### clipPlaneDepthAziElev

```ts
clipPlaneDepthAziElev: number[];
```

Defined in: [nvdocument.ts:356](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L356)

---

### crosshairPos

```ts
crosshairPos: vec3;
```

Defined in: [nvdocument.ts:354](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L354)

---

### gamma?

```ts
optional gamma: number;
```

Defined in: [nvdocument.ts:360](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L360)

---

### onAzimuthElevationChange()

```ts
onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
```

Defined in: [nvdocument.ts:348](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L348)

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

Defined in: [nvdocument.ts:349](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L349)

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

Defined in: [nvdocument.ts:357](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L357)

---

### renderAzimuth

```ts
renderAzimuth: number;
```

Defined in: [nvdocument.ts:351](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L351)

---

### renderElevation

```ts
renderElevation: number;
```

Defined in: [nvdocument.ts:352](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L352)

---

### sceneData

```ts
sceneData: SceneData;
```

Defined in: [nvdocument.ts:350](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L350)

---

### volScaleMultiplier

```ts
volScaleMultiplier: number;
```

Defined in: [nvdocument.ts:353](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L353)
