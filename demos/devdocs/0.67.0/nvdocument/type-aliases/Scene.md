# Type Alias: Scene

```ts
type Scene = object;
```

Defined in: [nvdocument.ts:365](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L365)

## Properties

### \_azimuth?

```ts
optional _azimuth: number;
```

Defined in: [nvdocument.ts:378](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L378)

---

### \_elevation?

```ts
optional _elevation: number;
```

Defined in: [nvdocument.ts:377](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L377)

---

### clipPlane

```ts
clipPlane: number[];
```

Defined in: [nvdocument.ts:373](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L373)

---

### clipPlaneDepthAziElevs

```ts
clipPlaneDepthAziElevs: number[][];
```

Defined in: [nvdocument.ts:375](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L375)

---

### clipPlanes

```ts
clipPlanes: number[][];
```

Defined in: [nvdocument.ts:374](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L374)

---

### crosshairPos

```ts
crosshairPos: vec3;
```

Defined in: [nvdocument.ts:372](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L372)

---

### gamma?

```ts
optional gamma: number;
```

Defined in: [nvdocument.ts:379](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L379)

---

### onAzimuthElevationChange()

```ts
onAzimuthElevationChange: (azimuth: number, elevation: number) => void;
```

Defined in: [nvdocument.ts:366](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L366)

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

Defined in: [nvdocument.ts:367](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L367)

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

Defined in: [nvdocument.ts:376](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L376)

---

### renderAzimuth

```ts
renderAzimuth: number;
```

Defined in: [nvdocument.ts:369](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L369)

---

### renderElevation

```ts
renderElevation: number;
```

Defined in: [nvdocument.ts:370](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L370)

---

### sceneData

```ts
sceneData: SceneData;
```

Defined in: [nvdocument.ts:368](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L368)

---

### volScaleMultiplier

```ts
volScaleMultiplier: number;
```

Defined in: [nvdocument.ts:371](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L371)
