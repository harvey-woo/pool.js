import {
  AllCreatePoolOptions,
  CreateLimiterOptions,
  Limiter,
  Pool,
} from "./pool";

/** a shorthand for `Pool.limit` */
export const pLimit: <T = number>(
  options: AllCreatePoolOptions<T>,
  limitterOptions: CreateLimiterOptions,
) => Limiter<T> = Pool.limit.bind(Pool);

export default pLimit;
