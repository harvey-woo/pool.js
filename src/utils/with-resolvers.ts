export function withResolvers<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  // biome-ignore lint/style/noNonNullAssertion: <explanation>
  return { promise, resolve: resolve!, reject: reject! };
}

export default withResolvers;
