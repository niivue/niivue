import * as Dialog from '@radix-ui/react-dialog'
import { Button, Flex, Progress, Text } from '@radix-ui/themes'
import { Cross2Icon } from '@radix-ui/react-icons'

interface SegmentationDialogProps {
  open: boolean
  progress: number
  status: string
  modelName: string
  onCancel: () => void
  canCancel: boolean
}

export function SegmentationDialog({
  open,
  progress,
  status,
  modelName,
  onCancel,
  canCancel
}: SegmentationDialogProps): JSX.Element {
  return (
    <Dialog.Root open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg">
          <Flex direction="column" gap="4">
            {/* Header */}
            <Flex justify="between" align="center">
              <Dialog.Title asChild>
                <Text size="5" weight="bold">
                  Running Brain Segmentation
                </Text>
              </Dialog.Title>
              {canCancel && (
                <Dialog.Close asChild>
                  <button
                    className="rounded-full p-1 hover:bg-gray-100"
                    aria-label="Close"
                    onClick={onCancel}
                  >
                    <Cross2Icon />
                  </button>
                </Dialog.Close>
              )}
            </Flex>

            {/* Model Info */}
            <Flex direction="column" gap="2">
              <Text size="2" color="gray">
                Model:
              </Text>
              <Text size="3" weight="medium">
                {modelName}
              </Text>
            </Flex>

            {/* Progress Bar */}
            <Flex direction="column" gap="2">
              <Flex justify="between" align="center">
                <Text size="2" color="gray">
                  Progress
                </Text>
                <Text size="2" weight="bold">
                  {Math.round(progress)}%
                </Text>
              </Flex>
              <Progress value={progress} max={100} size="3" />
            </Flex>

            {/* Status Message */}
            <Flex direction="column" gap="1">
              <Text size="2" color="gray">
                Status:
              </Text>
              <Text size="2">{status}</Text>
            </Flex>

            {/* Cancel Button */}
            {canCancel && (
              <Flex justify="end">
                <Button variant="soft" color="red" onClick={onCancel}>
                  Cancel
                </Button>
              </Flex>
            )}

            {/* Info */}
            <Flex
              direction="column"
              gap="1"
              p="3"
              style={{ backgroundColor: 'var(--gray-3)', borderRadius: '6px' }}
            >
              <Text size="1" color="gray">
                Processing may take several seconds depending on your hardware and the selected
                model. The result will be added as an overlay when complete.
              </Text>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
