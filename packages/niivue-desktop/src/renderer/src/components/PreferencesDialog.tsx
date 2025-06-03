import React, { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Preferences } from './Preferences'
import { Cross2Icon } from '@radix-ui/react-icons'
import { registerPreferencesDialogHandler } from '../ipcHandlers/menuHandlers'
import { Theme } from '@radix-ui/themes'

export const PreferencesDialog: React.FC = () => {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    registerPreferencesDialogHandler(setOpen)
    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('openPreferencesDialog')
    }
  }, [])

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/40 fixed inset-0 z-40" />
        <Dialog.Content className="bg-white rounded shadow-lg fixed z-50 top-1/2 left-1/2 max-h-[90vh] w-[800px] max-w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-6">
          <Theme>
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-lg font-semibold">Preferences</Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-500 hover:text-black" aria-label="Close">
                  <Cross2Icon />
                </button>
              </Dialog.Close>
            </div>
            <Preferences onClose={() => setOpen(false)} />
          </Theme>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
