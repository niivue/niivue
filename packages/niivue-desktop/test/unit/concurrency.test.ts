import { describe, it, expect, vi } from 'vitest'
import { runWithConcurrency } from '../../src/renderer/src/utils/concurrency'

/** Helper: create a task that resolves after `ms` milliseconds with `value`. */
function delayedTask<T>(value: T, ms: number): () => Promise<T> {
  return () => new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

describe('runWithConcurrency', () => {
  it('returns results in original order regardless of completion order', async () => {
    // Task 0 is slowest, task 2 is fastest -- results must still be [0, 1, 2]
    const tasks = [
      delayedTask('a', 60),
      delayedTask('b', 30),
      delayedTask('c', 10),
    ]

    const results = await runWithConcurrency(tasks, 3)
    expect(results).toEqual(['a', 'b', 'c'])
  })

  it('respects the concurrency limit', async () => {
    let running = 0
    let maxRunning = 0

    const makeTask = (id: number) => () =>
      new Promise<number>((resolve) => {
        running++
        if (running > maxRunning) maxRunning = running
        setTimeout(() => {
          running--
          resolve(id)
        }, 30)
      })

    const tasks = Array.from({ length: 6 }, (_, i) => makeTask(i))
    await runWithConcurrency(tasks, 2)

    expect(maxRunning).toBe(2)
  })

  it('returns empty array for empty task list', async () => {
    const results = await runWithConcurrency([], 4)
    expect(results).toEqual([])
  })

  it('handles a single task', async () => {
    const results = await runWithConcurrency([delayedTask(42, 5)], 4)
    expect(results).toEqual([42])
  })

  it('works when limit is larger than task count', async () => {
    const tasks = [delayedTask('x', 5), delayedTask('y', 5)]
    const results = await runWithConcurrency(tasks, 100)
    expect(results).toEqual(['x', 'y'])
  })

  it('fires onComplete callback for each task with correct index and result', async () => {
    const onComplete = vi.fn()

    const tasks = [delayedTask('a', 10), delayedTask('b', 10), delayedTask('c', 10)]
    await runWithConcurrency(tasks, 2, onComplete)

    expect(onComplete).toHaveBeenCalledTimes(3)
    // Verify each call received the right (result, index) pair
    const calls = onComplete.mock.calls as [string, number][]
    const byIndex = calls.sort((a, b) => a[1] - b[1])
    expect(byIndex).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })

  it('propagates errors from a failed task', async () => {
    const tasks = [
      delayedTask('ok', 5),
      () => Promise.reject(new Error('boom')),
      delayedTask('also ok', 5),
    ]

    await expect(runWithConcurrency(tasks, 2)).rejects.toThrow('boom')
  })

  it('completes all tasks with limit=1 (sequential execution)', async () => {
    let running = 0
    let maxRunning = 0
    const order: number[] = []

    const makeTask = (id: number) => () =>
      new Promise<number>((resolve) => {
        running++
        if (running > maxRunning) maxRunning = running
        order.push(id)
        setTimeout(() => {
          running--
          resolve(id)
        }, 10)
      })

    const tasks = Array.from({ length: 4 }, (_, i) => makeTask(i))
    const results = await runWithConcurrency(tasks, 1)

    expect(maxRunning).toBe(1)
    expect(order).toEqual([0, 1, 2, 3])
    expect(results).toEqual([0, 1, 2, 3])
  })
})
