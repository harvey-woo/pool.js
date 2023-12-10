import queue from './utils/queue';
import wait from './utils/wait';
import withResolvers from './utils/with-resolvers';

// biome-ignore lint/suspicious/noEmptyInterface: <explanation>
export interface Resource {
  // mybe we can use this in the future
  // [Symbol.dispose]?: () => void;
  // [Symbol.asyncDispose]?: () => Promise<void>;
}

export type CreatePoolOptionsCreate<T extends Resource & object = Resource> = (
  createdCount: number,
) => T | undefined;

export interface CreateLimiterOptions {
  /**
   * The minimum duration of the execution of the function.
   */
  minDuration?: number;
  abortError?: unknown;
}

interface AbortSignalLike {
  aborted: boolean;
  reason?: unknown;
  addEventListener(type: 'abort', listener: () => void): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

function waitAbortSignal(signal: AbortSignalLike) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }
    signal.addEventListener('abort', () => {
      reject(signal.reason);
    });
  });
}

/**
 * Options for creating a new `Pool` instance.
 */
export interface CreatePoolOptions<T extends Resource & object = Resource> {
  /**
   * A function that creates a new resource.
   * @param createdCount The number of resources that have been created so far.
   */
  create?: CreatePoolOptionsCreate<T>;
  /**
   * A function that resets a resource to its initial state when it is released.
   * @param item The resource to reset.
   */
  reset?: (item: T) => void;
  /**
   * The number of resources to initialize the pool with.
   */
  initialSize?: number;
}

export type AllCreatePoolOptions<T extends Resource & object = Resource> =
  | CreatePoolOptions<T>
  | CreatePoolOptionsCreate<T>
  | number;

export interface Limiter<T extends Resource & object = Resource> {
  <Args extends readonly unknown[], R>(
    fn: (this: T, ...args: Args) => R,
    ...args: Args
  ): Promise<R>;
  abort(reason?: unknown): void;
}

function createDefaultResource() {
  return Object.create(null);
}

const defaultOptions = {
  create: (i: number) => createDefaultResource(),
  reset: () => {},
  initialSize: 0,
} satisfies CreatePoolOptions;

function normalizeOptions<T extends Resource & object = Resource>(
  options?: AllCreatePoolOptions<T>,
): Required<CreatePoolOptions<T>> {
  if (typeof options === 'number') {
    const numbericOptions = options;
    return {
      ...defaultOptions,
      create: (i: number) =>
        i < numbericOptions ? (createDefaultResource() as T) : undefined,
    };
  }
  if (typeof options === 'function') {
    return {
      ...defaultOptions,
      create: options,
    };
  }
  return {
    ...defaultOptions,
    create: defaultOptions.create as CreatePoolOptionsCreate<T>,
    ...options,
  };
}

/**
 * Represents a generic object pool.
 * @template T The type of objects in the pool.
 */
export class Pool<T extends Resource & object = Resource>
  implements PromiseLike<void>
{
  // events handling, can be replaced with EventEmitter

  #handlers = {
    acquire: queue<(item: T) => void>(),
    release: queue<(item: T) => void>(),
  };

  /**
   * bind event handler
   * @param evt event name, should be 'acquire' or 'release'
   * @param fn handler
   */
  on(evt: 'acquire' | 'release', fn: (item: T) => void) {
    this.#handlers[evt].add(fn);
  }

  /**
   * unbind event handler
   * @param evt event name, should be 'acquire' or 'release'
   * @param fn handler
   */
  off(evt: 'acquire' | 'release', fn?: (item: T) => void) {
    if (fn === undefined) {
      this.#handlers[evt].clear();
      return;
    }
    this.#handlers[evt].remove(fn);
  }

  #emit(evt: 'acquire' | 'release', item: T) {
    this.#handlers[evt](item);
  }

  #create: CreatePoolOptionsCreate<T>;
  #reset?: (item: T) => void;

  /**
   * @param options should be a create function or concurrent number or options object
   */
  constructor(options: AllCreatePoolOptions<T>) {
    const { create, reset, initialSize } = normalizeOptions(options);
    this.#create = create;
    this.#reset = reset;
    this.create(initialSize);
  }

  /**
   * create resources
   * @param size size of resources to create
   */
  create(size: number) {
    for (let i = 0; i < size; i++) {
      const item = this.#create(i);
      if (item !== undefined) {
        this.#resources.add(item);
      } else {
        throw new Error(
          'Pool: create resource failed, undefined returned from create function',
        );
      }
    }
  }

  #resources: Set<T> = new Set<T>();

  // Map of inUser resources and their release promise resolvers
  #inUse = new Map<
    T,
    {
      resolve: (resource: T) => void;
      promise: Promise<T>;
    }
  >();

  /** exsiting resource size, excluding the ones not created yet */
  get totalSize() {
    return this.inUseSize + this.size;
  }

  /** get inUse resource size */
  get inUseSize() {
    return this.#inUse.size;
  }

  /** get available resource size */
  get size() {
    return this.#resources.size;
  }

  /**
   * Acquires a resource from the pool.
   * @param wait if true, will wait until a resource is released
   * @returns if `wait` is true, returns a promise that resolves to the acquired resource, otherwise returns the acquired resource or undefined
   */
  acquire(wait?: false): T | undefined;
  acquire(wait: true, abortSignal?: AbortSignalLike): Promise<T>;
  acquire(
    wait?: boolean,
    abortSignal?: AbortSignalLike,
  ): Promise<T> | T | undefined {
    if (this.#resources.size) {
      const item = this.#resources.values().next().value;
      this.#resources.delete(item);
      this.#inUse.set(item, withResolvers<T>());
      this.#emit('acquire', item);
      return item;
    }
    const createdItem = this.#create(this.totalSize);
    if (createdItem !== undefined) {
      this.#inUse.set(createdItem, withResolvers<T>());
      this.#emit('acquire', createdItem);
      return createdItem;
    }

    if (!wait) {
      return undefined;
    }

    return Promise.race([
      ...Array.from(this.#inUse.values()).map((resolvers) => resolvers.promise),
      abortSignal ? waitAbortSignal(abortSignal) : new Promise(() => {}),
    ]).then(() => this.acquire(true, abortSignal));
  }
  /**
   * Releases a resource and puts it back into the pool.
   * @param item The resource to release.
   */
  release(item: T) {
    const resolvers = this.#inUse.get(item);
    if (resolvers) {
      this.#inUse.delete(item);
      if (this.#reset) {
        this.#reset(item);
      }
      this.#emit('release', item);
      this.#resources.add(item);
      resolvers.resolve(item);
    }
  }
  /**
   * Clears the pool.
   */
  clear() {
    this.#inUse.clear();
    this.#resources.clear();
  }

  /**
   * Returns a promise that resolves when all resources are released.
   * @param onfulfilled
   * @param onrejected
   * @returns
   */
  then<TResult1 = void, TResult2 = never>(
    onfulfilled?: (() => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.all(
      Array.from(this.#inUse.values()).map((resolvers) => resolvers.promise),
    ).then(onfulfilled, onrejected);
  }

  [Symbol.asyncIterator]() {
    return {
      next: async () => {
        const item = await this.acquire(true);
        return {
          done: item === undefined,
          value: item,
        };
      },
    };
  }

  [Symbol.iterator]() {
    return {
      next: () => {
        const item = this.acquire();
        return {
          done: item === undefined,
          value: item,
        };
      },
    };
  }

  /**
   * Creates a new `Pool` instance from an existing array.
   * @param items An array of items to initialize the pool with.
   * @param reset An optional function that is called on each item when it is released.
   */
  static from<T extends Resource & object>(
    items: T[],
    {
      reset,
    }: {
      reset?: (item: T) => void;
    } = {},
  ) {
    return new Pool<T>({
      create: (i) => items[i],
      reset,
      initialSize: items.length,
    });
  }

  /**
   * create a limiter function, which will limit the concurrent execution of the function, passing the pool resource as the `this` context
   * @param minDuration the minimum duration of the execution of the function
   * @returns a limiter function
   */
  limit({
    minDuration = 0,
    abortError = new Error('user abort'),
  }: CreateLimiterOptions = {}): Limiter<T> {
    const pool = this;
    const abortCtrl = new AbortController();
    return Object.assign(
      async function limited(fn, ...args: readonly unknown[]) {
        // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
        return new Promise<ReturnType<typeof fn>>(async (resolve, reject) => {
          // mybe we can use this in the future
          // await using ctx = await pool.acquire(true);
          let ctx: T | undefined;
          try {
            ctx = await pool.acquire(true, abortCtrl.signal);
            const start = Date.now();
            const result = await fn.call(ctx, ...args);
            resolve(result);
            const duration = Date.now() - start;
            if (duration < minDuration) {
              await wait(minDuration - duration);
            }
          } catch (e) {
            reject(e);
          } finally {
            if (ctx) {
              pool.release(ctx);
            }
          }
        });
      },
      {
        abort(abortedReason: unknown = abortError) {
          abortCtrl.abort(abortedReason);
        },
      },
    );
  }

  /**
   * create a pool and a limiter function, which will limit the concurrent execution of the function, passing the pool resource as the `this` context
   * @param options the options for creating the pool
   * @param limiterOptions the options for creating the limiter
   * @returns
   */
  static limit<T extends Resource & object = Resource>(
    options: AllCreatePoolOptions<T> | Pool<T>,
    limiterOptions?: CreateLimiterOptions,
  ): Limiter<T> {
    const pool: Pool<T> = options instanceof Pool ? options : new Pool(options);
    return pool.limit(limiterOptions);
  }
}

export default Pool;
