# Type Alias: Scene

```ts
type Scene = object;
```

Defined in: [nvdocument.ts:339](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L339)

## Properties

### \_azimuth?

```ts
optional _azimuth: number;
```

Defined in: [nvdocument.ts:351](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L351)

---

### \_elevation?

```ts
optional _elevation: number;
```

Defined in: [nvdocument.ts:350](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L350)

---

### clipPlane

```ts
clipPlane: number[];
```

Defined in: [nvdocument.ts:347](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L347)

---

### clipPlaneDepthAziElev

```ts
clipPlaneDepthAziElev: number[];
```

Defined in: [nvdocument.ts:348](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L348)

---

### crosshairPos

```ts
crosshairPos: vec3;
```

Defined in: [nvdocument.ts:346](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L346)

---

### gamma?

```ts
optional gamma: number;
```

Defined in: [nvdocument.ts:352](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L352)

---

### onAzimuthElevationChange()

```ts
onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
```

Defined in: [nvdocument.ts:340](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L340)

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

Defined in: [nvdocument.ts:341](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L341)

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

Defined in: [nvdocument.ts:349](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L349)

---

### renderAzimuth

```ts
renderAzimuth: number;
```

Defined in: [nvdocument.ts:343](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L343)

---

### renderElevation

```ts
renderElevation: number;
```

Defined in: [nvdocument.ts:344](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L344)

---

### sceneData

```ts
sceneData: SceneData;
```

Defined in: [nvdocument.ts:342](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L342)

---

### volScaleMultiplier

```ts
volScaleMultiplier: number;
```

Defined in: [nvdocument.ts:345](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L345)
