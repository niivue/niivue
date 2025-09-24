# Type Alias: Scene

```ts
type Scene = object;
```

Defined in: [nvdocument.ts:396](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L396)

## Properties

### \_azimuth?

```ts
optional _azimuth: number;
```

Defined in: [nvdocument.ts:408](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L408)

---

### \_elevation?

```ts
optional _elevation: number;
```

Defined in: [nvdocument.ts:407](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L407)

---

### clipPlane

```ts
clipPlane: number[];
```

Defined in: [nvdocument.ts:404](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L404)

---

### clipPlaneDepthAziElev

```ts
clipPlaneDepthAziElev: number[];
```

Defined in: [nvdocument.ts:405](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L405)

---

### crosshairPos

```ts
crosshairPos: vec3;
```

Defined in: [nvdocument.ts:403](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L403)

---

### gamma?

```ts
optional gamma: number;
```

Defined in: [nvdocument.ts:409](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L409)

---

### onAzimuthElevationChange()

```ts
onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
```

Defined in: [nvdocument.ts:397](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L397)

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

Defined in: [nvdocument.ts:398](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L398)

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

Defined in: [nvdocument.ts:406](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L406)

---

### renderAzimuth

```ts
renderAzimuth: number;
```

Defined in: [nvdocument.ts:400](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L400)

---

### renderElevation

```ts
renderElevation: number;
```

Defined in: [nvdocument.ts:401](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L401)

---

### sceneData

```ts
sceneData: SceneData;
```

Defined in: [nvdocument.ts:399](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L399)

---

### volScaleMultiplier

```ts
volScaleMultiplier: number;
```

Defined in: [nvdocument.ts:402](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L402)
