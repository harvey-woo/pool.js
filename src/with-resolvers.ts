/**
 * Polyfill for Promise.withResolvers (ES2024)
 */
export function promiseWithResolvers<T>() {
  let resolve: (v: T) => void
  let reject: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve: resolve!, reject: reject! }
}
