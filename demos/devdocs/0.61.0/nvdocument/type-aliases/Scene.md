# Type Alias: Scene

```ts
type Scene = object;
```

Defined in: [nvdocument.ts:379](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L379)

## Properties

### \_azimuth?

```ts
optional _azimuth: number;
```

Defined in: [nvdocument.ts:391](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L391)

---

### \_elevation?

```ts
optional _elevation: number;
```

Defined in: [nvdocument.ts:390](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L390)

---

### clipPlane

```ts
clipPlane: number[];
```

Defined in: [nvdocument.ts:387](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L387)

---

### clipPlaneDepthAziElev

```ts
clipPlaneDepthAziElev: number[];
```

Defined in: [nvdocument.ts:388](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L388)

---

### crosshairPos

```ts
crosshairPos: vec3;
```

Defined in: [nvdocument.ts:386](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L386)

---

### gamma?

```ts
optional gamma: number;
```

Defined in: [nvdocument.ts:392](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L392)

---

### onAzimuthElevationChange()

```ts
onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
```

Defined in: [nvdocument.ts:380](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L380)

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

Defined in: [nvdocument.ts:381](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L381)

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

Defined in: [nvdocument.ts:389](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L389)

---

### renderAzimuth

```ts
renderAzimuth: number;
```

Defined in: [nvdocument.ts:383](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L383)

---

### renderElevation

```ts
renderElevation: number;
```

Defined in: [nvdocument.ts:384](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L384)

---

### sceneData

```ts
sceneData: SceneData;
```

Defined in: [nvdocument.ts:382](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L382)

---

### volScaleMultiplier

```ts
volScaleMultiplier: number;
```

Defined in: [nvdocument.ts:385](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L385)
