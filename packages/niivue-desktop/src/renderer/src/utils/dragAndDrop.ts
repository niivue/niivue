import { NVImage } from '@niivue/niivue'
import { Dispatch, SetStateAction } from 'react'

export const loadDroppedFiles = async (
  e: React.DragEvent<HTMLDivElement>,
  onLoaded: Dispatch<SetStateAction<NVImage[]>>
): Promise<void> => {
  e.preventDefault()
  const files = e.dataTransfer.files
  const volumes: NVImage[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const base64 = await window.api.loadFromFile(file.path)
    const vol = NVImage.loadFromBase64({
      base64,
      name: file.path
    })
    volumes.push(vol)
  }
  onLoaded(volumes)
}
