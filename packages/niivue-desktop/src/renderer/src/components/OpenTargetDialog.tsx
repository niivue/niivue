import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'

interface OpenTargetDialogProps {
  open: boolean
  onNewDocument: () => void
  onAddToCurrent: () => void
  onCancel: () => void
}

export const OpenTargetDialog: React.FC<OpenTargetDialogProps> = ({
  open,
  onNewDocument,
  onAddToCurrent,
  onCancel
}) => {
  return (
    <Dialog.Root modal open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <Dialog.Portal>
        <Dialog.Overlay className="bg-black/40 fixed inset-0 z-[60]" />
        <Dialog.Content className="fixed inset-0 flex items-center justify-center z-[60]">
          <div className="bg-[var(--color-background)] rounded shadow-lg w-[400px] max-w-[95vw] p-6">
            <Dialog.Title className="text-lg font-semibold mb-2">Open Image</Dialog.Title>
            <Dialog.Description className="text-sm text-[var(--gray-10)] mb-6">
              The current document already has images loaded. Would you like to open in a new document or add to the current one?
            </Dialog.Description>
            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 text-sm text-[var(--gray-10)] hover:text-[var(--gray-12)] rounded border border-[var(--gray-6)] hover:bg-[var(--gray-3)]"
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 text-sm text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded"
                onClick={onAddToCurrent}
              >
                Add to Current
              </button>
              <button
                className="px-4 py-2 text-sm text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded"
                onClick={onNewDocument}
              >
                New Document
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
