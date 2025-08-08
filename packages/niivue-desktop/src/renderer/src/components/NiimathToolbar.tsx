// src/components/NiimathToolbar.tsx
import { useEffect, useState } from 'react'
import { NVImage } from '@niivue/niivue'
import { v4 as uuidv4 } from 'uuid'
import { useSelectedInstance } from '../AppContext.js'

interface NiimathToolbarProps {
  modeMap: Map<string, 'replace' | 'overlay'>
  indexMap: Map<string, number>
}

export function NiimathToolbar({ modeMap, indexMap }: NiimathToolbarProps): JSX.Element {
  const selected = useSelectedInstance()
  const currentVolume: NVImage | null = selected?.selectedImage ?? selected?.volumes[0] ?? null

  const [cmd, setCmd] = useState<string>('-dehaze 5 -dog 2 3.2')
  const [mode, setMode] = useState<'replace' | 'overlay'>('overlay')
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string>()

  // Listen for completion / error to clear busy state
  useEffect(() => {
    const onComplete = (): void => {
      console.log('niimath complete called')
      setBusy(false)
    }
    const onError = (_e: unknown, _id: string, msg: string): void => {
      setBusy(false)
      setError(msg)
    }

    window.electron.ipcRenderer.on('niimath:toolbar-complete', onComplete)
    window.electron.ipcRenderer.on('niimath:error', onError)
    return (): void => {
      window.electron.ipcRenderer.removeListener('niimath:complete', onComplete)
      window.electron.ipcRenderer.removeListener('niimath:error', onError)
    }
  }, [])

  const handleApply = async (): Promise<void> => {
    if (!currentVolume) {
      setError('No volume selected')
      return
    }
    if (!cmd.trim()) {
      setError('Please enter a command')
      return
    }

    setError(undefined)
    setBusy(true)

    const requestId = uuidv4()

    try {
      // 1) Extract raw bytes and convert to Base64
      const uint8 = currentVolume.toUint8Array()
      const inputB64 = Buffer.from(uint8).toString('base64')

      // 2) Build CLI args: flags + output path
      const args = cmd.trim().split(/\s+/)

      // 3) Track insertion mode & index
      modeMap.set(requestId, mode)
      indexMap.set(requestId, selected?.volumes.indexOf(currentVolume) ?? 0)

      // 4) Send to main: requestId, args, and input Base64
      window.electron.ipcRenderer.invoke('niimath:start', requestId, args, {
        base64: inputB64,
        name: currentVolume.name
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`Failed to encode volume: ${msg}`)
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 border-b">
      <input
        type="text"
        className="flex-1 px-2 py-1 border rounded"
        value={cmd}
        onChange={(e) => setCmd(e.target.value)}
        disabled={busy || !currentVolume}
      />

      <select
        className="px-2 py-1 border rounded"
        value={mode}
        onChange={(e) => setMode(e.target.value as 'replace' | 'overlay')}
        disabled={busy || !currentVolume}
      >
        <option value="replace">Replace</option>
        <option value="overlay">Overlay</option>
      </select>

      <button
        className={`px-3 py-1 rounded ${
          busy || !cmd.trim() || !currentVolume ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'
        } text-white`}
        onClick={handleApply}
        disabled={busy || !cmd.trim() || !currentVolume}
      >
        {busy ? 'Running…' : 'Run'}
      </button>
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  )
}
