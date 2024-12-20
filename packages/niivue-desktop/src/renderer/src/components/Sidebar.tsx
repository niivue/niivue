import { useContext } from 'react'
import { AppContext } from '../App'
import { Card } from '@radix-ui/themes'

export function Sidebar(): JSX.Element {
  const { volumes } = useContext(AppContext)
  return (
    <div className="flex flex-col basis-1/3 bg-gray-100 p-2">
      {volumes.map((volume, idx) => (
        <Card key={idx} className="p-2 m-2 bg-white">
          <h1>{volume.name}</h1>
        </Card>
      ))}
    </div>
  )
}
