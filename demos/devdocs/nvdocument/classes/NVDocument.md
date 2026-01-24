# Class: NVDocument

Defined in: [nvdocument.ts:441](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L441)

NVDocument class (main)

## Constructors

### Constructor

```ts
new NVDocument(): NVDocument;
```

Defined in: [nvdocument.ts:467](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L467)

#### Returns

`NVDocument`

## Properties

| Property                                                   | Type                                                                                                               | Default value | Defined in                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------ |
| <a id="completedangles"></a> `completedAngles`             | [`CompletedAngle`](../interfaces/CompletedAngle.md)[]                                                              | `[]`          | [nvdocument.ts:462](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L462) |
| <a id="completedmeasurements"></a> `completedMeasurements` | [`CompletedMeasurement`](../interfaces/CompletedMeasurement.md)[]                                                  | `[]`          | [nvdocument.ts:461](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L461) |
| <a id="data"></a> `data`                                   | [`DocumentData`](../type-aliases/DocumentData.md)                                                                  | `undefined`   | [nvdocument.ts:442](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L442) |
| <a id="drawbitmap"></a> `drawBitmap`                       | `Uint8Array`                                                                                                       | `null`        | [nvdocument.ts:458](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L458) |
| <a id="imageoptionsmap"></a> `imageOptionsMap`             | `Map`\<`any`, `any`\>                                                                                              | `undefined`   | [nvdocument.ts:459](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L459) |
| <a id="meshdataobjects"></a> `meshDataObjects?`            | ( \| [`NVMesh`](../../nvmesh/classes/NVMesh.md) \| [`NVConnectome`](../../nvconnectome/classes/NVConnectome.md))[] | `undefined`   | [nvdocument.ts:456](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L456) |
| <a id="meshes"></a> `meshes`                               | ( \| [`NVMesh`](../../nvmesh/classes/NVMesh.md) \| [`NVConnectome`](../../nvconnectome/classes/NVConnectome.md))[] | `[]`          | [nvdocument.ts:457](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L457) |
| <a id="meshoptionsmap"></a> `meshOptionsMap`               | `Map`\<`any`, `any`\>                                                                                              | `undefined`   | [nvdocument.ts:460](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L460) |
| <a id="scene"></a> `scene`                                 | [`Scene`](../type-aliases/Scene.md)                                                                                | `undefined`   | [nvdocument.ts:453](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L453) |
| <a id="volumes"></a> `volumes`                             | [`NVImage`](../../nvimage/classes/NVImage.md)[]                                                                    | `[]`          | [nvdocument.ts:455](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L455) |

## Accessors

### customData

#### Get Signature

```ts
get customData(): string;
```

Defined in: [nvdocument.ts:631](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L631)

##### Returns

`string`

#### Set Signature

```ts
set customData(data: string): void;
```

Defined in: [nvdocument.ts:635](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L635)

##### Parameters

| Parameter | Type     |
| --------- | -------- |
| `data`    | `string` |

##### Returns

`void`

---

### encodedDrawingBlob

#### Get Signature

```ts
get encodedDrawingBlob(): string;
```

Defined in: [nvdocument.ts:595](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L595)

Gets the base 64 encoded blob of the associated drawing

##### Returns

`string`

---

### encodedImageBlobs

#### Get Signature

```ts
get encodedImageBlobs(): string[];
```

Defined in: [nvdocument.ts:588](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L588)

Gets the base 64 encoded blobs of associated images

##### Returns

`string`[]

---

### imageOptionsArray

#### Get Signature

```ts
get imageOptionsArray(): ImageFromUrlOptions[];
```

Defined in: [nvdocument.ts:581](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L581)

##### Returns

[`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[]

---

### labels

#### Get Signature

```ts
get labels(): NVLabel3D[];
```

Defined in: [nvdocument.ts:620](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L620)

Gets the 3D labels of the Niivue instance

##### Returns

`NVLabel3D`[]

#### Set Signature

```ts
set labels(labels: NVLabel3D[]): void;
```

Defined in: [nvdocument.ts:627](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L627)

Sets the 3D labels of the Niivue instance

##### Parameters

| Parameter | Type          |
| --------- | ------------- |
| `labels`  | `NVLabel3D`[] |

##### Returns

`void`

---

### opts

#### Get Signature

```ts
get opts(): NVConfigOptions;
```

Defined in: [nvdocument.ts:602](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L602)

Gets the options of the Niivue instance

##### Returns

[`NVConfigOptions`](../type-aliases/NVConfigOptions.md)

#### Set Signature

```ts
set opts(opts: NVConfigOptions): void;
```

Defined in: [nvdocument.ts:612](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L612)

Sets the options of the Niivue instance

##### Parameters

| Parameter | Type                                                    |
| --------- | ------------------------------------------------------- |
| `opts`    | [`NVConfigOptions`](../type-aliases/NVConfigOptions.md) |

##### Returns

`void`

---

### previewImageDataURL

#### Get Signature

```ts
get previewImageDataURL(): string;
```

Defined in: [nvdocument.ts:562](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L562)

Gets preview image blob

##### Returns

`string`

dataURL of preview image

#### Set Signature

```ts
set previewImageDataURL(dataURL: string): void;
```

Defined in: [nvdocument.ts:570](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L570)

Sets preview image blob

##### Parameters

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `dataURL` | `string` | encoded preview image |

##### Returns

`void`

---

### title

#### Get Signature

```ts
get title(): string;
```

Defined in: [nvdocument.ts:554](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L554)

Title of the document

##### Returns

`string`

#### Set Signature

```ts
set title(title: string): void;
```

Defined in: [nvdocument.ts:577](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L577)

##### Parameters

| Parameter | Type     | Description       |
| --------- | -------- | ----------------- |
| `title`   | `string` | title of document |

##### Returns

`void`

## Methods

### addImageOptions()

```ts
addImageOptions(image: NVImage, imageOptions: ImageFromUrlOptions): void;
```

Defined in: [nvdocument.ts:656](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L656)

Adds an image and the options an image was created with

#### Parameters

| Parameter      | Type                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| `image`        | [`NVImage`](../../nvimage/classes/NVImage.md)                              |
| `imageOptions` | [`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md) |

#### Returns

`void`

---

### download()

```ts
download(
   fileName: string,
   compress: boolean,
opts: object): Promise<void>;
```

Defined in: [nvdocument.ts:746](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L746)

#### Parameters

| Parameter          | Type                            |
| ------------------ | ------------------------------- |
| `fileName`         | `string`                        |
| `compress`         | `boolean`                       |
| `opts`             | \{ `embedImages`: `boolean`; \} |
| `opts.embedImages` | `boolean`                       |

#### Returns

`Promise`\<`void`\>

---

### fetchLinkedData()

```ts
fetchLinkedData(): Promise<void>;
```

Defined in: [nvdocument.ts:700](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L700)

Fetch any image data that is missing from this document.

#### Returns

`Promise`\<`void`\>

---

### getImageOptions()

```ts
getImageOptions(image: NVImage): ImageFromUrlOptions;
```

Defined in: [nvdocument.ts:733](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L733)

Returns the options for the image if it was added by url

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `image`   | [`NVImage`](../../nvimage/classes/NVImage.md) |

#### Returns

[`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)

---

### hasImage()

```ts
hasImage(image: NVImage): boolean;
```

Defined in: [nvdocument.ts:642](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L642)

Checks if document has an image by id

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `image`   | [`NVImage`](../../nvimage/classes/NVImage.md) |

#### Returns

`boolean`

---

### hasImageFromUrl()

```ts
hasImageFromUrl(url: string): boolean;
```

Defined in: [nvdocument.ts:649](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L649)

Checks if document has an image by url

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `url`     | `string` |

#### Returns

`boolean`

---

### json()

```ts
json(embedImages: boolean, embedDrawing: boolean): ExportDocumentData;
```

Defined in: [nvdocument.ts:740](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L740)

Serialise the document by delegating to NVSerializer.

#### Parameters

| Parameter      | Type      | Default value |
| -------------- | --------- | ------------- |
| `embedImages`  | `boolean` | `true`        |
| `embedDrawing` | `boolean` | `true`        |

#### Returns

[`ExportDocumentData`](../type-aliases/ExportDocumentData.md)

---

### removeImage()

```ts
removeImage(image: NVImage): void;
```

Defined in: [nvdocument.ts:686](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L686)

Removes image from the document as well as its options

#### Parameters

| Parameter | Type                                          |
| --------- | --------------------------------------------- |
| `image`   | [`NVImage`](../../nvimage/classes/NVImage.md) |

#### Returns

`void`

---

### removeOptsChangeCallback()

```ts
removeOptsChangeCallback(): void;
```

Defined in: [nvdocument.ts:809](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L809)

Removes the opts change callback

#### Returns

`void`

---

### setOptsChangeCallback()

```ts
setOptsChangeCallback(callback: (propertyName: keyof NVConfigOptions, newValue:
  | string
  | number
  | boolean
  | number[]
  | Float32Array
  | number[]
  | MouseEventConfig
  | TouchEventConfig
  | [[number, number], [number, number]], oldValue:
  | string
  | number
  | boolean
  | number[]
  | Float32Array
  | number[]
  | MouseEventConfig
  | TouchEventConfig
  | [[number, number], [number, number]]) => void): void;
```

Defined in: [nvdocument.ts:801](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L801)

Sets the callback function to be called when opts properties change

#### Parameters

| Parameter  | Type                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `callback` | (`propertyName`: keyof [`NVConfigOptions`](../type-aliases/NVConfigOptions.md), `newValue`: \| `string` \| `number` \| `boolean` \| `number`[] \| `Float32Array` \| `number`[] \| [`MouseEventConfig`](../interfaces/MouseEventConfig.md) \| [`TouchEventConfig`](../interfaces/TouchEventConfig.md) \| \[\[`number`, `number`\], \[`number`, `number`\]\], `oldValue`: \| `string` \| `number` \| `boolean` \| `number`[] \| `Float32Array` \| `number`[] \| [`MouseEventConfig`](../interfaces/MouseEventConfig.md) \| [`TouchEventConfig`](../interfaces/TouchEventConfig.md) \| \[\[`number`, `number`\], \[`number`, `number`\]\]) => `void` |

#### Returns

`void`

---

### loadFromFile()

```ts
static loadFromFile(file: Blob): Promise<NVDocument>;
```

Defined in: [nvdocument.ts:774](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L774)

#### Parameters

| Parameter | Type   |
| --------- | ------ |
| `file`    | `Blob` |

#### Returns

`Promise`\<`NVDocument`\>

---

### loadFromJSON()

```ts
static loadFromJSON(data: DocumentData): Promise<NVDocument>;
```

Defined in: [nvdocument.ts:794](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L794)

Factory method to return an instance of NVDocument from JSON.
Delegates the main parsing to NVSerializer, then applies NVDocument-specific
post-processing (opts decode, scene defaults, clone measurements/angles).

#### Parameters

| Parameter | Type                                              |
| --------- | ------------------------------------------------- |
| `data`    | [`DocumentData`](../type-aliases/DocumentData.md) |

#### Returns

`Promise`\<`NVDocument`\>

---

### loadFromUrl()

```ts
static loadFromUrl(url: string): Promise<NVDocument>;
```

Defined in: [nvdocument.ts:758](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L758)

Factory method to return an instance of NVDocument from a URL

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `url`     | `string` |

#### Returns

`Promise`\<`NVDocument`\>
