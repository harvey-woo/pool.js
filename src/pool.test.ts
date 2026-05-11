import {
  Pool,
  Scheduler,
  ResourceContainer,
  NoResourceAvailableError,
  isNoResourceAvailableError
} from './index'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('ResourceContainer', () => {
  it('should wrap a value and release on dispose', () => {
    let released = false
    const container = new ResourceContainer({
      value: 42,
      release: (v) => {
        released = true
        expect(v).toBe(42)
      }
    })

    expect(container.value).toBe(42)
    container[Symbol.dispose]()
    expect(released).toBe(true)
  })
})

describe('Pool - construction', () => {
  it('should create pool with a number as concurrency', () => {
    const pool = new Pool(3)
    expect(pool).toBeInstanceOf(Pool)
  })

  it('should create pool with options object', () => {
    const pool = new Pool({
      concurrency: 5,
      create: (i) => ({ id: i })
    })
    expect(pool).toBeInstanceOf(Pool)
  })

  it('should create pool from an array of resources', () => {
    const resources = [1, 2, 3]
    const pool = new Pool(resources)
    expect(pool).toBeInstanceOf(Pool)
  })

  it('should use default create function that returns index', async () => {
    const pool = new Pool(3)
    const res = await pool.acquire()
    expect(res.value).toBe(0)
    res[Symbol.dispose]()
  })

  it('should respect custom create function', async () => {
    const pool = new Pool({
      concurrency: 3,
      create: (i) => `worker-${i}`
    })
    const res = await pool.acquire()
    expect(res.value).toBe('worker-0')
    res[Symbol.dispose]()
  })

  it('should initialize with pre-existing resources from options', async () => {
    const pool = new Pool({
      concurrency: 5,
      create: (i) => i,
      resources: [100, 200]
    })
    const res1 = await pool.acquire()
    const res2 = await pool.acquire()
    const values = [res1.value, res2.value]
    expect(values).toContain(100)
    expect(values).toContain(200)
    res1[Symbol.dispose]()
    res2[Symbol.dispose]()
  })

  it('should create pool from array and return those resources', async () => {
    const items = ['a', 'b', 'c']
    const pool = new Pool(items)
    const res1 = await pool.acquire()
    const res2 = await pool.acquire()
    const res3 = await pool.acquire()
    const values = [res1.value, res2.value, res3.value].sort()
    expect(values).toEqual(['a', 'b', 'c'])
    res1[Symbol.dispose]()
    res2[Symbol.dispose]()
    res3[Symbol.dispose]()
  })
})

describe('Pool - acquire and release', () => {
  it('should acquire a resource and return ResourceContainer', async () => {
    const pool = new Pool(2)
    const res = await pool.acquire()
    expect(res).toBeInstanceOf(ResourceContainer)
    expect(typeof res.value).toBe('number')
    res[Symbol.dispose]()
  })

  it('should release resource back to pool on dispose', async () => {
    const pool = new Pool(1)
    const res1 = await pool.acquire()
    const value1 = res1.value
    res1[Symbol.dispose]()
    const res2 = await pool.acquire()
    expect(res2.value).toBe(value1)
    res2[Symbol.dispose]()
  })

  it('should support explicit dispose without using keyword', async () => {
    const pool = new Pool(1)
    const res = await pool.acquire()
    const value = res.value
    res[Symbol.dispose]()
    const res2 = await pool.acquire()
    expect(res2.value).toBe(value)
    res2[Symbol.dispose]()
  })

  it('should create new resources up to concurrency limit', async () => {
    const created: number[] = []
    const pool = new Pool({
      concurrency: 3,
      create: (i) => {
        created.push(i)
        return i
      }
    })

    const res1 = await pool.acquire()
    const res2 = await pool.acquire()
    const res3 = await pool.acquire()

    expect(created).toEqual([0, 1, 2])
    res1[Symbol.dispose]()
    res2[Symbol.dispose]()
    res3[Symbol.dispose]()
  })

  it('should throw NoResourceAvailableError when wait is false', async () => {
    const pool = new Pool(1)
    const res = await pool.acquire()
    await expect(pool.acquire({ wait: false })).rejects.toThrow(NoResourceAvailableError)
    res[Symbol.dispose]()
  })

  it('isNoResourceAvailableError should work', async () => {
    const pool = new Pool(1)
    const res = await pool.acquire()
    try {
      await pool.acquire({ wait: false })
    } catch (e) {
      expect(isNoResourceAvailableError(e)).toBe(true)
    }
    res[Symbol.dispose]()
  })

  it('should wait for resource when pool is exhausted', async () => {
    const pool = new Pool(1)
    const res1 = await pool.acquire()

    let acquired = false
    const acquirePromise = pool.acquire().then((res) => {
      acquired = true
      res[Symbol.dispose]()
      return res
    })

    await wait(10)
    expect(acquired).toBe(false)

    res1[Symbol.dispose]()
    await acquirePromise
    expect(acquired).toBe(true)
  })

  it('should support abort signal for waiting acquire', async () => {
    const pool = new Pool(1)
    const res = await pool.acquire()

    const controller = new AbortController()
    const acquirePromise = pool.acquire({ abortSignal: controller.signal })

    controller.abort(new Error('cancelled'))
    await expect(acquirePromise).rejects.toThrow('cancelled')

    res[Symbol.dispose]()
  })

  it('should throw immediately if abort signal is already aborted', async () => {
    const pool = new Pool(1)
    const res = await pool.acquire()

    const controller = new AbortController()
    controller.abort(new Error('pre-aborted'))

    await expect(
      pool.acquire({ abortSignal: controller.signal })
    ).rejects.toThrow('pre-aborted')

    res[Symbol.dispose]()
  })
})

describe('Pool - CoolDown', () => {
  it('should call coolDown on resource release', async () => {
    const coolDown = jest.fn().mockResolvedValue(undefined)
    const pool = new Pool({
      concurrency: 1,
      coolDown
    })

    const res = await pool.acquire()
    const acquireAt = Date.now()
    res[Symbol.dispose]()
    await wait(10)

    expect(coolDown).toHaveBeenCalledTimes(1)
    const timing = coolDown.mock.calls[0][0]
    expect(timing.acquireAt).toBe(acquireAt)
    expect(typeof timing.deliverAt).toBe('number')
    expect(typeof timing.releaseAt).toBe('number')
  })

  it('should delay resource availability based on coolDown promise', async () => {
    const pool = new Pool({
      concurrency: 1,
      coolDown: async () => {
        await wait(50)
      }
    })

    const res1 = await pool.acquire()
    res1[Symbol.dispose]()

    const start = Date.now()
    const res2 = await pool.acquire()
    const elapsed = Date.now() - start
    expect(elapsed).toBeGreaterThanOrEqual(45)
    res2[Symbol.dispose]()
  })
})

describe('Pool - PromiseLike interface', () => {
  it('should be awaitable as PromiseLike<ResourceContainer>', async () => {
    const pool = new Pool(2)
    const res = await pool
    expect(res).toBeInstanceOf(ResourceContainer)
    res[Symbol.dispose]()
  })

  it('should support .then() method', async () => {
    const pool = new Pool(2)
    const value = await pool.then((res) => {
      const v = res.value
      res[Symbol.dispose]()
      return v
    })
    expect(typeof value).toBe('number')
  })
})

describe('Pool - Symbol.asyncDispose', () => {
  it('should clean up pool state on asyncDispose', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: (i) => ({ id: i })
    })

    const res = await pool.acquire()
    res[Symbol.dispose]()
    await pool[Symbol.asyncDispose]()

    const res2 = await pool.acquire()
    expect(res2.value).toEqual({ id: 0 })
    res2[Symbol.dispose]()
  })

  it('should dispose pool-created resources with Symbol.dispose', async () => {
    let disposed = false
    const disposableResource = {
      id: 1,
      [Symbol.dispose]() {
        disposed = true
      }
    }

    const pool = new Pool({
      concurrency: 1,
      create: () => disposableResource,
      shouldDispose: true
    })

    const res = await pool.acquire()
    res[Symbol.dispose]()
    await pool[Symbol.asyncDispose]()
    expect(disposed).toBe(true)
  })

  it('should dispose pool-created resources with Symbol.asyncDispose', async () => {
    let asyncDisposed = false
    const asyncDisposableResource = {
      id: 1,
      async [Symbol.asyncDispose]() {
        asyncDisposed = true
      }
    }

    const pool = new Pool({
      concurrency: 1,
      create: () => asyncDisposableResource,
      shouldDispose: true
    })

    const res = await pool.acquire()
    res[Symbol.dispose]()
    await pool[Symbol.asyncDispose]()
    expect(asyncDisposed).toBe(true)
  })

  it('should not dispose pre-existing resources when shouldDispose is false', async () => {
    let disposed = false
    const resource = {
      id: 1,
      [Symbol.dispose]() {
        disposed = true
      }
    }

    const pool = new Pool({
      concurrency: 1,
      resources: [resource],
      shouldDispose: false
    })

    const res = await pool.acquire()
    await pool[Symbol.asyncDispose]()
    expect(disposed).toBe(false)
  })
})

describe('Pool - Scheduler', () => {
  it('should create a scheduler via schedule()', () => {
    const pool = new Pool(2)
    const scheduler = pool.schedule()
    expect(scheduler).toBeInstanceOf(Scheduler)
  })

  it('should execute tasks with resource as this context', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: (i) => `worker-${i}`
    })
    const scheduler = pool.schedule()

    const results: string[] = []
    function task(this: string, data: string) {
      results.push(`${this}:${data}`)
    }

    await scheduler.enqueue(task, 'hello')
    expect(results).toEqual(['worker-0:hello'])
  })

  it('should execute tasks concurrently up to pool concurrency', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: (i) => i
    })
    const scheduler = pool.schedule()

    const running: number[] = []
    const completed: number[] = []

    async function task(this: number, id: number) {
      running.push(this)
      await wait(20)
      completed.push(id)
      running.splice(running.indexOf(this), 1)
    }

    const p1 = scheduler.enqueue(task, 1)
    const p2 = scheduler.enqueue(task, 2)
    const p3 = scheduler.enqueue(task, 3)

    await wait(5)
    expect(running.length).toBeLessThanOrEqual(2)

    await Promise.all([p1, p2, p3])
    expect(completed).toEqual([1, 2, 3])
  })

  it('should wrap tasks for convenient usage', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: (i) => `w${i}`
    })
    const scheduler = pool.schedule()

    function task(this: string, msg: string) {
      return `${this} processed: ${msg}`
    }

    const wrapped = scheduler.wrap(task)
    const result = await wrapped('test')
    expect(result).toMatch(/w\d+ processed: test/)
  })

  it('should enqueue all tasks from an iterable', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: (i) => i
    })
    const scheduler = pool.schedule()

    function task(this: number, n: number) {
      return this + n
    }

    const tasks = [task, task, task]
    const results = await scheduler.enqueueAll(tasks, 10)
    expect(results.length).toBe(3)
    expect(results.every((r) => r >= 10)).toBe(true)
  })

  it('should enqueue all tasks from an async iterable', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: (i) => i
    })
    const scheduler = pool.schedule()

    function task(this: number, n: number) {
      return this * n
    }

    async function* taskGenerator() {
      yield task
      yield task
    }

    const results = await scheduler.enqueueAll(taskGenerator(), 5)
    expect(results.length).toBe(2)
  })

  it('should propagate task errors', async () => {
    const pool = new Pool({
      concurrency: 1,
      create: (i) => i
    })
    const scheduler = pool.schedule()

    function failingTask(this: number) {
      throw new Error('task failed')
    }

    await expect(scheduler.enqueue(failingTask)).rejects.toThrow('task failed')
  })

  it('should release resource after task completes', async () => {
    const pool = new Pool(1)
    const scheduler = pool.schedule()

    async function task(this: number, ms: number) {
      await wait(ms)
    }

    const p1 = scheduler.enqueue(task, 10)
    const p2 = scheduler.enqueue(task, 10)

    await Promise.all([p1, p2])
  })
})

describe('Pool - enqueue shortcut', () => {
  it('should enqueue tasks via pool.enqueue()', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: (i) => `worker-${i}`
    })

    function task(this: string, msg: string) {
      return `${this}:${msg}`
    }

    const result = await pool.enqueue(task, 'hello')
    expect(result).toMatch(/worker-\d+:hello/)
  })
})

describe('Pool - explicit resource management', () => {
  it('should auto-release with explicit dispose', async () => {
    const pool = new Pool(1)

    const res = await pool.acquire()
    expect(typeof res.value).toBe('number')
    res[Symbol.dispose]()

    const res2 = await pool.acquire()
    expect(typeof res2.value).toBe('number')
    res2[Symbol.dispose]()
  })

  it('should auto-release on exception with explicit dispose in finally', async () => {
    const pool = new Pool(1)

    let res: ResourceContainer<number> | undefined
    try {
      res = await pool.acquire()
      throw new Error('boom')
    } catch {
      // expected
    } finally {
      if (res) {
        res[Symbol.dispose]()
      }
    }

    const res2 = await pool.acquire()
    expect(typeof res2.value).toBe('number')
    res2[Symbol.dispose]()
  })
})

describe('Pool - mixed scenarios', () => {
  it('should handle async create function', async () => {
    const pool = new Pool({
      concurrency: 2,
      create: async (i) => ({ id: i, async: true })
    })

    const res = await pool.acquire()
    expect(res.value).toEqual({ id: 0, async: true })
    res[Symbol.dispose]()
  })

  it('should handle multiple concurrent acquires and releases', async () => {
    const pool = new Pool(3)
    const results: number[] = []

    const promises = Array.from({ length: 10 }, async (_, i) => {
      const res = await pool.acquire()
      await wait(Math.random() * 10)
      results.push(i)
      res[Symbol.dispose]()
      return i
    })

    await Promise.all(promises)
    expect(results.sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })
})
