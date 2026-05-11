/**
 * ResourceContainer wraps a pooled resource and provides explicit disposal.
 * Implements the Disposable interface via Symbol.dispose.
 */
export class ResourceContainer<T> {
  private _value: T
  private _release: (t: T) => void

  constructor({ value, release }: { value: T; release: (t: T) => void }) {
    this._value = value
    this._release = release
  }

  get value(): T {
    return this._value
  }

  [Symbol.dispose](): void {
    this._release(this._value)
  }
}
