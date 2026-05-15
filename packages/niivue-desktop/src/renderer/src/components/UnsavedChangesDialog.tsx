import React from 'react'
import { Dialog, Button, Flex } from '@radix-ui/themes'

interface UnsavedChangesDialogProps {
  open: boolean
  documentTitle: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export const UnsavedChangesDialog: React.FC<UnsavedChangesDialogProps> = ({
  open,
  documentTitle,
  onSave,
  onDiscard,
  onCancel
}) => {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel()
      }}
    >
      <Dialog.Content maxWidth="420px">
        <Dialog.Title>Unsaved Changes</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Save changes to &ldquo;{documentTitle}&rdquo; before continuing?
        </Dialog.Description>
        <Flex justify="end" gap="3">
          <Button variant="soft" color="gray" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="soft" color="red" onClick={onDiscard}>
            Don&apos;t Save
          </Button>
          <Button onClick={onSave}>Save</Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
