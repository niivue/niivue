# niivue

## Classes

| Class                       | Description                                                                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| [Niivue](classes/Niivue.md) | Niivue can be attached to a canvas. An instance of Niivue contains methods for loading and rendering NIFTI image data in a WebGL 2.0 context. |

## Interfaces

| Interface                                                  | Description                                                                                                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [CustomLoader](interfaces/CustomLoader.md)                 | Custom file loader configuration. The loader function can return either: - ArrayBuffer for volume data - MeshLoaderResult for mesh data with positions and indices |
| [GetFileExtOptions](interfaces/GetFileExtOptions.md)       | Options for getFileExt function                                                                                                                                    |
| [LoaderRegistry](interfaces/LoaderRegistry.md)             | Collection of registered custom loaders by file extension                                                                                                          |
| [MeshLoaderResult](interfaces/MeshLoaderResult.md)         | Mesh data returned by custom mesh loaders                                                                                                                          |
| [RegisterLoaderParams](interfaces/RegisterLoaderParams.md) | Parameters for registerLoader                                                                                                                                      |

## Type Aliases

| Type Alias                                           | Description |
| ---------------------------------------------------- | ----------- |
| [DicomLoader](type-aliases/DicomLoader.md)           | -           |
| [DicomLoaderInput](type-aliases/DicomLoaderInput.md) | -           |

## Variables

| Variable                                        | Description                              |
| ----------------------------------------------- | ---------------------------------------- |
| [MESH_EXTENSIONS](variables/MESH_EXTENSIONS.md) | Mesh file extensions supported by Niivue |

## Functions

| Function                                            | Description                                                                            |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [getFileExt](functions/getFileExt.md)               | Extracts and normalizes the file extension, handling special cases like .gz and .cbor. |
| [getLoader](functions/getLoader.md)                 | Get a loader for a specific file extension                                             |
| [getMediaByUrl](functions/getMediaByUrl.md)         | Get media (volume or mesh) by URL from a media URL map                                 |
| [handleDragEnter](functions/handleDragEnter.md)     | Simple drag enter event handler that prevents default behavior                         |
| [handleDragOver](functions/handleDragOver.md)       | Simple drag over event handler that prevents default behavior                          |
| [isDicomExtension](functions/isDicomExtension.md)   | Check if a DICOM loader error should be thrown                                         |
| [isMeshExt](functions/isMeshExt.md)                 | Check if a URL/filename has a mesh file extension                                      |
| [readDirectory](functions/readDirectory.md)         | Read all entries from a directory                                                      |
| [readFileAsDataURL](functions/readFileAsDataURL.md) | Read a file as a data URL                                                              |
| [registerLoader](functions/registerLoader.md)       | Register a custom loader for a specific file extension                                 |
| [traverseFileTree](functions/traverseFileTree.md)   | Recursively traverse a file tree and collect all files                                 |

## References

### cmapper

Re-exports [cmapper](../colortables/variables/cmapper.md)

---

### COLORMAP_TYPE

Re-exports [COLORMAP_TYPE](../nvdocument/enumerations/COLORMAP_TYPE.md)

---

### ColormapListEntry

Re-exports [ColormapListEntry](../types/type-aliases/ColormapListEntry.md)

---

### colortables

Renames and re-exports [ColorTables](../colortables/classes/ColorTables.md)

---

### CompletedAngle

Re-exports [CompletedAngle](../nvdocument/interfaces/CompletedAngle.md)

---

### CompletedMeasurement

Re-exports [CompletedMeasurement](../nvdocument/interfaces/CompletedMeasurement.md)

---

### Connectome

Re-exports [Connectome](../types/type-aliases/Connectome.md)

---

### ConnectomeOptions

Re-exports [ConnectomeOptions](../types/type-aliases/ConnectomeOptions.md)

---

### DEFAULT_OPTIONS

Re-exports [DEFAULT_OPTIONS](../nvdocument/variables/DEFAULT_OPTIONS.md)

---

### Descriptive

Re-exports [Descriptive](../types/type-aliases/Descriptive.md)

---

### DocumentData

Re-exports [DocumentData](../nvdocument/type-aliases/DocumentData.md)

---

### DragReleaseParams

Re-exports [DragReleaseParams](../types/type-aliases/DragReleaseParams.md)

---

### ExportDocumentData

Re-exports [ExportDocumentData](../nvdocument/type-aliases/ExportDocumentData.md)

---

### FontMetrics

Re-exports [FontMetrics](../types/type-aliases/FontMetrics.md)

---

### Graph

Re-exports [Graph](../types/type-aliases/Graph.md)

---

### INITIAL_SCENE_DATA

Re-exports [INITIAL_SCENE_DATA](../nvdocument/variables/INITIAL_SCENE_DATA.md)

---

### LabelAnchorPoint

Re-exports [LabelAnchorPoint](../nvlabel/enumerations/LabelAnchorPoint.md)

---

### LabelLineTerminator

Re-exports [LabelLineTerminator](../nvlabel/enumerations/LabelLineTerminator.md)

---

### LabelTextAlignment

Re-exports [LabelTextAlignment](../nvlabel/enumerations/LabelTextAlignment.md)

---

### LegacyConnectome

Re-exports [LegacyConnectome](../types/type-aliases/LegacyConnectome.md)

---

### LegacyNodes

Re-exports [LegacyNodes](../types/type-aliases/LegacyNodes.md)

---

### MM

Re-exports [MM](../types/type-aliases/MM.md)

---

### MouseEventConfig

Re-exports [MouseEventConfig](../nvdocument/interfaces/MouseEventConfig.md)

---

### MvpMatrix2D

Re-exports [MvpMatrix2D](../types/type-aliases/MvpMatrix2D.md)

---

### NiftiHeader

Re-exports [NiftiHeader](../types/type-aliases/NiftiHeader.md)

---

### NiiVueLocation

Re-exports [NiiVueLocation](../types/type-aliases/NiiVueLocation.md)

---

### NiiVueLocationValue

Re-exports [NiiVueLocationValue](../types/type-aliases/NiiVueLocationValue.md)

---

### NVConfigOptions

Re-exports [NVConfigOptions](../nvdocument/type-aliases/NVConfigOptions.md)

---

### NVImage

Re-exports [NVImage](../nvimage/classes/NVImage.md)

---

### NVImageFromUrlOptions

Re-exports [NVImageFromUrlOptions](../nvimage/functions/NVImageFromUrlOptions.md)

---

### NVMesh

Re-exports [NVMesh](../nvmesh/classes/NVMesh.md)

---

### NVMeshFromUrlOptions

Re-exports [NVMeshFromUrlOptions](../nvmesh/classes/NVMeshFromUrlOptions.md)

---

### NVMeshLayerDefaults

Re-exports [NVMeshLayerDefaults](../nvmesh/variables/NVMeshLayerDefaults.md)

---

### NVMeshUtilities

Re-exports [NVMeshUtilities](../nvmesh-utilities/classes/NVMeshUtilities.md)

---

### NVUtilities

Re-exports [NVUtilities](../nvutilities/classes/NVUtilities.md)

---

### PEN_TYPE

Re-exports [PEN_TYPE](../nvdocument/enumerations/PEN_TYPE.md)

---

### Point

Re-exports [Point](../types/type-aliases/Point.md)

---

### SaveImageOptions

Re-exports [SaveImageOptions](../types/type-aliases/SaveImageOptions.md)

---

### Scene

Re-exports [Scene](../nvdocument/type-aliases/Scene.md)

---

### SHOW_RENDER

Re-exports [SHOW_RENDER](../nvdocument/enumerations/SHOW_RENDER.md)

---

### SliceScale

Re-exports [SliceScale](../types/type-aliases/SliceScale.md)

---

### SyncOpts

Re-exports [SyncOpts](../types/type-aliases/SyncOpts.md)

---

### TouchEventConfig

Re-exports [TouchEventConfig](../nvdocument/interfaces/TouchEventConfig.md)

---

### UIData

Re-exports [UIData](../types/type-aliases/UIData.md)

---

### Volume

Re-exports [Volume](../types/type-aliases/Volume.md)
