import { useEffect, useState } from 'react'
import { NVImage } from '@niivue/niivue'
import { v4 as uuidv4 } from 'uuid'
import { useSelectedInstance } from '../AppContext.js'
import NiimathConfig, { NiimathOperation } from './NiimathConfig.js'

import { Box, Flex, Button, Select, Text, Callout, IconButton } from '@radix-ui/themes'
import * as Collapsible from '@radix-ui/react-collapsible'
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons'

interface NiimathToolbarProps {
  modeMap: Map<string, 'replace' | 'overlay'>
  indexMap: Map<string, number>
}

export function NiimathToolbar({ modeMap, indexMap }: NiimathToolbarProps): JSX.Element {
  const selected = useSelectedInstance()
  const currentVolume: NVImage | null = selected?.selectedImage ?? selected?.volumes[0] ?? null

  const [operations, setOperations] = useState<NiimathOperation[]>([])
  const [mode, setMode] = useState<'replace' | 'overlay'>('overlay')
  const [busy, setBusy] = useState<boolean>(false)
  const [error, setError] = useState<string>()
  const [command, setCommand] = useState<string>('niimath input.nii output.nii')
  const [open, setOpen] = useState<boolean>(true) // expanded toolbar
  const [cmdOpen, setCmdOpen] = useState<boolean>(true) // command preview

  const buildArgs = (): string[] => {
    return operations.flatMap((op) => {
      const args = op.args.filter((a) => a.trim() !== '')
      return [op.operator, ...args]
    })
  }

  // Update command when operations change
  useEffect((): void => {
    if (operations.length === 0) {
      setCommand('niimath input.nii output.nii')
      return
    }
    const args = buildArgs().join(' ')
    setCommand(`niimath input.nii ${args} output.nii`)
  }, [operations])

  // IPC listeners
  useEffect((): (() => void) => {
    const onComplete = (): void => setBusy(false)
    const onError = (_e: unknown, _id: string, msg: string): void => {
      setBusy(false)
      setError(msg)
    }

    window.electron.ipcRenderer.on('niimath:toolbar-complete', onComplete)
    window.electron.ipcRenderer.on('niimath:error', onError)
    return (): void => {
      window.electron.ipcRenderer.removeListener('niimath:toolbar-complete', onComplete)
      window.electron.ipcRenderer.removeListener('niimath:error', onError)
    }
  }, [])

  const handleApply = async (): Promise<void> => {
    if (!currentVolume) {
      setError('No volume selected')
      return
    }
    if (operations.length === 0) {
      setError('Please add at least one operation')
      return
    }

    setError(undefined)
    setBusy(true)

    const requestId = uuidv4()
    try {
      const uint8 = currentVolume.toUint8Array()
      const inputB64 = Buffer.from(uint8).toString('base64')

      const args = buildArgs()

      modeMap.set(requestId, mode)
      indexMap.set(requestId, selected?.volumes.indexOf(currentVolume) ?? 0)

      await window.electron.ipcRenderer.invoke('niimath:start', requestId, args, {
        base64: inputB64,
        name: currentVolume.name
      })

      // ✅ Clear after run
      setOperations([])
      setCmdOpen(false) // collapse command preview
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(`Failed to encode volume: ${msg}`)
      setBusy(false)
    }
  }

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen}>
      {/* Toolbar header row */}
      <Flex align="center" justify="between" className="p-2 bg-gray-200 border-b">
        <Text weight="medium">Niimath Toolbar</Text>
        <IconButton size="1" variant="ghost" onClick={(): void => setOpen(!open)}>
          {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </IconButton>
      </Flex>

      <Collapsible.Content>
        <Box className="p-3 bg-gray-100 space-y-4">
          <NiimathConfig operations={operations} onOperationsChange={setOperations} />

          <Flex gap="3" align="center">
            <Select.Root
              value={mode}
              onValueChange={(val: string): void => setMode(val as 'replace' | 'overlay')}
              disabled={busy || !currentVolume}
            >
              <Select.Trigger />
              <Select.Content>
                <Select.Item value="replace">Replace</Select.Item>
                <Select.Item value="overlay">Overlay</Select.Item>
              </Select.Content>
            </Select.Root>

            <Button
              disabled={busy || operations.length === 0 || !currentVolume}
              onClick={handleApply}
            >
              {busy ? 'Running…' : 'Run'}
            </Button>

            {error && (
              <Callout.Root color="red" variant="soft">
                <Callout.Text>{error}</Callout.Text>
              </Callout.Root>
            )}
          </Flex>

          {/* Collapsible Generated Command */}
          {operations.length > 0 && (
            <Collapsible.Root open={cmdOpen} onOpenChange={setCmdOpen}>
              <Flex justify="between" align="center">
                <Text size="2" weight="medium">
                  Generated Command
                </Text>
                <IconButton size="1" variant="ghost" onClick={(): void => setCmdOpen(!cmdOpen)}>
                  {cmdOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </IconButton>
              </Flex>
              <Collapsible.Content>
                <Box
                  className="mt-2 p-2 rounded-md font-mono text-sm"
                  style={{ background: '#f4f4f5', wordBreak: 'break-word' }}
                >
                  {command}
                </Box>
              </Collapsible.Content>
            </Collapsible.Root>
          )}
        </Box>
      </Collapsible.Content>
    </Collapsible.Root>
  )
}
