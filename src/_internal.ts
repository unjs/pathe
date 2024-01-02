const _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;

// Util to normalize windows paths to posix
export function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }
  return input
    .replace(/\\/g, "/")
    .replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
