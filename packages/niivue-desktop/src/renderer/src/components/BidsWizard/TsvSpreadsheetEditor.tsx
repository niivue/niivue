import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Spreadsheet, type CellBase, type Matrix } from 'react-spreadsheet'
import { Button, Callout, Text } from '@radix-ui/themes'
import { InfoCircledIcon } from '@radix-ui/react-icons'

const electron = window.electron

type Cell = CellBase<string>

interface ReadResult {
  success: boolean
  grid?: string[][]
  raw?: string
  error?: string
}

interface WriteResult {
  success: boolean
  error?: string
}

function gridToCells(grid: string[][]): Matrix<Cell> {
  // Spreadsheet expects a rectangular matrix; pad short rows so editing the
  // last column of a short row still renders a cell.
  const width = grid.reduce((acc, row) => Math.max(acc, row.length), 0)
  return grid.map((row) => {
    const cells: (Cell | undefined)[] = []
    for (let i = 0; i < width; i++) {
      cells.push({ value: row[i] ?? '' })
    }
    return cells
  })
}

function cellsToGrid(cells: Matrix<Cell>): string[][] {
  return cells.map((row) => row.map((c) => (c?.value ?? '').toString()))
}

function gridsEqual(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) return false
    }
  }
  return true
}

interface Props {
  tsvPath: string
  bidsPath: string
  filename: string
  /**
   * Fired when this editor instance is torn down (component unmount or
   * `tsvPath` change) after at least one successful save during its
   * lifetime. The parent uses this to re-run the validator only when the
   * on-disk state actually changed — avoiding a re-validate per click and
   * per individual Save press.
   */
  onCloseAfterSave?: () => void
}

export function TsvSpreadsheetEditor({
  tsvPath,
  bidsPath,
  filename,
  onCloseAfterSave
}: Props): React.ReactElement {
  const [cells, setCells] = useState<Matrix<Cell>>([])
  const [originalGrid, setOriginalGrid] = useState<string[][]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Track whether this editor instance saved to disk at least once so the
  // cleanup effect can decide whether re-running the validator is worthwhile.
  const savedDuringLifetimeRef = useRef(false)
  // Hold the latest onCloseAfterSave in a ref so the cleanup effect doesn't
  // re-fire each time the callback identity changes — we only want it to run
  // on actual unmount/path change.
  const onCloseRef = useRef(onCloseAfterSave)
  useEffect(() => {
    onCloseRef.current = onCloseAfterSave
  }, [onCloseAfterSave])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setSavedAt(null)
    savedDuringLifetimeRef.current = false
    void (async (): Promise<void> => {
      const res = (await electron.ipcRenderer.invoke('bids:read-tsv', tsvPath)) as ReadResult
      if (cancelled) return
      if (!res?.success || !res.grid) {
        setError(res?.error ?? 'Failed to read TSV')
        setCells([])
        setOriginalGrid([])
      } else {
        setOriginalGrid(res.grid)
        setCells(gridToCells(res.grid))
      }
      setLoading(false)
    })()
    return (): void => {
      cancelled = true
      // Closing the editor (unmount or switching to a different TSV) re-runs
      // the validator only when this instance actually wrote to disk.
      if (savedDuringLifetimeRef.current) {
        onCloseRef.current?.()
      }
    }
  }, [tsvPath])

  const handleSave = useCallback(async (): Promise<void> => {
    setSaving(true)
    setError(null)
    const grid = cellsToGrid(cells)
    const res = (await electron.ipcRenderer.invoke('bids:write-tsv', {
      path: tsvPath,
      grid
    })) as WriteResult
    setSaving(false)
    if (!res?.success) {
      setError(res?.error ?? 'Failed to write TSV')
      return
    }
    setOriginalGrid(grid)
    setSavedAt(Date.now())
    savedDuringLifetimeRef.current = true
  }, [cells, tsvPath])

  const handleAddRow = useCallback(() => {
    setCells((prev) => {
      const width = prev[0]?.length ?? 1
      const newRow: Cell[] = Array.from({ length: width }, () => ({ value: '' }))
      return [...prev, newRow]
    })
  }, [])

  const handleAddColumn = useCallback(() => {
    setCells((prev) => prev.map((row) => [...row, { value: '' }]))
  }, [])

  const handleRevert = useCallback(() => {
    setCells(gridToCells(originalGrid))
    setError(null)
  }, [originalGrid])

  const dirty = !gridsEqual(cellsToGrid(cells), originalGrid)

  if (loading) {
    return (
      <div className="border border-[var(--gray-5)] rounded p-3" style={{ minHeight: 240 }}>
        <Text size="1" color="gray">
          Loading {filename}…
        </Text>
      </div>
    )
  }

  return (
    <div
      className="border border-[var(--gray-5)] rounded p-3 flex flex-col gap-3"
      style={{ minHeight: 240 }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Text size="2" weight="medium">
          {filename}
        </Text>
        <Text size="1" color="gray" className="font-mono truncate" title={bidsPath}>
          {bidsPath}
        </Text>
      </div>

      {error && (
        <Callout.Root color="red" size="1">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <div className="overflow-auto" style={{ maxHeight: 360 }}>
        <Spreadsheet data={cells} onChange={setCells} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="1" onClick={() => void handleSave()} disabled={saving || !dirty}>
          {saving ? 'Saving TSV…' : 'Save TSV'}
        </Button>
        <Button size="1" variant="soft" onClick={handleRevert} disabled={saving || !dirty}>
          Revert
        </Button>
        <Button size="1" variant="soft" onClick={handleAddRow} disabled={saving}>
          + Row
        </Button>
        <Button size="1" variant="soft" onClick={handleAddColumn} disabled={saving}>
          + Column
        </Button>
      </div>

      {savedAt !== null && !dirty && (
        <Text size="1" color="green">
          Saved.
        </Text>
      )}
    </div>
  )
}
