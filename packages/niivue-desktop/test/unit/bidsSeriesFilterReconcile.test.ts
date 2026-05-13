import { describe, it, expect } from 'vitest'
import { reconcileSelectionAgainstVisible } from '../../src/renderer/src/components/BidsSeriesFilter.js'

describe('reconcileSelectionAgainstVisible', () => {
  it('adds newly-visible series to the selection (facet widening)', () => {
    // Subject A series (1,2) already selected; widening the facet reveals
    // subject B series (3,4) — both should be auto-included.
    const next = reconcileSelectionAgainstVisible(
      new Set([1, 2]),
      new Set([1, 2]),
      new Set([1, 2, 3, 4])
    )
    expect(next).toEqual(new Set([1, 2, 3, 4]))
  })

  it('removes newly-hidden series from the selection (facet narrowing)', () => {
    // Subject A+B selected; narrowing facet to subject A hides (3,4) — drop them.
    const next = reconcileSelectionAgainstVisible(
      new Set([1, 2, 3, 4]),
      new Set([1, 2, 3, 4]),
      new Set([1, 2])
    )
    expect(next).toEqual(new Set([1, 2]))
  })

  it('handles simultaneous widening + narrowing (subject swap)', () => {
    // Was showing subject A (1,2), all selected. Switch facet to subject B (3,4):
    // remove A, add B.
    const next = reconcileSelectionAgainstVisible(
      new Set([1, 2]),
      new Set([1, 2]),
      new Set([3, 4])
    )
    expect(next).toEqual(new Set([3, 4]))
  })

  it('does not re-add a newly-visible series the user has explicitly checked', () => {
    // 1 is in both prev and next visible; user has it selected. Stays selected.
    const next = reconcileSelectionAgainstVisible(
      new Set([1]),
      new Set([1]),
      new Set([1, 2])
    )
    // 2 is newly visible → added. 1 stays.
    expect(next).toEqual(new Set([1, 2]))
  })

  it('returns null when no diff causes a selection change', () => {
    // Same visible set on both sides + selection already covers everything.
    const out = reconcileSelectionAgainstVisible(
      new Set([1, 2]),
      new Set([1, 2]),
      new Set([1, 2])
    )
    expect(out).toBeNull()
  })

  it('does not add a newly-visible series that is already selected', () => {
    // 3 is newly visible but somehow already in selection (race / external write);
    // should not flag a change.
    const out = reconcileSelectionAgainstVisible(
      new Set([1, 2, 3]),
      new Set([1, 2]),
      new Set([1, 2, 3])
    )
    expect(out).toBeNull()
  })

  it('does not remove a newly-hidden series that is already absent from selection', () => {
    // User had deselected 3 earlier; now 3 becomes hidden — no change needed.
    const out = reconcileSelectionAgainstVisible(
      new Set([1, 2]),
      new Set([1, 2, 3]),
      new Set([1, 2])
    )
    expect(out).toBeNull()
  })
})
