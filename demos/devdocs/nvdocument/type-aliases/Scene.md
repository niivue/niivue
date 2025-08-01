# Type Alias: Scene

```ts
type Scene = object;
```

Defined in: [nvdocument.ts:388](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L388)

## Properties

### \_azimuth?

```ts
optional _azimuth: number;
```

Defined in: [nvdocument.ts:400](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L400)

---

### \_elevation?

```ts
optional _elevation: number;
```

Defined in: [nvdocument.ts:399](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L399)

---

### clipPlane

```ts
clipPlane: number[];
```

Defined in: [nvdocument.ts:396](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L396)

---

### clipPlaneDepthAziElev

```ts
clipPlaneDepthAziElev: number[];
```

Defined in: [nvdocument.ts:397](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L397)

---

### crosshairPos

```ts
crosshairPos: vec3;
```

Defined in: [nvdocument.ts:395](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L395)

---

### gamma?

```ts
optional gamma: number;
```

Defined in: [nvdocument.ts:401](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L401)

---

### onAzimuthElevationChange()

```ts
onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
```

Defined in: [nvdocument.ts:389](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L389)

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

Defined in: [nvdocument.ts:390](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L390)

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

Defined in: [nvdocument.ts:398](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L398)

---

### renderAzimuth

```ts
renderAzimuth: number;
```

Defined in: [nvdocument.ts:392](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L392)

---

### renderElevation

```ts
renderElevation: number;
```

Defined in: [nvdocument.ts:393](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L393)

---

### sceneData

```ts
sceneData: SceneData;
```

Defined in: [nvdocument.ts:391](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L391)

---

### volScaleMultiplier

```ts
volScaleMultiplier: number;
```

Defined in: [nvdocument.ts:394](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L394)
