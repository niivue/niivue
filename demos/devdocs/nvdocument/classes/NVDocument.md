# Class: NVDocument

Defined in: [nvdocument.ts:454](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L454)

NVDocument class (main)

## Constructors

### Constructor

```ts
new NVDocument(): NVDocument;
```

Defined in: [nvdocument.ts:480](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L480)

#### Returns

`NVDocument`

## Properties

| Property                                                   | Type                                                                                                               | Default value | Defined in                                                                                             |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------------ |
| <a id="completedangles"></a> `completedAngles`             | [`CompletedAngle`](../interfaces/CompletedAngle.md)[]                                                              | `[]`          | [nvdocument.ts:475](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L475) |
| <a id="completedmeasurements"></a> `completedMeasurements` | [`CompletedMeasurement`](../interfaces/CompletedMeasurement.md)[]                                                  | `[]`          | [nvdocument.ts:474](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L474) |
| <a id="data"></a> `data`                                   | [`DocumentData`](../type-aliases/DocumentData.md)                                                                  | `undefined`   | [nvdocument.ts:455](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L455) |
| <a id="drawbitmap"></a> `drawBitmap`                       | `Uint8Array`                                                                                                       | `null`        | [nvdocument.ts:471](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L471) |
| <a id="imageoptionsmap"></a> `imageOptionsMap`             | `Map`\<`any`, `any`\>                                                                                              | `undefined`   | [nvdocument.ts:472](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L472) |
| <a id="meshdataobjects"></a> `meshDataObjects?`            | ( \| [`NVMesh`](../../nvmesh/classes/NVMesh.md) \| [`NVConnectome`](../../nvconnectome/classes/NVConnectome.md))[] | `undefined`   | [nvdocument.ts:469](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L469) |
| <a id="meshes"></a> `meshes`                               | ( \| [`NVMesh`](../../nvmesh/classes/NVMesh.md) \| [`NVConnectome`](../../nvconnectome/classes/NVConnectome.md))[] | `[]`          | [nvdocument.ts:470](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L470) |
| <a id="meshoptionsmap"></a> `meshOptionsMap`               | `Map`\<`any`, `any`\>                                                                                              | `undefined`   | [nvdocument.ts:473](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L473) |
| <a id="scene"></a> `scene`                                 | [`Scene`](../type-aliases/Scene.md)                                                                                | `undefined`   | [nvdocument.ts:466](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L466) |
| <a id="volumes"></a> `volumes`                             | [`NVImage`](../../nvimage/classes/NVImage.md)[]                                                                    | `[]`          | [nvdocument.ts:468](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L468) |

## Accessors

### customData

#### Get Signature

```ts
get customData(): string;
```

Defined in: [nvdocument.ts:644](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L644)

##### Returns

`string`

#### Set Signature

```ts
set customData(data: string): void;
```

Defined in: [nvdocument.ts:648](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L648)

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

Defined in: [nvdocument.ts:608](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L608)

Gets the base 64 encoded blob of the associated drawing

##### Returns

`string`

---

### encodedImageBlobs

#### Get Signature

```ts
get encodedImageBlobs(): string[];
```

Defined in: [nvdocument.ts:601](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L601)

Gets the base 64 encoded blobs of associated images

##### Returns

`string`[]

---

### imageOptionsArray

#### Get Signature

```ts
get imageOptionsArray(): ImageFromUrlOptions[];
```

Defined in: [nvdocument.ts:594](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L594)

##### Returns

[`ImageFromUrlOptions`](../../nvimage/type-aliases/ImageFromUrlOptions.md)[]

---

### labels

#### Get Signature

```ts
get labels(): NVLabel3D[];
```

Defined in: [nvdocument.ts:633](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L633)

Gets the 3D labels of the Niivue instance

##### Returns

`NVLabel3D`[]

#### Set Signature

```ts
set labels(labels: NVLabel3D[]): void;
```

Defined in: [nvdocument.ts:640](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L640)

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

Defined in: [nvdocument.ts:615](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L615)

Gets the options of the Niivue instance

##### Returns

[`NVConfigOptions`](../type-aliases/NVConfigOptions.md)

#### Set Signature

```ts
set opts(opts: NVConfigOptions): void;
```

Defined in: [nvdocument.ts:625](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L625)

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

Defined in: [nvdocument.ts:575](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L575)

Gets preview image blob

##### Returns

`string`

dataURL of preview image

#### Set Signature

```ts
set previewImageDataURL(dataURL: string): void;
```

Defined in: [nvdocument.ts:583](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L583)

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

Defined in: [nvdocument.ts:567](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L567)

Title of the document

##### Returns

`string`

#### Set Signature

```ts
set title(title: string): void;
```

Defined in: [nvdocument.ts:590](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L590)

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

Defined in: [nvdocument.ts:669](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L669)

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

Defined in: [nvdocument.ts:759](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L759)

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

Defined in: [nvdocument.ts:713](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L713)

Fetch any image data that is missing from this document.

#### Returns

`Promise`\<`void`\>

---

### getImageOptions()

```ts
getImageOptions(image: NVImage): ImageFromUrlOptions;
```

Defined in: [nvdocument.ts:746](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L746)

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

Defined in: [nvdocument.ts:655](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L655)

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

Defined in: [nvdocument.ts:662](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L662)

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

Defined in: [nvdocument.ts:753](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L753)

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

Defined in: [nvdocument.ts:699](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L699)

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

Defined in: [nvdocument.ts:822](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L822)

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

Defined in: [nvdocument.ts:814](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L814)

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

Defined in: [nvdocument.ts:787](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L787)

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

Defined in: [nvdocument.ts:807](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L807)

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

Defined in: [nvdocument.ts:771](https://github.com/niivue/niivue/blob/main/packages/niivue/src/nvdocument.ts#L771)

Factory method to return an instance of NVDocument from a URL

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `url`     | `string` |

#### Returns

`Promise`\<`NVDocument`\>
