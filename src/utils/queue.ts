// biome-ignore lint/suspicious/noExplicitAny: <explanation>
interface Queued<F extends (...args: readonly any[]) => void> {
  (this: ThisParameterType<F>, ...args: Parameters<F>): void;
  add(...fns: F[]): void;
  clear(): void;
  remove(fn: F): void;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
function queue<F extends (...args: readonly any[]) => unknown = () => void>(
  ...fns: F[]
): Queued<F> {
  const fnSet = new Set<F>(fns);
  function run(this: ThisParameterType<F>, ...args: Parameters<F>) {
    // biome-ignore lint/complexity/noForEach: <explanation>
    fnSet.forEach((fn) => {
      fn.apply(this, args);
    });
  }
  function add(...fns: F[]) {
    // biome-ignore lint/complexity/noForEach: <explanation>
    fns.forEach((fn) => {
      fnSet.add(fn);
    });
  }
  function clear() {
    fnSet.clear();
  }
  function remove(fn: F) {
    fnSet.delete(fn);
  }
  return Object.assign(run, {
    add,
    clear,
    remove,
  });
}

export default queue;
export { Queued, queue };
