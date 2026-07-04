const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;

// When enabled, backslashes are treated as ordinary filename characters
// (POSIX semantics) instead of being converted to `/`.
// Safe as a module-scoped flag because all path functions are synchronous:
// the proxy sets it immediately before a sync call and restores it after,
// so no interleaving is possible.
let _preserveBackslash = false;

// Wrap a path function so backslashes are preserved (POSIX filename semantics)
// for the duration of the synchronous call, then restore the previous mode.
export function withPreserveBackslash<T extends (...args: any[]) => any>(fn: T): T {
  return function (this: unknown, ...args: unknown[]) {
    const previous = _preserveBackslash;
    _preserveBackslash = true;
    try {
      return fn.apply(this, args);
    } finally {
      _preserveBackslash = previous;
    }
  } as T;
}

// Util to normalize windows paths to posix
export function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  const converted = _preserveBackslash ? input : input.replace(/\\/g, "/");
  return converted.replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
