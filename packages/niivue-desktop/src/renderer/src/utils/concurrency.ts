/**
 * Run async tasks with a concurrency limit (worker-pool pattern).
 * Each task is pulled from a shared queue; `onComplete` fires per-task for progress updates.
 */
export async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number,
  onComplete?: (result: T, index: number) => void
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const i = nextIndex++
      const result = await tasks[i]()
      results[i] = result
      onComplete?.(result, i)
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  await Promise.all(workers)
  return results
}

/** Sensible default concurrency limit */
export const defaultConcurrency = Math.min(navigator?.hardwareConcurrency || 2, 4)
