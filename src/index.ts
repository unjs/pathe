import * as _path from "./_path";

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

const mix = (del: ";" | ":" = delimiter) => {
  return new Proxy(_path, {
    get(_, prop) {
      if (prop === "delimiter") return del;
      if (prop === "posix") return posix;
      if (prop === "win32") return win32;
      return _platforms[prop] || _path[prop as keyof typeof _path];
    },
  }) as unknown as NodePath;
};

export const posix = /* @__PURE__ */ mix(":") as NodePath["posix"];

export const win32 = /* @__PURE__ */ mix(";") as NodePath["win32"];

export default posix as NodePath;
