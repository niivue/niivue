# nvimage

## Enumerations

| Enumeration                                    | Description                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| [ImageType](enumerations/ImageType.md)         | Enum for supported image types (e.g. NII, NRRD, DICOM)                                     |
| [NiiDataType](enumerations/NiiDataType.md)     | Enum for NIfTI datatype codes // https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h |
| [NiiIntentCode](enumerations/NiiIntentCode.md) | Enum for NIfTI intent codes // https://nifti.nimh.nih.gov/pub/dist/src/niftilib/nifti1.h   |

## Classes

| Class                         | Description                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| [NVImage](classes/NVImage.md) | a NVImage encapsulates some image data and provides methods to query and operate on images |

## Type Aliases

| Type Alias                                                   | Description |
| ------------------------------------------------------------ | ----------- |
| [ImageFromBase64](type-aliases/ImageFromBase64.md)           | -           |
| [ImageFromFileOptions](type-aliases/ImageFromFileOptions.md) | -           |
| [ImageFromUrlOptions](type-aliases/ImageFromUrlOptions.md)   | -           |
| [ImageMetadata](type-aliases/ImageMetadata.md)               | -           |
| [TypedVoxelArray](type-aliases/TypedVoxelArray.md)           | -           |

## Variables

| Variable                                  | Description |
| ----------------------------------------- | ----------- |
| [NVIMAGE_TYPE](variables/NVIMAGE_TYPE.md) | -           |

## Functions

| Function                                                      | Description |
| ------------------------------------------------------------- | ----------- |
| [getBestTransform](functions/getBestTransform.md)             | -           |
| [getExtents](functions/getExtents.md)                         | -           |
| [hdrToArrayBuffer](functions/hdrToArrayBuffer.md)             | -           |
| [isAffineOK](functions/isAffineOK.md)                         | -           |
| [isPlatformLittleEndian](functions/isPlatformLittleEndian.md) | -           |
| [NVImageFromUrlOptions](functions/NVImageFromUrlOptions.md)   | -           |
| [uncompressStream](functions/uncompressStream.md)             | -           |
