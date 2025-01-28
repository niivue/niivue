import { Dcm2niix } from '@niivue/dcm2niix'

// Each input item either is a File or has this shape:
export interface DicomInput {
  name: string
  data: ArrayBuffer
}

// Each output item will have a name and data (ArrayBuffer).
export interface ConvertedFile {
  name: string
  data: ArrayBuffer
}

/**
 * Loads DICOM files (or a single DICOM file) and converts them to
 * NIfTI using dcm2niix in the browser.
 *
 * @param data - An array of File objects or an array of DicomInput objects.
 * @returns A promise that resolves to an array of { name, data }
 *          where each data field is an ArrayBuffer containing the NIfTI file.
 */
export async function dicomLoader(data: Array<File | DicomInput>): Promise<ConvertedFile[]> {
  const dcm2niix = new Dcm2niix()
  await dcm2niix.init()

  let returnedFiles: File[] = []

  if (Array.isArray(data) && data.length === 1 && (data[0] as DicomInput).data instanceof ArrayBuffer) {
    const fileObj = data[0] as DicomInput
    const file = new File([fileObj.data], fileObj.name, { type: 'application/octet-stream' })
    returnedFiles = await dcm2niix.input([file]).run()
  } else if (Array.isArray(data) && data.length > 0) {
    const first = data[0]
    if ((first as DicomInput).data instanceof ArrayBuffer) {
      const files: File[] = []
      for (let i = 0; i < data.length; i++) {
        const dicom = data[i] as DicomInput
        const file = new File([dicom.data], dicom.name, { type: 'application/octet-stream' })
        files.push(file)
      }
      returnedFiles = await dcm2niix.input(files).run()
    } else {
      returnedFiles = await dcm2niix.input(data as File[]).run()
    }
  }

  const niiFiles = returnedFiles.filter((file) => file.name.endsWith('.nii') || file.name.endsWith('.nii.gz'))

  const arrayBuffers: ConvertedFile[] = []
  for (const file of niiFiles) {
    const niiArrayBuffer = await file.arrayBuffer()
    arrayBuffers.push({ name: file.name, data: niiArrayBuffer })
  }

  return arrayBuffers
}
