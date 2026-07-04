import * as _path from "./_path";
import { withPreserveBackslash } from "./_internal";

export * from "./_path";

type NodePath = typeof import("node:path");

/**
 * The platform-specific file delimiter.
 *
 * Equals to `";"` in windows and `":"` in all other platforms.
 */
export const delimiter: ";" | ":" = /* @__PURE__ */ (() =>
  globalThis.process?.platform === "win32" ? ";" : ":")();

// Mix namespaces without side-effects of object to allow tree-shaking

const _platforms = { posix: undefined, win32: undefined } as unknown as {
  posix: NodePath["posix"];
  win32: NodePath["win32"];
  [key: PropertyKey]: unknown;
};

const mix = (del: ";" | ":" = delimiter, preserveBackslash = false) => {
  return new Proxy(_path, {
    get(_, prop) {
      if (prop === "delimiter") return del;
      if (prop === "posix") return posix;
      if (prop === "win32") return win32;
      const value = _platforms[prop] || _path[prop as keyof typeof _path];
      if (preserveBackslash && typeof value === "function") {
        return withPreserveBackslash(value as (...args: unknown[]) => unknown);
      }
      return value;
    },
  }) as unknown as NodePath;
};

// `posix` preserves backslashes to match `node:path.posix`, where `\` is an
// ordinary filename character on POSIX systems.
export const posix = /* @__PURE__ */ mix(":", true) as NodePath["posix"];

export const win32 = /* @__PURE__ */ mix(";") as NodePath["win32"];

// Default export keeps converting backslashes (backward compatible); opt into
// POSIX backslash-preserving semantics explicitly via `posix.*`.
// Built as a plain object rather than a Proxy to avoid a `get` trap on every
// property access, since it needs no per-call wrapping.
export default /* @__PURE__ */ {
  ..._path,
  delimiter,
  posix,
  win32,
} as unknown as NodePath;
