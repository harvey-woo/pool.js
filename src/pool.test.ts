import Pool from "./pool";

describe("Pool", () => {
  let pool: Pool<number>;

  beforeEach(() => {
    pool = new Pool<number>({
      create: (i) => i,
      reset: (item) => {},
      initialSize: 3,
    });
  });

  afterEach(() => {
    pool.clear();
  });

  it("should acquire and release resources", () => {
    expect(pool.size).toBe(3);

    const resource1 = pool.acquire();
    const resource2 = pool.acquire();
    const resource3 = pool.acquire();

    pool.release(resource1!);
    expect(pool.size).toBe(1);

    pool.release(resource2!);
    expect(pool.size).toBe(2);

    pool.release(resource3!);
    expect(pool.size).toBe(3);
  });

  it("should wait for resource when acquire with wait=true", async () => {
    const resource1 = pool.acquire();
    const resource2 = pool.acquire();
    const resource3 = pool.acquire();

    expect(pool.size).toBe(0);

    const acquirePromise = pool.acquire(true);
    expect(pool.size).toBe(0);

    pool.release(resource1!);
    expect(pool.size).toBe(1);

    const acquiredResource = await acquirePromise;
    expect(acquiredResource).toBeDefined();
    expect(pool.size).toBe(0);

    pool.release(resource2!);
    pool.release(resource3!);
  });

  it("should limit concurrent execution with limiter", async () => {
    const limiter = pool.limit({ minDuration: 100 });

    const fn = jest.fn();

    const result1 = limiter(fn);
    const result2 = limiter(fn);
    const result3 = limiter(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(result1).toBeInstanceOf(Promise);
    expect(result2).toBeInstanceOf(Promise);
    expect(result3).toBeInstanceOf(Promise);

    await Promise.all([result1, result2, result3]);

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("should create a pool from an existing array", () => {
    const items = [1, 2, 3];
    const resetFn = jest.fn();

    const poolFromItems = Pool.from(items, { reset: resetFn });

    expect(poolFromItems.size).toBe(3);

    const resource1 = poolFromItems.acquire();
    const resource2 = poolFromItems.acquire();
    const resource3 = poolFromItems.acquire();

    expect(resource1).toBe(1);
    expect(resource2).toBe(2);
    expect(resource3).toBe(3);

    poolFromItems.release(resource1!);
    poolFromItems.release(resource2!);
    poolFromItems.release(resource3!);

    expect(resetFn).toHaveBeenCalledTimes(3);
  });
});
