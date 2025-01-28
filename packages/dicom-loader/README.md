# @niivue/dicom-loader

A minimal TypeScript/JavaScript utility for converting DICOM files to NIfTI format in the browser, using [@niivue/dcm2niix](https://www.npmjs.com/package/@niivue/dcm2niix).

## Features

- Converts one or more DICOM files into `.nii` or `.nii.gz`  
- Returns NIfTI files as ArrayBuffers, ready for further processing (e.g., display with [Niivue](https://github.com/niivue/niivue))  
- Lightweight and browser-friendly

## Installation

```bash
npm install @niivue/dicom-loader
```

This automatically installs the @niivue/dcm2niix dependency.

## Usage

```typescript

import { dicomLoader } from '@niivue/dicom-loader';

// Suppose you have a file input in the browser
const fileInput = document.getElementById('dicomInput') as HTMLInputElement

fileInput.addEventListener('change', async () => {
  if (!fileInput.files) return

  const files = Array.from(fileInput.files) // An array of `File` objects

  // Call dicomLoader with an array of Files (or DicomInput objects)
  const loadedFiles = await dicomLoader(files)
  // NOTE: loadedFiles ArrayBuffer data will be in NIFTI format (due to using dcm2niix under the hood)

  // `loadedFiles` is an array of objects: { name: string, data: ArrayBuffer }
  console.log('loaded files:', loadedFiles)
})
```
You can also pass an array of DicomInput objects (with { name: string; data: ArrayBuffer }), which will be converted internally to File objects before processing.



## Usage in NiiVue

```typescript
import { dicomLoader } from "@niivue/dicom-loader"
import { Niivue } from "@niivue/niivue"

const nv = new Niivue()

nv.useDicomLoader({
    loader: dicomLoader
})

nv.loadDicoms([
    // dicom manifest example
    { url: "../tests/images/dicom/niivue-manifest.txt", isManifest: true},
    // single file example (enhanced dicom)
    // { url: "../demos/images/enh.dcm"}
])

// NOTE: if you register the dicomLoader with Niivue, drag and drop of dicom folders is supported out of the box. Just drop a folder onto the canvas
```

#### NiiVue drag and drop

It may be useful to use the callback in NiiVue when handling multiple returned images from the `dicomLoader`

```typescript
// Import libs if needed
// 
// import { dicomLoader } from "@niivue/dicom-loader"
// import { Niivue } from "@niivue/niivue"

const myDicomLoaderHandler = async (images) => {
    // images is and Array of NVImage (e.g. NVImage[])
    // demonstration of how a user could choose which volume to add
    const choice = window.prompt(
        images
        .map((image, index) => `${index}: ${image.name}`)
        .join("\n"),
        "0"
    )

    if (choice === null) {
        return
    }
    const imageIndex = parseInt(choice)
    if (isNaN(imageIndex)) {
        return
    }
    if (imageIndex < 0 || imageIndex >= images.length) {
        return
    }

    // add the volume and show it in the NiiVue canvas
    nv.addVolume(images[imageIndex])
}

const nv = new Niivue({
    onDicomLoaderFinishedWithImages: myDicomLoaderHandler
})
```

## Setup

You may need to ensure that your module bundler and build system handles the `@niivue/dcm2niix` WASM and WebWorker dependency correctly.

### Vite example

Add the following lines to `vite.config.js`

```typescript
// ... snip ...
optimizeDeps: {
    exclude: ['@niivue/dcm2niix']
  },
  worker: {
    format: 'es'
  }
// ... snip ...
```

## API

```typescript
dicomLoader(data: Array<File | DicomInput>): Promise<ConvertedFile[]>
```
- `data`: An array containing either:
    - Browser File objects
    - Or objects with `{ name: string; data: ArrayBuffer }`
- `returns`: A Promise resolving to an array of `{ name: string; data: ArrayBuffer }`, where data is a NIfTI file ArrayBuffer.

## License

BSD-2-Clause


