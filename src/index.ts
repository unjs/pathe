import type { posix as Posix, win32 as Win32, PlatformPath } from "node:path";

import * as _path from "./_path";

export * from "./_path";

/**
 * The platform-specific file delimiter.
 *
 * Equals to `";"` in windows and `":"` in all other platforms.
 */
export const delimiter: ";" | ":" =
  globalThis.process?.platform === "win32" ? ";" : ":";

export const posix = {
  ..._path,
  delimiter: ":",
  get posix() {
    return posix;
  },
  get win32() {
    return win32;
  },
} as typeof Posix;

export const win32 = {
  ..._path,
  delimiter: ";",
  get posix() {
    return posix;
  },
  get win32() {
    return win32;
  },
} as typeof Win32;

export default {
  ...posix,
  delimiter,
  posix,
  win32,
} as PlatformPath;
