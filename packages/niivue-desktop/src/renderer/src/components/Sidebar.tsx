import { useContext } from 'react'
import { AppContext } from '../App'
import { ImageCard } from './ImageCard'

export function Sidebar(): JSX.Element {
  const { volumes } = useContext(AppContext)
  return (
    <div className="flex flex-col bg-gray-100 p-2 w-1/3 basis-1/3">
      {volumes.map((volume, idx) => (
        <ImageCard key={idx} image={volume} />
      ))}
    </div>
  )
}
