import { Pool, pLimit } from './index';
import wait from './utils/wait';

describe('Pool', () => {
  let pool: Pool<{ value: number }>;

  beforeEach(() => {
    pool = new Pool({
      create: (i) => (i >= 3 ? undefined : { value: i }),
      reset: (item) => {},
      initialSize: 3,
    });
  });

  afterEach(() => {
    pool.clear();
    pool.create(3);
  });

  it('should acquire and release resources', () => {
    expect(pool.size).toBe(3);

    const resource1 = pool.acquire();
    const resource2 = pool.acquire();
    const resource3 = pool.acquire();

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource1!);
    expect(pool.size).toBe(1);

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource2!);
    expect(pool.size).toBe(2);

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource3!);
    expect(pool.size).toBe(3);
  });

  it('should wait for resource when acquire with wait=true', async () => {
    const resource1 = pool.acquire();
    pool.acquire();
    pool.acquire();

    expect(pool.size).toBe(0);

    const acquirePromise = pool.acquire(true);

    setTimeout(() => {
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      pool.release(resource1!);
    });

    const acquiredResource = await acquirePromise;
    expect(acquiredResource).toEqual({ value: 0 });
    expect(pool.size).toBe(0);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(acquiredResource!);
    expect(pool.size).toBe(1);
  });

  it('should limit concurrent execution with limiter', async () => {
    const limiter = pool.limit({ minDuration: 100 });
    const delays = [50, 200, 300, 400, 500];

    const fn = jest.fn(async () => {
      // biome-ignore lint/style/noNonNullAssertion: <explanation>
      await wait(delays.shift()!);
    });

    const promises = delays.map(() => {
      const result = limiter(fn);
      expect(result).toBeInstanceOf(Promise);
      return result;
    });

    // when 10ms passed, fn should be called 3 times
    await wait(10);
    expect(fn).toHaveBeenCalledTimes(3);

    // when 60ms passed, fn should be called 3 times, because minDuration is 100ms
    await wait(50);
    expect(fn).toHaveBeenCalledTimes(3);

    // when 110ms passed, fn should be called 4 times
    await wait(50);
    expect(fn).toHaveBeenCalledTimes(4);

    // when 310 passed, fn should be called 5 times
    await wait(200);
    expect(fn).toHaveBeenCalledTimes(5);

    await Promise.all(promises);

    expect(fn).toHaveBeenCalledTimes(5);
  });

  it('should create a pool from an existing array', () => {
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

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    poolFromItems.release(resource1!);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    poolFromItems.release(resource2!);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    poolFromItems.release(resource3!);

    expect(resetFn).toHaveBeenCalledTimes(3);
  });

  it('should create a pool without create function', () => {
    const pool = new Pool({ initialSize: 3 });
    expect(pool.size).toBe(3);
  });

  it('should create a pool with create function', () => {
    const createFn = jest.fn((i: number) => {
      if (i >= 3) {
        return undefined;
      }
      return { value: i };
    });
    const pool = new Pool(createFn);
    expect(pool.size).toBe(0);
    expect(createFn).toHaveBeenCalledTimes(0);

    const resource1 = pool.acquire();
    expect(pool.size).toBe(0);
    expect(createFn).toHaveBeenCalledTimes(1);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource1!);
    expect(pool.size).toBe(1);
  });

  it('should create a pool with number as max size', () => {
    const pool = new Pool(3);
    const resource1 = pool.acquire();
    const resource2 = pool.acquire();
    const resource3 = pool.acquire();

    expect(pool.size).toBe(0);

    const noResource = pool.acquire();
    expect(noResource).toBeUndefined();
    expect(pool.size).toBe(0);

    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource1!);
    expect(pool.size).toBe(1);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource2!);
    expect(pool.size).toBe(2);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource3!);
    expect(pool.size).toBe(3);
  });

  it('should throw error when create function returns undefined, or exceeds max size', () => {
    const createFn = jest.fn((i: number) => {
      if (i >= 3) {
        return undefined;
      }
      return { value: i };
    });
    const pool = new Pool({
      create: createFn,
    });
    expect(() => pool.create(4)).toThrow(
      'Pool: create resource failed, undefined returned from create function',
    );
  });

  it('mesure resource usage', async () => {
    const resource1 = pool.acquire();
    expect(pool.inUseSize).toBe(1);
    expect(pool.size).toBe(2);
    await wait(100);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource1!);
    expect(pool.inUseSize).toBe(0);
    expect(pool.size).toBe(3);
  });

  it('limit should throw error when fn throws error', async () => {
    const limiter = pool.limit();
    const fn = jest.fn(() => {
      throw new Error('error');
    });
    const result = limiter(fn);
    await expect(result).rejects.toThrow('error');
  });

  it('shortcuts should work', async () => {
    const limited = pLimit(2, {
      minDuration: 100,
    });
    const fn = jest.fn(async () => {
      await wait(200);
    });
    [1, 2, 3, 4].map(() => limited(fn));
    await wait(20);
    expect(fn).toHaveBeenCalledTimes(2);
    await wait(200);
    expect(fn).toHaveBeenCalledTimes(4);
  });

  it('listeners should work', async () => {
    const onAcquire = jest.fn();
    const onRelease = jest.fn();
    const pool = new Pool({
      create: (i) => (i >= 3 ? undefined : { value: i }),
      reset: (item) => {},
      initialSize: 3,
    });
    pool.on('acquire', onAcquire);
    pool.on('release', onRelease);
    const resource1 = pool.acquire();
    const resource2 = pool.acquire();
    const resource3 = pool.acquire();
    expect(onAcquire).toHaveBeenCalledTimes(3);
    expect(onRelease).toHaveBeenCalledTimes(0);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource1!);
    expect(onRelease).toHaveBeenCalledTimes(1);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource2!);
    expect(onRelease).toHaveBeenCalledTimes(2);
    pool.off('release', onRelease);
    // biome-ignore lint/style/noNonNullAssertion: <explanation>
    pool.release(resource3!);
    expect(onRelease).toHaveBeenCalledTimes(2);

    pool.off('acquire');
    pool.acquire();
    expect(onAcquire).toHaveBeenCalledTimes(3);
  });
});