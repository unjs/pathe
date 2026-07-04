const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;

// When enabled, backslashes are treated as ordinary filename characters
// (POSIX semantics) instead of being converted to `/`.
// Safe as a module-scoped flag because all path functions are synchronous:
// the proxy sets it immediately before a sync call and restores it after,
// so no interleaving is possible.
let _preserveBackslash = false;

export function getPreserveBackslash() {
  return _preserveBackslash;
}

export function setPreserveBackslash(value: boolean) {
  _preserveBackslash = value;
}

// Util to normalize windows paths to posix
export function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  const converted = _preserveBackslash ? input : input.replace(/\\/g, "/");
  return converted.replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
