const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;

// When enabled, backslashes are treated as ordinary filename characters
// (POSIX semantics) instead of being converted to `/`.
// Safe as a module-scoped flag because all path functions are synchronous:
// the proxy sets it immediately before a sync call and restores it after,
// so no interleaving is possible.
let _preserveBackslash = false;

// Cache the wrapper per original function so `posix.join === posix.join`
// stays stable across accesses (matching `node:path`), instead of allocating
// a fresh closure on every proxy `get`.
const _preserveBackslashCache = new WeakMap<(...args: any[]) => any, (...args: any[]) => any>();

// Wrap a path function so backslashes are preserved (POSIX filename semantics)
// for the duration of the synchronous call, then restore the previous mode.
export function withPreserveBackslash<T extends (...args: any[]) => any>(fn: T): T {
  const cached = _preserveBackslashCache.get(fn);
  if (cached) {
    return cached as T;
  }
  const wrapped = function (this: unknown, ...args: unknown[]) {
    const previous = _preserveBackslash;
    _preserveBackslash = true;
    try {
      return fn.apply(this, args);
    } finally {
      _preserveBackslash = previous;
    }
  } as T;
  // Preserve the original `name`/`length` so introspection matches the wrapped fn.
  Object.defineProperty(wrapped, "name", { value: fn.name, configurable: true });
  Object.defineProperty(wrapped, "length", { value: fn.length, configurable: true });
  _preserveBackslashCache.set(fn, wrapped);
  return wrapped;
}

// Util to normalize windows paths to posix
export function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  // POSIX semantics: `\` is an ordinary filename character and a leading
  // `<letter>:/` is not a drive, so leave the input untouched.
  if (_preserveBackslash) {
    return input;
  }
  return input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
