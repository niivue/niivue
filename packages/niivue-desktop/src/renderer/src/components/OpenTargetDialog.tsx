import React from 'react'
import { Dialog, Button, Flex, Text } from '@radix-ui/themes'

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
    <Dialog.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onCancel()
      }}
    >
      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Open Image</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          The current document already has images loaded. Would you like to open in a new document
          or add to the current one?
        </Dialog.Description>
        <Flex justify="end" gap="3">
          <Button variant="soft" color="gray" onClick={onCancel}>
            <Text>Cancel</Text>
          </Button>
          <Button onClick={onAddToCurrent}>
            <Text>Add to Current</Text>
          </Button>
          <Button onClick={onNewDocument}>
            <Text>New Document</Text>
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  )
}
