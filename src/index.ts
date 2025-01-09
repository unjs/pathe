import type { posix as Posix, win32 as Win32, PlatformPath } from "node:path";

import * as _path from "./_path";

export * from "./_path";

/**
 * The platform-specific file delimiter.
 *
 * Equals to `";"` in windows and `":"` in all other platforms.
 */
export const delimiter: ";" | ":" = /* @__PURE__ */ (() =>
  globalThis.process?.platform === "win32" ? ";" : ":")();

// Mix namespaces without side-effects of object to allow tree-shaking

const _platforms = { posix: undefined, win32: undefined } as {
  posix: typeof Posix;
  win32: typeof Win32;
};

const mix = (del: ";" | ":" = delimiter) => {
  return new Proxy(_path, {
    get(_, prop) {
      if (prop === "delimiter") return del;
      if (prop === "posix") return posix;
      if (prop === "win32") return win32;
      return _platforms[prop] || _path[prop];
    },
  }) as unknown as PlatformPath;
};

export const posix = /* @__PURE__ */ mix(":") as typeof Posix;
export const win32 = /* @__PURE__ */ mix(";") as typeof Win32;

export default posix;
