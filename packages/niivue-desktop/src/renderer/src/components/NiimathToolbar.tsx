// src/components/NiimathToolbar.tsx
import { useState } from 'react'
import { Niivue, NVImage } from '@niivue/niivue'
import { Niimath } from '@niivue/niimath'
import { applyNiimathCommand } from '@renderer/utils/niimathHelpers.js'
import { useSelectedInstance } from '../AppContext.js'

export function NiimathToolbar({ nv, niimath }: { nv: Niivue; niimath: Niimath }): JSX.Element {
  const selected = useSelectedInstance()
  const currentVolume: NVImage | null = selected?.selectedImage ?? selected?.volumes[0] ?? null

  const [cmd, setCmd] = useState<string>('')
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>()

  const handleApply = async (): Promise<void> => {
    if (!currentVolume) {
      setError('No volume selected')
      return
    }
    setError(undefined)
    setBusy(true)
    try {
      await applyNiimathCommand(nv, niimath, cmd, currentVolume, { asOverlay: false })
    } catch (e: any) {
      console.error('Full Niimath error:', e) // <— inspect this in DevTools
      // ensure we turn it into a string
      const msg = e instanceof Error ? e.message : JSON.stringify(e, Object.getOwnPropertyNames(e))
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center space-x-2 p-2 bg-gray-100 border-b">
      <input
        type="text"
        className="flex-1 px-2 py-1 border rounded"
        placeholder="e.g. -uthr 180"
        value={cmd}
        onChange={(e) => setCmd(e.target.value)}
        disabled={busy || !currentVolume}
      />
      <button
        className={`px-3 py-1 rounded ${busy || !currentVolume ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-500'} text-white`}
        onClick={handleApply}
        disabled={busy || !cmd.trim() || !currentVolume}
      >
        {busy ? 'Running…' : 'Run'}
      </button>
      {error && <span className="text-red-600 text-sm">{error}</span>}
    </div>
  )
}
