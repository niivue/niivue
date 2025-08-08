// src/components/PreferencesDialog.tsx
import React, { useEffect, useState, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import Draggable from 'react-draggable'
import { Preferences } from './Preferences.js'
import { Cross2Icon } from '@radix-ui/react-icons'
import { registerPreferencesDialogHandler } from '../ipcHandlers/menuHandlers.js'
import { Theme } from '@radix-ui/themes'

export const PreferencesDialog: React.FC = () => {
  const [open, setOpen] = useState(false)
  const nodeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    registerPreferencesDialogHandler(setOpen)
    return (): void => {
      window.electron.ipcRenderer.removeAllListeners('openPreferencesDialog')
    }
  }, [])

  return (
    <Dialog.Root modal open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/40 fixed inset-0 z-40" />
        {/* Center the dialog */}
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-50">
          {/* Draggable plain div */}
          <Draggable nodeRef={nodeRef} handle=".drag-handle" cancel=".no-drag">
            <div
              ref={nodeRef}
              className="bg-white rounded shadow-lg max-h-[90vh] w-[800px] max-w-[95vw] overflow-y-auto p-6"
            >
              <Theme>
                {/* Header is the drag handle */}
                <div className="drag-handle flex items-center justify-between mb-4 cursor-move">
                  <Dialog.Title className="text-lg font-semibold">Preferences</Dialog.Title>
                  <Dialog.Close asChild>
                    <button
                      className="no-drag text-gray-500 hover:text-black"
                      aria-label="Close"
                      onClick={() => setOpen(false)}
                    >
                      <Cross2Icon />
                    </button>
                  </Dialog.Close>
                </div>
                <Preferences onClose={() => setOpen(false)} />
              </Theme>
            </div>
          </Draggable>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default PreferencesDialog
