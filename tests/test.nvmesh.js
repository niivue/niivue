const { snapshot, httpServerAddress } = require('./helpers')

beforeEach(async () => {
  await page.goto(httpServerAddress, { timeout: 0 })
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 })
})

test('parse_xml_gifti_file_new_line', async () => {
  const obj = await page.evaluate(async () => {
    const xmlFile = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE GIFTI SYSTEM "http://www.nitrc.org/frs/download.php/115/gifti.dtd">
<GIFTI Version="1.0" NumberOfDataArrays="1">
<MetaData />
<LabelTable />
<DataArray Intent="NIFTI_INTENT_ZSCORE" DataType="NIFTI_TYPE_FLOAT32" ArrayIndexingOrder="RowMajorOrder" Dimensionality="1" Encoding="GZipBase64Binary" Endian="LittleEndian" ExternalFileName="" ExternalFileOffset="0" Dim0="3">
<MetaData />
<CoordinateSystemTransformMatrix>
<DataSpace>NIFTI_XFORM_UNKNOWN</DataSpace><TransformedSpace>NIFTI_XFORM_UNKNOWN</TransformedSpace>
<MatrixData>  1.000000   0.000000   0.000000   0.000000
  0.000000   1.000000   0.000000   0.000000
  0.000000   0.000000   1.000000   0.000000
  0.000000   0.000000   0.000000   1.000000</MatrixData>
</CoordinateSystemTransformMatrix>
<Data>eJxjYGiwZ2BgcAAiBwAJQwGA</Data>
</DataArray></GIFTI>`
    function base64ToArrayBuffer(base64) {
      const binary_string = atob(base64)
      const len = binary_string.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
      }
      return bytes.buffer
    }
    const buffer = base64ToArrayBuffer(btoa(xmlFile))
    const obj = niivue.NVMesh.readGII(buffer)
    return obj
  })

  expect(Object.values(obj.scalars).length).toBe(3)
  await snapshot()
})

test('parse_xml_gifti_file_no_new_line', async () => {
  const obj = await page.evaluate(async () => {
    const xmlFile = `
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE GIFTI SYSTEM "http://www.nitrc.org/frs/download.php/115/gifti.dtd"><GIFTI Version="1.0" NumberOfDataArrays="1"><MetaData /><LabelTable /><DataArray Intent="NIFTI_INTENT_ZSCORE" DataType="NIFTI_TYPE_FLOAT32" ArrayIndexingOrder="RowMajorOrder" Dimensionality="1" Encoding="GZipBase64Binary" Endian="LittleEndian" ExternalFileName="" ExternalFileOffset="0" Dim0="3"><MetaData /><CoordinateSystemTransformMatrix><DataSpace>NIFTI_XFORM_UNKNOWN</DataSpace><TransformedSpace>NIFTI_XFORM_UNKNOWN</TransformedSpace>
<MatrixData>  1.000000   0.000000   0.000000   0.000000
  0.000000   1.000000   0.000000   0.000000
  0.000000   0.000000   1.000000   0.000000
  0.000000   0.000000   0.000000   1.000000</MatrixData></CoordinateSystemTransformMatrix><Data>eJxjYGiwZ2BgcAAiBwAJQwGA</Data></DataArray></GIFTI>`
    function base64ToArrayBuffer(base64) {
      const binary_string = atob(base64)
      const len = binary_string.length
      const bytes = new Uint8Array(len)
      for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i)
      }
      return bytes.buffer
    }
    const buffer = base64ToArrayBuffer(btoa(xmlFile))
    const obj = niivue.NVMesh.readGII(buffer)
    return obj
  })

  expect(Object.values(obj.scalars).length).toBe(3)
  await snapshot()
})
