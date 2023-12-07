import {
  type AllCreatePoolOptions,
  type CreateLimiterOptions,
  type Limiter,
  Pool,
  type Resource,
} from './pool';

/** a shorthand for `Pool.limit` */
export const pLimit: <T extends Resource & object = Resource>(
  options: AllCreatePoolOptions<T>,
  limitterOptions: CreateLimiterOptions,
) => Limiter<T> = Pool.limit.bind(Pool);

export default pLimit;
