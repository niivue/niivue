import * as Dialog from '@radix-ui/react-dialog'
import { Button, Flex, Progress, Text, Theme } from '@radix-ui/themes'
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
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center">
          <Theme>
            <div className="bg-[var(--color-background)] border border-[var(--gray-6)] rounded-lg shadow-xl w-[480px] max-w-[90vw] p-6">
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
                        className="rounded-full p-1 hover:bg-[var(--gray-4)]"
                        aria-label="Close"
                        onClick={onCancel}
                      >
                        <Cross2Icon />
                      </button>
                    </Dialog.Close>
                  )}
                </Flex>

                {/* Model Info */}
                <Flex direction="column" gap="1">
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
                <div className="bg-[var(--gray-3)] rounded-md p-3">
                  <Text size="1" color="gray">
                    Processing may take several seconds depending on your hardware and the selected
                    model. The result will be added as an overlay when complete.
                  </Text>
                </div>
              </Flex>
            </div>
          </Theme>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
