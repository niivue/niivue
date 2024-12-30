import { NVImage, NVMesh } from '@niivue/niivue'
import { Dispatch, SetStateAction } from 'react'

const volumeExtensions = ['.nii', '.nii.gz'] // TODO: list all supported file types
const meshExtensions = ['mz3'] // TODO: list all supported file types

export const loadDroppedFiles = async (
  e: React.DragEvent<HTMLDivElement>,
  onLoadedVolumes: Dispatch<SetStateAction<NVImage[]>>,
  onLoadedMeshes: Dispatch<SetStateAction<NVMesh[]>>,
  gl: WebGL2RenderingContext
): Promise<void> => {
  e.preventDefault()
  const files = e.dataTransfer.files
  const volumes: NVImage[] = []
  const meshes: NVMesh[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const base64 = await window.api.loadFromFile(file.path)
    if (volumeExtensions.some((ext) => file.name.endsWith(ext))) {
      const vol = NVImage.loadFromBase64({
        base64,
        name: file.path
      })
      volumes.push(vol)
    } else if (meshExtensions.some((ext) => file.name.endsWith(ext))) {
      const arrayBuffer = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)).buffer
      const mesh = await NVMesh.loadFromFile({
        file: new File([arrayBuffer], 'aal.mz3'),
        gl: gl,
        name: 'aal.mz3'
      })
      meshes.push(mesh)
    }
  }
  onLoadedVolumes(volumes)
  onLoadedMeshes(meshes)
}
