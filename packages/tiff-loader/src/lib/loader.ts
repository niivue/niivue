import { fromArrayBuffer, GeoTIFF, GeoTIFFImage } from 'geotiff'
import * as nifti from 'nifti-reader-js'
import { DOMParser } from 'xmldom'

export interface LSMInfo {
  MagicNumber: number
  StructureSize: number
  DimensionX: number
  DimensionY: number
  DimensionZ: number
  DimensionChannels: number
  DimensionTime: number
  IntensityDataType: number
  ThumbnailX: number
  ThumbnailY: number
  VoxelSizeX: number
  VoxelSizeY: number
  VoxelSizeZ: number
  OriginX: number
  OriginY: number
  OriginZ: number
  ScanType: number
  SpectralScan: number
  DataType: number
  OffsetVectorOverlay: number
  OffsetInputLut: number
  OffsetOutputLut: number
  OffsetChannelColors: number
  TimeInterval: number
  OffsetChannelDataTypes: number
  OffsetScanInformation: number
  OffsetKsData: number
  OffsetTimeStamps: number
  OffsetEventList: number
  OffsetRoi: number
  OffsetBleachRoi: number
  OffsetNextRecording: number
  DisplayAspectX: number
  DisplayAspectY: number
  DisplayAspectZ: number
  DisplayAspectTime: number
  OffsetMeanOfRoisOverlay: number
  OffsetTopoIsolineOverlay: number
  OffsetTopoProfileOverlay: number
  OffsetLinescanOverlay: number
  ToolbarFlags: number
  OffsetChannelWavelength: number
  OffsetChannelFactors: number
  ObjectiveSphereCorrection: number
  OffsetUnmixParameters: number
}

interface TiffMetadata {
  // Tag 34412 data for LSM might show up under 'undefined' in geotiff
  undefined?: Uint8Array
  ImageDescription?: string
  SampleFormat?: number[]
  XResolution?: [number, number]
  YResolution?: [number, number]
  ResolutionUnit?: number
}

function parseLSMInfo(uint8Array: Uint8Array): LSMInfo {
  const dataView = new DataView(uint8Array.buffer)
  let offset = 0

  function readUint32() {
    const value = dataView.getUint32(offset, true)
    offset += 4
    return value
  }

  function readUint16() {
    const value = dataView.getUint16(offset, true)
    offset += 2
    return value
  }

  function readFloat64() {
    const value = dataView.getFloat64(offset, true)
    offset += 8
    return value
  }

  return {
    MagicNumber: readUint32(),
    StructureSize: readUint32(),
    DimensionX: readUint32(),
    DimensionY: readUint32(),
    DimensionZ: readUint32(),
    DimensionChannels: readUint32(),
    DimensionTime: readUint32(),
    IntensityDataType: readUint32(),
    ThumbnailX: readUint32(),
    ThumbnailY: readUint32(),
    VoxelSizeX: readFloat64(),
    VoxelSizeY: readFloat64(),
    VoxelSizeZ: readFloat64(),
    OriginX: readFloat64(),
    OriginY: readFloat64(),
    OriginZ: readFloat64(),
    ScanType: readUint16(),
    SpectralScan: readUint16(),
    DataType: readUint32(),
    OffsetVectorOverlay: readUint32(),
    OffsetInputLut: readUint32(),
    OffsetOutputLut: readUint32(),
    OffsetChannelColors: readUint32(),
    TimeInterval: readFloat64(),
    OffsetChannelDataTypes: readUint32(),
    OffsetScanInformation: readUint32(),
    OffsetKsData: readUint32(),
    OffsetTimeStamps: readUint32(),
    OffsetEventList: readUint32(),
    OffsetRoi: readUint32(),
    OffsetBleachRoi: readUint32(),
    OffsetNextRecording: readUint32(),
    DisplayAspectX: readFloat64(),
    DisplayAspectY: readFloat64(),
    DisplayAspectZ: readFloat64(),
    DisplayAspectTime: readFloat64(),
    OffsetMeanOfRoisOverlay: readUint32(),
    OffsetTopoIsolineOverlay: readUint32(),
    OffsetTopoProfileOverlay: readUint32(),
    OffsetLinescanOverlay: readUint32(),
    ToolbarFlags: readUint32(),
    OffsetChannelWavelength: readUint32(),
    OffsetChannelFactors: readUint32(),
    ObjectiveSphereCorrection: readFloat64(),
    OffsetUnmixParameters: readUint32()
  }
}

export async function tiff2niiStack(
  inBuffer: ArrayBuffer | Uint8Array,
  isVerbose = false,
  stackGroup = 0
): Promise<{ niftiImage: Uint8Array; stackConfigs: string[] }> {
  try {
    let arrayBuffer: ArrayBufferLike = inBuffer as ArrayBuffer
    if (inBuffer instanceof Uint8Array) {
      arrayBuffer = inBuffer.buffer.slice(inBuffer.byteOffset, inBuffer.byteOffset + inBuffer.byteLength)
    }
    if (!(arrayBuffer instanceof ArrayBuffer)) {
      throw new Error('Unsupported input type: Expected Buffer or ArrayBuffer')
    }

    const tiff: GeoTIFF = await fromArrayBuffer(arrayBuffer)
    let nFrames = await tiff.getImageCount()
    const images: GeoTIFFImage[] = []
    const stackGroups = new Array(nFrames).fill(0)
    const stackConfigs: string[] = []

    // Collect basic info to figure out distinct stack groups
    for (let i = 0; i < nFrames; i++) {
      const img = await tiff.getImage(i)
      images.push(img)
      const width = img.getWidth()
      const height = img.getHeight()
      const samplesPerPixel = img.getSamplesPerPixel()
      const bitDepth = img.getBytesPerPixel() * 8
      const configKey = `${width}x${height}c${samplesPerPixel}b${bitDepth}`
      let configIndex = stackConfigs.indexOf(configKey)
      if (configIndex === -1) {
        stackConfigs.push(configKey)
        configIndex = stackConfigs.length - 1
      }
      stackGroups[i] = configIndex
    }

    // Grab metadata from the first directory
    const metadata: TiffMetadata = images[0].getFileDirectory() as TiffMetadata

    // If multiple stack groups, filter to only the requested one
    if (stackConfigs.length > 1) {
      if (stackGroup >= stackConfigs.length || stackGroup < 0) stackGroup = 0
      const desiredGroup = stackGroup
      const filteredImages: GeoTIFFImage[] = []
      for (let i = 0; i < nFrames; i++) {
        if (stackGroups[i] === desiredGroup) {
          filteredImages.push(images[i])
        }
      }
      images.length = 0
      images.push(...filteredImages)
      nFrames = images.length

      if (isVerbose) {
        console.log(
          `${images.length} of ${stackConfigs.length} possible slices match dimensions of stackGroup ${stackGroup}`
        )
      }
    }

    // Basic geometry from the first slice
    const width = images[0].getWidth()
    const height = images[0].getHeight()
    let samplesPerPixel = images[0].getSamplesPerPixel()
    const bitDepth = images[0].getBytesPerPixel() * 8

    // Prepare NIfTI header
    const hdr = new nifti.NIFTI1()
    hdr.littleEndian = true
    hdr.vox_offset = 352
    hdr.scl_inter = 0
    hdr.scl_slope = 1
    hdr.magic = 'n+1'
    hdr.pixDims = [1, 1, 1, 1, 1, 0, 0, 0]

    let sizeZ = 1
    let sizeT = 1
    let sizeC = 1
    let isLSM = false

    // Check for Zeiss LSM tag (34412), stored as `undefined` in geotiff
    if (
      metadata?.undefined instanceof Uint8Array &&
      metadata.undefined.length >= 224 &&
      metadata.undefined[0] === 76 && // 'L'
      metadata.undefined[1] === 73 && // 'I'
      metadata.undefined[2] === 0 &&
      metadata.undefined[3] === 4
    ) {
      const hdrLSM = parseLSMInfo(metadata.undefined)
      // Scale for thumbnail images
      const scaleX = hdrLSM.DimensionX / width
      hdr.pixDims[1] = scaleX * hdrLSM.VoxelSizeX * 1_000_000.0
      const scaleY = hdrLSM.DimensionY / height
      hdr.pixDims[2] = scaleY * hdrLSM.VoxelSizeY * 1_000_000.0
      hdr.pixDims[3] = hdrLSM.VoxelSizeZ * 1_000_000.0
      hdr.pixDims[4] = hdrLSM.TimeInterval

      // 3 = µm, 8 = seconds, so 3+8 = (xyz in microns) and (t in seconds)
      hdr.xyzt_units = 3 + 8
      sizeZ = hdrLSM.DimensionZ
      sizeT = hdrLSM.DimensionTime
      sizeC = hdrLSM.DimensionChannels
      isLSM = true

      if (nFrames !== sizeZ * sizeT * sizeC) {
        if (nFrames === sizeZ * sizeT) {
          // each channel may have unique resolution => each channel is in a different stack
          sizeC = 1
        } else {
          console.warn(`Inconsistent LSM TIFF ${sizeZ}×${sizeT}×${sizeC} != ${nFrames} (perhaps multi-dimensional)`)
          console.warn(`${width}×${height}c${samplesPerPixel}bpp${bitDepth}`)
        }
      }
    }

    const imageDescription = metadata?.ImageDescription
    const sliceOrder = new Array(nFrames).fill(0).map((_, i) => i)

    // Check if ImageJ metadata
    if (imageDescription?.includes('ImageJ=')) {
      const zMatch = imageDescription.match(/slices=(\d+)/)
      const tMatch = imageDescription.match(/frames=(\d+)/)
      const cMatch = imageDescription.match(/channels=(\d+)/)
      const spacingMatch = imageDescription.match(/spacing=([\d.]+)/)
      const unitMatch = imageDescription.match(/unit=([\S]+)/)

      sizeZ = zMatch ? parseInt(zMatch[1], 10) : 1
      sizeT = tMatch ? parseInt(tMatch[1], 10) : 1
      sizeC = cMatch ? parseInt(cMatch[1], 10) : 1
      const spacing = spacingMatch ? parseFloat(spacingMatch[1]) : 1.0

      // ResolutionUnit: 1=none, 2=inch, 3=cm, but ImageJ sometimes treats 1 as cm
      let scale = metadata?.ResolutionUnit === 2 ? 2.54 : 1
      const xRes = metadata?.XResolution ? metadata.XResolution[0] / metadata.XResolution[1] : 1
      hdr.pixDims[1] = scale / xRes
      const yRes = metadata?.YResolution ? metadata.YResolution[0] / metadata.YResolution[1] : 1
      hdr.pixDims[2] = scale / yRes
      hdr.pixDims[3] = spacing

      const unit = unitMatch ? unitMatch[1] : ''
      const isUm = ['µm', '\xB5m', '�m'].includes(unit)
      if (isUm) hdr.xyzt_units = 3

      if (nFrames > 1 && sizeZ * sizeT * sizeC === nFrames) {
        // Reorder slices to match (Z, T, C) in typical 5D
        const zIndex = imageDescription.indexOf('slices=')
        const tIndex = imageDescription.indexOf('frames=')
        const cIndex = imageDescription.indexOf('channels=')

        let zStep = 1
        if (zIndex > tIndex) zStep *= sizeT
        if (zIndex > cIndex) zStep *= sizeC

        let tStep = 1
        if (tIndex > zIndex) tStep *= sizeZ
        if (tIndex > cIndex) tStep *= sizeC

        let cStep = 1
        if (cIndex > zIndex) cStep *= sizeZ
        if (cIndex > tIndex) cStep *= sizeT

        for (let i = 0; i < nFrames; i++) {
          const z = Math.floor(i / zStep) % sizeZ
          const t = Math.floor(i / tStep) % sizeT
          const c = Math.floor(i / cStep) % sizeC
          const order = z + t * sizeZ + c * sizeZ * sizeT
          sliceOrder[i] = order
        }
      }
    }

    // Check for OME-TIFF XML in ImageDescription
    if (imageDescription?.includes('<OME xml')) {
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(imageDescription, 'text/xml')
      const pixelsNode = xmlDoc.getElementsByTagName('Pixels')[0]

      sizeZ = parseInt(pixelsNode?.getAttribute('SizeZ') || '1', 10)
      sizeT = parseInt(pixelsNode?.getAttribute('SizeT') || '1', 10)
      sizeC = parseInt(pixelsNode?.getAttribute('SizeC') || '1', 10)
      hdr.pixDims[1] = parseFloat(pixelsNode?.getAttribute('PhysicalSizeX') || '1')
      hdr.pixDims[2] = parseFloat(pixelsNode?.getAttribute('PhysicalSizeY') || '1')
      hdr.pixDims[3] = parseFloat(pixelsNode?.getAttribute('PhysicalSizeZ') || '1')

      const sizeUnitX = pixelsNode?.getAttribute('PhysicalSizeXUnit') || ''
      if (sizeUnitX === 'µm') hdr.xyzt_units = 3
      if (sizeUnitX === 'mm') hdr.xyzt_units = 2

      const planes = xmlDoc.getElementsByTagName('Plane')
      if (planes.length > 0) {
        const Z: number[] = new Array(nFrames).fill(0)
        const T: number[] = new Array(nFrames).fill(0)
        const C: number[] = new Array(nFrames).fill(0)

        for (let i = 0; i < Math.min(planes.length, nFrames); i++) {
          const plane = planes[i]
          Z[i] = parseInt(plane.getAttribute('TheZ') || '0', 10)
          T[i] = parseInt(plane.getAttribute('TheT') || '0', 10)
          C[i] = parseInt(plane.getAttribute('TheC') || '0', 10)
        }

        for (let i = 0; i < nFrames; i++) {
          const order = Z[i] + T[i] * sizeZ + C[i] * sizeZ * sizeT
          sliceOrder[i] = order
        }

        if (isVerbose) {
          console.log(`OME SizeZ: ${sizeZ}, SizeT: ${sizeT}, SizeC: ${sizeC}`)
        }
      }
    }

    // NIfTI dimension info: dims[1..n] are actual dimensions, dims[0] is the number of dims
    hdr.dims = [3, width, height, nFrames, 0, 0, 0, 0]
    if (sizeZ * sizeT * sizeC === nFrames && sizeT * sizeC > 1 && nFrames > 1) {
      hdr.dims[0] = 4
      hdr.dims[3] = sizeZ
      hdr.dims[4] = sizeT
      if (sizeC > 1) {
        hdr.dims[0] = 5
        hdr.dims[5] = sizeC
      }
    }

    // Determine the NIfTI datatype
    let isRG = false
    const sampleFormat = metadata?.SampleFormat ? metadata.SampleFormat[0] : undefined

    if (bitDepth === 16 && samplesPerPixel === 1) {
      hdr.numBitsPerVoxel = 16
      if (sampleFormat === 2) {
        hdr.datatypeCode = 4 // DT_INT16
      } else {
        hdr.datatypeCode = 512 // DT_UINT16
      }
    } else if (bitDepth === 8 && samplesPerPixel === 1) {
      hdr.numBitsPerVoxel = 8
      hdr.datatypeCode = 2 // DT_UINT8
    } else if (bitDepth === 16 && samplesPerPixel === 2) {
      // 2-channel RG => convert to 3-channel RGB
      isRG = true
      samplesPerPixel = 3
      hdr.numBitsPerVoxel = 24
      hdr.datatypeCode = 128 // DT_RGB
    } else if (bitDepth === 24 && samplesPerPixel === 3) {
      hdr.numBitsPerVoxel = 24
      hdr.datatypeCode = 128 // DT_RGB
    } else if (bitDepth === 32 && samplesPerPixel === 1) {
      hdr.numBitsPerVoxel = 32
      // 1=uint, 2=int, 3=float
      if (sampleFormat === 2) {
        hdr.datatypeCode = 8 // DT_INT32
      } else if (sampleFormat === 3) {
        hdr.datatypeCode = 16 // DT_FLOAT32
      } else {
        hdr.datatypeCode = 768 // DT_UINT32
      }
    } else if (bitDepth === 32 && samplesPerPixel === 4) {
      hdr.numBitsPerVoxel = 32
      hdr.datatypeCode = 2304 // DT_RGBA32
    } else {
      throw new Error(`Unsupported TIFF bit depth: ${bitDepth}, channels: ${samplesPerPixel}`)
    }

    if (isVerbose) {
      console.log(
        `NIfTI dimensions: ${hdr.dims.slice(1).join('×')}, bit-depth: ${bitDepth}, ` +
          `channels: ${samplesPerPixel}, pixDims: ${hdr.pixDims.slice(1, 4).join('×')} ` +
          `unit: ${hdr.xyzt_units}`
      )
    }

    // Create the output buffer for image data
    const nvox = width * height * nFrames
    let imgArray: Int16Array | Int32Array | Float32Array | Uint8Array | Uint16Array | Uint32Array

    switch (hdr.datatypeCode) {
      case 4: // DT_INT16
        imgArray = new Int16Array(nvox)
        break
      case 8: // DT_INT32
        imgArray = new Int32Array(nvox)
        break
      case 16: // DT_FLOAT32
        imgArray = new Float32Array(nvox)
        break
      case 512: // DT_UINT16
        imgArray = new Uint16Array(nvox)
        break
      case 768: // DT_UINT32
        imgArray = new Uint32Array(nvox)
        break
      default:
        // e.g. 2 = DT_UINT8, 128 = DT_RGB, 2304 = DT_RGBA32
        imgArray = new Uint8Array(nvox * samplesPerPixel)
        break
    }

    // Read pixel data for each slice into the correct offset
    for (let i = 0; i < nFrames; i++) {
      const targetIndex = sliceOrder[i]
      if (targetIndex < 0 || targetIndex >= nFrames) {
        throw new Error('Fatal slice-order error')
      }
      const image = images[i]
      const raster = await image.readRasters({ interleave: true })
      let pixelData = raster as number[] | Uint8Array

      // If 2-channel "RG", convert to 3-channel "RGB" by adding zero for B
      if (isRG) {
        const imgRG = new Uint8Array(pixelData)
        const nPx = width * height
        const rgb = new Uint8Array(nPx * 3)
        let j = 0
        for (let k = 0; k < imgRG.length; k += 2) {
          rgb[j++] = imgRG[k] // R
          rgb[j++] = imgRG[k + 1] // G
          rgb[j++] = 0 // B
        }
        pixelData = rgb
      }

      const offset = targetIndex * width * height * samplesPerPixel
      // Cast to a typed array for set()
      if (pixelData instanceof Uint8Array && imgArray instanceof Uint8Array) {
        imgArray.set(pixelData, offset)
      } else {
        imgArray.set(pixelData as any, offset)
      }
    }

    const img8 = new Uint8Array(imgArray.buffer)

    // Create a simple affine that centers the volume at the origin
    const dxs = [hdr.pixDims[1], hdr.pixDims[2], hdr.pixDims[3]]
    const ns = [hdr.dims[1], hdr.dims[2], hdr.dims[3]]
    hdr.affine = [
      [dxs[0], 0, 0, -((dxs[0] * ns[0]) / 2)],
      [0, dxs[1], 0, -((dxs[1] * ns[1]) / 2)],
      [0, 0, dxs[2], -((dxs[2] * ns[2]) / 2)],
      [0, 0, 0, 1]
    ]

    // Convert the NIFTI header to an ArrayBuffer
    const hdrBuffer = hdr.toArrayBuffer()

    // Merge header and pixel data
    const niftiData = new Uint8Array(hdrBuffer.byteLength + img8.byteLength)
    niftiData.set(new Uint8Array(hdrBuffer), 0)
    niftiData.set(img8, hdrBuffer.byteLength)

    return {
      niftiImage: niftiData,
      stackConfigs
    }
  } catch (error: any) {
    throw error
  }
}

export async function tiff2nii(inBuffer: ArrayBuffer | Uint8Array, isVerbose = false): Promise<Uint8Array> {
  // This function only reads the first stack group (stackGroup=0)
  const result = await tiff2niiStack(inBuffer, isVerbose, 0)
  if (!result) {
    // An error occurred or no valid image returned
    throw new Error('No valid NIfTI image data')
  }
  return result.niftiImage
}
