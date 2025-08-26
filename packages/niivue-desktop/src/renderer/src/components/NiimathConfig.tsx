'use client'

import { useState } from 'react'
import { Box, Flex, Text, Button, Select, Card, Badge, Tooltip, IconButton } from '@radix-ui/themes'
import { Cross2Icon, PlusIcon, InfoCircledIcon } from '@radix-ui/react-icons'

export interface NiimathOperation {
  operator: string
  args: string[]
  description: string
}

interface NiimathConfigProps {
  operations: NiimathOperation[]
  onOperationsChange: (operations: NiimathOperation[]) => void
}

interface OperatorDef {
  name: string
  description: string
  args: string[]
  argDescriptions?: string[]
  example: string
}

const NIIMATH_OPERATORS: OperatorDef[] = [
  { name: '-ceil', description: 'Round up to nearest integer', args: [], example: '-ceil' },
  { name: '-floor', description: 'Round down to nearest integer', args: [], example: '-floor' },
  { name: '-round', description: 'Round to nearest integer', args: [], example: '-round' },
  { name: '-abs', description: 'Absolute value', args: [], example: '-abs' },
  {
    name: '-bandpass',
    description: 'Temporal bandpass filter',
    args: ['hp', 'lp', 'tr'],
    argDescriptions: ['High-pass cutoff (Hz)', 'Low-pass cutoff (Hz)', 'TR (seconds)'],
    example: '-bandpass 0.01 0.1 2.0'
  },
  {
    name: '-smooth',
    description: 'Gaussian smoothing',
    args: ['fwhm'],
    argDescriptions: ['FWHM in mm'],
    example: '-smooth 6.0'
  },
  {
    name: '-add',
    description: 'Add constant value',
    args: ['value'],
    argDescriptions: ['Value to add'],
    example: '-add 100'
  },
  {
    name: '-sub',
    description: 'Subtract constant value',
    args: ['value'],
    argDescriptions: ['Value to subtract'],
    example: '-sub 50'
  },
  {
    name: '-mul',
    description: 'Multiply by constant value',
    args: ['value'],
    argDescriptions: ['Value to multiply by'],
    example: '-mul 2.0'
  },
  {
    name: '-div',
    description: 'Divide by constant value',
    args: ['value'],
    argDescriptions: ['Value to divide by'],
    example: '-div 1000'
  },
  {
    name: '-thr',
    description: 'Threshold (set values below threshold to zero)',
    args: ['threshold'],
    argDescriptions: ['Threshold value'],
    example: '-thr 0.5'
  },
  {
    name: '-uthr',
    description: 'Upper threshold (set values above threshold to zero)',
    args: ['threshold'],
    argDescriptions: ['Upper threshold value'],
    example: '-uthr 1000'
  },
  { name: '-bin', description: 'Binarize (set non-zero values to 1)', args: [], example: '-bin' },
  {
    name: '-mask',
    description: 'Apply mask',
    args: ['mask_file'],
    argDescriptions: ['Path to mask file'],
    example: '-mask mask.nii'
  }
]

export default function NiimathConfig({
  operations,
  onOperationsChange
}: NiimathConfigProps): JSX.Element {
  const [selectedOperator, setSelectedOperator] = useState<string>('')

  const addOperation = (): void => {
    if (!selectedOperator) return
    const operatorInfo = NIIMATH_OPERATORS.find((op) => op.name === selectedOperator)
    if (!operatorInfo) return

    const newOperation: NiimathOperation = {
      operator: selectedOperator,
      args: new Array(operatorInfo.args.length).fill(''),
      description: operatorInfo.description
    }
    onOperationsChange([...operations, newOperation])
    setSelectedOperator('')
  }

  const removeOperation = (index: number): void => {
    const newOperations = operations.filter((_, i) => i !== index)
    onOperationsChange(newOperations)
  }

  const updateOperationArg = (operationIndex: number, argIndex: number, value: string): void => {
    const newOperations = [...operations]
    newOperations[operationIndex].args[argIndex] = value
    onOperationsChange(newOperations)
  }

  const generateCommand = (): string => {
    if (operations.length === 0) return 'niimath input.nii output.nii'
    const operationsStr = operations
      .map((op) => {
        const args = op.args.filter((arg) => arg.trim() !== '').join(' ')
        return args ? `${op.operator} ${args}` : op.operator
      })
      .join(' ')
    return `niimath input.nii ${operationsStr} output.nii`
  }

  return (
    <Box className="space-y-4">
      {/* Add operator */}
      <Card>
        <Flex direction="column" gap="3">
          <Text weight="medium">Add Operation</Text>
          <Text size="2" color="gray">
            Select a niimath operator to add to the processing pipeline
          </Text>

          <Flex gap="2" align="center">
            <Select.Root
              value={selectedOperator}
              onValueChange={(val: string): void => setSelectedOperator(val)}
            >
              <Select.Trigger placeholder="Select operator..." />
              <Select.Content>
                {NIIMATH_OPERATORS.map((op) => (
                  <Select.Item key={op.name} value={op.name}>
                    <Flex justify="between" width="100%">
                      <Text size="2" weight="medium" className="font-mono">
                        {op.name}
                      </Text>
                      <Text size="1" color="gray">
                        {op.description}
                      </Text>
                    </Flex>
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Button onClick={addOperation} disabled={!selectedOperator} size="2">
              <PlusIcon />
            </Button>
          </Flex>

          {selectedOperator && (
            <Box p="2" style={{ background: '#f9fafb' }} className="rounded-md">
              <Flex gap="2" align="center">
                <Text as="span" className="font-mono text-sm">
                  {NIIMATH_OPERATORS.find((op) => op.name === selectedOperator)?.example}
                </Text>
                <Tooltip
                  content={
                    NIIMATH_OPERATORS.find((op) => op.name === selectedOperator)?.description
                  }
                >
                  <InfoCircledIcon />
                </Tooltip>
              </Flex>
            </Box>
          )}
        </Flex>
      </Card>

      {/* Pipeline */}
      {operations.length > 0 && (
        <Card>
          <Flex direction="column" gap="3">
            <Text weight="medium">Processing Pipeline</Text>
            <Text size="2" color="gray">
              Operations will be applied in the order shown
            </Text>

            {operations.map((operation, operationIndex) => {
              const operatorInfo = NIIMATH_OPERATORS.find((op) => op.name === operation.operator)
              return (
                <Box key={operationIndex} className="border rounded-md p-3 space-y-3">
                  <Flex justify="between" align="center">
                    <Flex gap="2" align="center">
                      <Badge color="gray">{operation.operator}</Badge>
                      <Text size="2" color="gray">
                        {operation.description}
                      </Text>
                    </Flex>
                    <IconButton
                      variant="ghost"
                      size="1"
                      onClick={(): void => removeOperation(operationIndex)}
                    >
                      <Cross2Icon />
                    </IconButton>
                  </Flex>

                  {operatorInfo && operatorInfo.args.length > 0 && (
                    <Flex direction="column" gap="2">
                      {operatorInfo.args.map((argName, argIndex) => (
                        <Flex key={argIndex} gap="2" align="center">
                          <Text size="1" weight="medium">
                            {argName}:
                          </Text>
                          <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm font-mono w-full"
                            placeholder={operatorInfo.argDescriptions?.[argIndex] || argName}
                            value={operation.args[argIndex] || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>): void =>
                              updateOperationArg(operationIndex, argIndex, e.target.value)
                            }
                          />
                        </Flex>
                      ))}
                    </Flex>
                  )}
                </Box>
              )
            })}
          </Flex>
        </Card>
      )}

      {/* Generated command */}
      {operations.length > 0 && (
        <Card>
          <Flex direction="column" gap="2">
            <Text weight="medium">Generated Command</Text>
            <Text size="2" color="gray">
              Preview of the niimath command that will be executed
            </Text>
            <Box
              className="rounded-md font-mono text-sm p-2"
              style={{ background: '#f4f4f5', wordBreak: 'break-word' }}
            >
              {generateCommand()}
            </Box>
          </Flex>
        </Card>
      )}
    </Box>
  )
}
