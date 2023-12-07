import queue from "./utils/queue";
import wait from "./utils/wait";

export type CreatePoolOptionsCreate<T> = (
  createdCount: number,
) => T | undefined;

export interface CreateLimiterOptions {
  /**
   * The minimum duration of the execution of the function.
   */
  minDuration?: number;
}

/**
 * Options for creating a new `Pool` instance.
 */
export interface CreatePoolOptions<T = number> {
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

export type AllCreatePoolOptions<T> =
  | CreatePoolOptions<T>
  | CreatePoolOptionsCreate<T>
  | number;

export interface Limiter<T> {
  <Args extends readonly unknown[], R>(
    fn: (this: T, ...args: Args) => R,
    ...args: Args
  ): Promise<R>;
}

const defaultOptions = {
  create: (i: number) => i,
  reset: () => {},
  initialSize: 0,
} satisfies CreatePoolOptions<number>;

function normalizeOptions<T = number>(
  options?: AllCreatePoolOptions<T>,
): Required<CreatePoolOptions<T>> {
  if (typeof options === "number") {
    const numbericOptions = options;
    return {
      ...defaultOptions,
      create: (i: number) => (i < numbericOptions ? (i as T) : undefined),
    };
  }
  if (typeof options === "function") {
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
export class Pool<T = number> {
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
  on(evt: "acquire" | "release", fn: (item: T) => void) {
    this.#handlers[evt].add(fn);
  }

  /**
   * unbind event handler
   * @param evt event name, should be 'acquire' or 'release'
   * @param fn handler
   */
  off(evt: "acquire" | "release", fn: (item: T) => void) {
    this.#handlers[evt].remove(fn);
  }

  #emit(evt: "acquire" | "release", item: T) {
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
    for (let i = 0; i < initialSize; i++) {
      const item = create(i);
      if (item !== undefined) {
        this.#pool.add(item);
      } else {
        break;
      }
    }
  }

  #pool: Set<T> = new Set<T>();
  #active: Set<T> = new Set<T>();

  /** exsiting resource size, excluding the ones not created yet */
  get size() {
    return this.#active.size + this.#pool.size;
  }

  #untilRelease() {
    return new Promise<void>((resolve) => {
      const releaseListener = (item: T) => {
        this.off("release", releaseListener);
        resolve();
      };
      this.on("release", releaseListener);
    });
  }

  /**
   * Acquires a resource from the pool.
   * @param wait if true, will wait until a resource is released
   * @returns if `wait` is true, returns a promise that resolves to the acquired resource, otherwise returns the acquired resource or undefined
   */
  acquire(wait?: false): T | undefined;
  acquire(wait: true): Promise<T>;
  acquire(wait?: boolean): Promise<T> | T | undefined {
    if (this.#pool.size) {
      const item = this.#pool.values().next().value;
      this.#pool.delete(item);
      this.#active.add(item);
      this.#emit("acquire", item);
      return item;
    }
    const createdItem = this.#create(this.size);
    if (createdItem !== undefined) {
      this.#active.add(createdItem);
      this.#emit("acquire", createdItem);
      return createdItem;
    }

    if (!wait) {
      return undefined;
    }

    return this.#untilRelease().then(() => {
      return this.acquire(true);
    });
  }
  /**
   * Releases a resource and puts it back into the pool.
   * @param item The resource to release.
   */
  release(item: T) {
    if (this.#active.has(item)) {
      this.#active.delete(item);
      if (this.#reset) {
        this.#reset(item);
      }
      this.#emit("release", item);
      this.#pool.add(item);
    }
  }
  /**
   * Clears the pool.
   */
  clear() {
    this.#active.clear();
    this.#pool.clear();
  }

  /**
   * Creates a new `Pool` instance from an existing array.
   * @param items An array of items to initialize the pool with.
   * @param reset An optional function that is called on each item when it is released.
   */
  static from<T>(
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
    });
  }

  /**
   * create a limiter function, which will limit the concurrent execution of the function, passing the pool resource as the `this` context
   * @param minDuration the minimum duration of the execution of the function
   * @returns a limiter function
   */
  limit({ minDuration = 0 }: CreateLimiterOptions = {}): Limiter<T> {
    const pool = this;
    return async function limited(fn, ...args) {
      // biome-ignore lint/suspicious/noAsyncPromiseExecutor: <explanation>
      return new Promise(async (resolve, reject) => {
        const ctx = await pool.acquire(true);
        try {
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
          pool.release(ctx);
        }
      });
    };
  }

  /**
   * create a pool and a limiter function, which will limit the concurrent execution of the function, passing the pool resource as the `this` context
   * @param options the options for creating the pool
   * @param minDuration the minimum duration of the execution of the function
   * @returns
   */
  static limit<T = number>(
    options: AllCreatePoolOptions<T>,
    { minDuration = 0 }: CreateLimiterOptions = {},
  ): Limiter<T> {
    const pool = new Pool<T>(options);
    return pool.limit({
      minDuration,
    });
  }
}

export default Pool;

