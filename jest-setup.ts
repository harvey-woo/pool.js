// Polyfill for Explicit Resource Management (ES2024)
// biome-ignore lint/suspicious/noExplicitAny: polyfill for ES2024 symbols
const SymbolAny = Symbol as any
if (typeof SymbolAny.dispose !== 'symbol') {
  SymbolAny.dispose = Symbol('Symbol.dispose')
}
if (typeof SymbolAny.asyncDispose !== 'symbol') {
  SymbolAny.asyncDispose = Symbol('Symbol.asyncDispose')
}
