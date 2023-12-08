import Pool, {
  AllCreatePoolOptions,
  CreateLimiterOptions,
  Resource,
} from './pool';

/**
 * limit a function with a pool, passing the pool resource as the `this` context
 * @param fn the function to be limited
 * @param options the options for creating the pool
 * @param limiterOptions the options for creating the limiter
 * @returns a limited function
 */
export function limit<
  Args extends readonly unknown[],
  R,
  T extends Resource & object = Resource,
>(
  fn: (this: T, ...args: Args) => R,
  options: AllCreatePoolOptions<T> | Pool<T>,
  limiterOptions: CreateLimiterOptions,
): (...args: Args) => Promise<R> {
  const limiter = Pool.limit(options, limiterOptions);
  return (...args) => limiter(fn, ...args);
}
