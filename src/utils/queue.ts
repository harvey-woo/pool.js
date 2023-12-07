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
  const queue: F[] = [...fns];
  function run(this: ThisParameterType<F>, ...args: Parameters<F>) {
    const fn = queue.shift();
    if (fn) {
      fn.call(this, ...args);
    }
  }
  function add(...fns: F[]) {
    queue.push(...fns);
  }
  function clear() {
    queue.length = 0;
  }
  function remove(fn: F) {
    const index = queue.indexOf(fn);
    if (index >= 0) {
      queue.splice(index, 1);
    }
  }
  return Object.assign(run, {
    add,
    clear,
    remove,
  });
}

export default queue;
export { Queued, queue };
