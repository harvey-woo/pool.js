import { promiseWithResolvers } from './with-resolvers'
import { ResourceContainer } from './resource-container'

// biome-ignore lint/suspicious/no-explicit-any: generic type constraint
interface AbortSignalLike {
  aborted: boolean
  reason?: unknown
  addEventListener(type: 'abort', listener: () => void): void
  removeEventListener(type: 'abort', listener: () => void): void
}

function waitAbortSignal(signal: AbortSignalLike): Promise<void> {
  return new Promise<void>((_resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }
    const onAbort = () => {
      reject(signal.reason)
      signal.removeEventListener('abort', onAbort)
    }
    signal.addEventListener('abort', onAbort)
  })
}

/**
 * CoolDown callback receives timing information about resource scheduling.
 * Returns a Promise that controls when the resource becomes available again.
 */
export type CoolDown = (timing: {
  /** When the resource was borrowed */
  acquireAt: number
  /** When the resource was delivered to the caller */
  deliverAt: number
  /** When the resource began being released */
  releaseAt: number
}) => Promise<void>

/** Error thrown when no resources are available and wait is false */
export class NoResourceAvailableError extends Error {
  constructor(message?: string) {
    super(message ?? 'No resource available')
  }
}

export function isNoResourceAvailableError(
  error: unknown
): error is NoResourceAvailableError {
  return error instanceof NoResourceAvailableError
}

export interface PoolOptions<T> {
  /** Maximum concurrency (total resources the pool can manage) */
  concurrency: number
  /** Factory function to create a new resource. Receives the index of the resource being created. */
  create?: (created: number) => T | PromiseLike<T>
  /** Pre-existing resources. These won't be disposed when the pool is cleaned up. */
  resources?: T[]
  /** Cooldown function to control re-scheduling timing after a resource is released. */
  coolDown?: CoolDown
  /** Whether the pool should dispose resources during cleanup. Defaults to true. */
  shouldDispose?: boolean
}

/**
 * Resource pool with explicit resource management.
 *
 * @example
 * ```ts
 * // Simple pool with concurrency limit
 * const pool = new Pool(3)
 * using res = await pool.acquire()
 * console.log(res.value)
 * // res is automatically released via Symbol.dispose
 *
 * // Pool with custom resource factory
 * const pool = new Pool({
 *   concurrency: 5,
 *   create: (i) => ({ id: i, conn: createConnection(i) }),
 * })
 *
 * // Pool from existing resources
 * const pool = new Pool([worker1, worker2, worker3])
 * ```
 */
export class Pool<T = number> implements PromiseLike<ResourceContainer<T>> {
  private _create: (created: number) => T | PromiseLike<T>
  private _initialResources: number
  private _shouldDispose: boolean
  private _coolDown?: CoolDown
  private _resources: Promise<T>[] = []
  private _created = new Set<Promise<T>>()
  private _concurrency: number

  /** Resolvers for borrowed resources — maps resource promise to its release resolver */
  private _resolvers: Map<
    Promise<T>,
    { resolve: () => void; promise: Promise<void> }
  > = new Map()

  constructor(
    options: number | PoolOptions<T> | T[]
  ) {
    const tmp = options
    const { concurrency, create, resources, coolDown, shouldDispose } =
      Array.isArray(tmp)
        ? {
            concurrency: tmp.length,
            create: (i: number) => tmp[i] as T,
            resources: undefined,
            coolDown: undefined as CoolDown | undefined,
            shouldDispose: false
          }
        : typeof tmp === 'number'
          ? { concurrency: tmp, create: undefined, resources: undefined, coolDown: undefined, shouldDispose: true }
          : {
              concurrency: tmp.concurrency,
              create: tmp.create,
              resources: tmp.resources ?? undefined,
              coolDown: tmp.coolDown,
              shouldDispose: tmp.shouldDispose ?? true
            }

    this._shouldDispose = shouldDispose ?? false
    this._concurrency = concurrency
    this._create = create ?? ((i) => i as unknown as T)
    this._coolDown = coolDown

    if (resources?.length) {
      this._resources = resources.map((resource) => Promise.resolve(resource))
      this._concurrency = Math.max(this._concurrency, resources.length)
    }

    this._initialResources = resources?.length ?? 0
  }

  /**
   * Acquire a resource from the pool.
   * Returns a ResourceContainer that releases the resource when disposed.
   */
  async acquire({
    wait = true,
    abortSignal
  }: {
    wait?: boolean
    abortSignal?: AbortSignalLike
  } = {}): Promise<ResourceContainer<T>> {
    const acquireAt = Date.now()
    const availableLen = this._created.size + this._initialResources

    let p: Promise<T> | undefined
    if (this._resources.length > 0) {
      p = this._resources.pop()!
    } else if (this._concurrency - availableLen > 0) {
      const createdRes = this._create(availableLen)
      p = Promise.resolve(createdRes)
      this._created.add(p)
    }

    if (p) {
      this._resolvers.set(p, promiseWithResolvers())
      const value = await p
      const deliverAt = Date.now()
      return new ResourceContainer({
        value,
        release: () => {
          this._release({
            promiseValue: p!,
            acquireAt,
            deliverAt
          })
        }
      })
    }

    if (!wait) {
      throw new NoResourceAvailableError()
    }

    await Promise.race([
      ...Array.from(this._resolvers.values(), ({ promise }) => promise),
      ...(abortSignal ? [waitAbortSignal(abortSignal)] : [])
    ])
    return this.acquire({ abortSignal })
  }

  /** Pool implements PromiseLike for awaiting all resources to be released */
  then<TResult1 = ResourceContainer<T>, TResult2 = never>(
    onfulfilled?:
      | ((value: ResourceContainer<T>) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.acquire().then(onfulfilled, onrejected)
  }

  /** Create a Scheduler for task-based execution */
  schedule(): Scheduler<T> {
    return new Scheduler<T>({ pool: this })
  }

  /** Enqueue a single task — convenience method for pool.schedule().enqueue() */
  enqueue<Fn extends Task<T>>(
    task: Fn,
    ...args: Parameters<Fn>
  ): Promise<Awaited<ReturnType<Fn>>> {
    return this.schedule().enqueue(task, ...args) as Promise<Awaited<ReturnType<Fn>>>
  }

  private async _release({
    promiseValue,
    acquireAt,
    deliverAt
  }: {
    promiseValue: Promise<T>
    acquireAt: number
    deliverAt: number
  }): Promise<void> {
    await this._coolDown?.({ acquireAt, deliverAt, releaseAt: Date.now() })
    this._resources.push(promiseValue)
    const resolvers = this._resolvers.get(promiseValue)
    if (resolvers) {
      resolvers.resolve()
    }
  }

  /**
   * Dispose the pool — waits for all borrowed resources to be returned,
   * then disposes pool-created resources and resets the pool state.
   */
  async [Symbol.asyncDispose](): Promise<void> {
    if (this._shouldDispose) {
      await Promise.all(
        Array.from(
          this._resolvers.entries(),
          async ([promise, { promise: resolverPromise }]) => {
            await resolverPromise
            if (!this._created.has(promise)) {
              return
            }
            const res = await promise
            if (typeof res !== 'object' || res === null) {
              return
            }
            if (
              Symbol.asyncDispose in res &&
              typeof res[Symbol.asyncDispose] === 'function'
            ) {
              await (res as AsyncDisposable)[Symbol.asyncDispose]()
              return
            }
            if (
              Symbol.dispose in res &&
              typeof res[Symbol.dispose] === 'function'
            ) {
              ;(res as Disposable)[Symbol.dispose]()
            }
          }
        )
      )
    }
    this._resources = []
    this._created.clear()
    this._resolvers = new Map()
  }
}

/** A task function that receives the pool resource as `this` context */
export type Task<T> = (this: T, ...args: unknown[]) => unknown

/**
 * Scheduler — enqueues tasks and runs them against pooled resources.
 *
 * @example
 * ```ts
 * const pool = new Pool(2)
 * const scheduler = pool.schedule()
 *
 * function work(this: number, data: string) {
 *   console.log(`Worker ${this} processing: ${data}`)
 * }
 *
 * await scheduler.enqueue(work, 'task1')
 * await scheduler.enqueue(work, 'task2')
 * ```
 */
export class Scheduler<T> {
  private _pool: Pool<T>
  private _queue: ((res: T) => Promise<void>)[] = []

  constructor({ pool }: { pool: Pool<T> }) {
    this._pool = pool
  }

  /**
   * Enqueue a task. The task function receives a pool resource as `this`.
   * Returns a promise that resolves when the task completes.
   */
  enqueue<Fn extends Task<T>>(
    task: Fn,
    ...args: Parameters<Fn>
  ): Promise<Awaited<ReturnType<Fn>>> {
    const { promise, resolve, reject } = promiseWithResolvers<Awaited<ReturnType<Fn>>>()
    this._queue.push(async (res) => {
      try {
        resolve((await task.call(res, ...args)) as Awaited<ReturnType<Fn>>)
      } catch (error) {
        reject(error)
      }
    })
    this._run()
    return promise
  }

  /**
   * Enqueue multiple tasks from an iterable.
   * Returns a promise that resolves when all tasks complete.
   */
  async enqueueAll<Fn extends Task<T>>(
    tasks: Iterable<Fn> | AsyncIterable<Fn>,
    ...args: Parameters<Fn>
  ): Promise<Awaited<ReturnType<Fn>>[]> {
    const results: Promise<Awaited<ReturnType<Fn>>>[] = []
    for await (const task of tasks) {
      results.push(this.enqueue(task, ...args))
    }
    return Promise.all(results)
  }

  /**
   * Wrap a task function so that calling it automatically enqueues it.
   */
  wrap<Fn extends Task<T>>(task: Fn) {
    return (...args: Parameters<Fn>) => this.enqueue(task, ...args)
  }

  private async _run(): Promise<void> {
    while (this._queue.length > 0) {
      const task = this._queue.shift()!
      const res = await this._pool.acquire()
      try {
        await task(res.value)
      } finally {
        res[Symbol.dispose]()
      }
    }
  }
}
