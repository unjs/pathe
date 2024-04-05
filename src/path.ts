/*
Based on Node.js implementation:
 - Forked from: https://github.com/nodejs/node/blob/4b030d057375e58d2e99182f6ef7aa70f6ebcf99/lib/path.js
 - Latest: https://github.com/nodejs/node/blob/main/lib/path.js
Check LICENSE file

*/

import type path from "node:path";

import { normalizeWindowsPath } from "./_internal";

const _UNC_REGEX = /^[/\\]{2}/;
const _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/;
const _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
const _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;

// Force POSIX contants
/**
 * File system path separator constant, forced to POSIX style for consistency.
 */
export const sep = "/";
/**
 * Path delimiter constant, used to separate paths in environment variables.
 */
export const delimiter = ":";

/**
 * Normalises the given path, resolving '.' and '.' segments.
 *
 * @param path - The path to normalise.
 * @returns the normalised path.
 */
export const normalize: typeof path.normalize = function (path: string) {
  if (path.length === 0) {
    return ".";
  }

  // Normalize windows argument
  path = normalizeWindowsPath(path);

  const isUNCPath = path.match(_UNC_REGEX);
  const isPathAbsolute = isAbsolute(path);
  const trailingSeparator = path[path.length - 1] === "/";

  // Normalize the path
  path = normalizeString(path, !isPathAbsolute);

  if (path.length === 0) {
    if (isPathAbsolute) {
      return "/";
    }
    return trailingSeparator ? "./" : ".";
  }
  if (trailingSeparator) {
    path += "/";
  }
  if (_DRIVE_LETTER_RE.test(path)) {
    path += "/";
  }

  if (isUNCPath) {
    if (!isPathAbsolute) {
      return `//./${path}`;
    }
    return `//${path}`;
  }

  return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path;
};

/**
 * Joins all given path segments using the POSIX separator, then normalises the resulting path.
 *
 * @param arguments_ - The path segments to join.
 * @returns the joined and normalised path.
 */
export const join: typeof path.join = function (...arguments_) {
  if (arguments_.length === 0) {
    return ".";
  }

  let joined: string;
  for (const argument of arguments_) {
    if (argument && argument.length > 0) {
      if (joined === undefined) {
        joined = argument;
      } else {
        joined += `/${argument}`;
      }
    }
  }
  if (joined === undefined) {
    return ".";
  }

  return normalize(joined.replace(/\/\/+/g, "/"));
};

function cwd() {
  if (typeof process !== "undefined" && typeof process.cwd === "function") {
    return process.cwd().replace(/\\/g, "/");
  }
  return "/";
}

/**
 * Resolves a sequence of paths to an absolute path.
 * The resulting path is normalised and trailing slashes are removed unless the path is a root directory.
 *
 * @param arguments_ - The sequence of paths to resolve.
 * @returns the resolved absolute path.
 */
export const resolve: typeof path.resolve = function (...arguments_) {
  // Normalize windows arguments
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));

  let resolvedPath = "";
  let resolvedAbsolute = false;

  for (
    let index = arguments_.length - 1;
    index >= -1 && !resolvedAbsolute;
    index--
  ) {
    const path = index >= 0 ? arguments_[index] : cwd();

    // Skip empty entries
    if (!path || path.length === 0) {
      continue;
    }

    resolvedPath = `${path}/${resolvedPath}`;
    resolvedAbsolute = isAbsolute(path);
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute);

  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`;
  }

  return resolvedPath.length > 0 ? resolvedPath : ".";
};

/**
 * Resolves a string path, resolving '.' and '.' segments and allowing paths above the root.
 *
 * @param path - The path to normalise.
 * @param allowAboveRoot - Whether to allow the resulting path to be above the root directory.
 * @returns the normalised path string.
 */
export function normalizeString(path: string, allowAboveRoot: boolean) {
  let res = "";
  let lastSegmentLength = 0;
  let lastSlash = -1;
  let dots = 0;
  let char: string | null = null;
  for (let index = 0; index <= path.length; ++index) {
    if (index < path.length) {
      char = path[index];
    } else if (char === "/") {
      break;
    } else {
      char = "/";
    }
    if (char === "/") {
      if (lastSlash === index - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
        if (
          res.length < 2 ||
          lastSegmentLength !== 2 ||
          res[res.length - 1] !== "." ||
          res[res.length - 2] !== "."
        ) {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf("/");
            if (lastSlashIndex === -1) {
              res = "";
              lastSegmentLength = 0;
            } else {
              res = res.slice(0, lastSlashIndex);
              lastSegmentLength = res.length - 1 - res.lastIndexOf("/");
            }
            lastSlash = index;
            dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "";
            lastSegmentLength = 0;
            lastSlash = index;
            dots = 0;
            continue;
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? "/.." : "..";
          lastSegmentLength = 2;
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, index)}`;
        } else {
          res = path.slice(lastSlash + 1, index);
        }
        lastSegmentLength = index - lastSlash - 1;
      }
      lastSlash = index;
      dots = 0;
    } else if (char === "." && dots !== -1) {
      ++dots;
    } else {
      dots = -1;
    }
  }
  return res;
}

/**
 * Determines if a path is an absolute path.
 *
 * @param p - The path to check.
 * @returns `true` if the path is absolute, otherwise `false`.
 */
export const isAbsolute: typeof path.isAbsolute = function (p) {
  return _IS_ABSOLUTE_RE.test(p);
};

/**
 * Converts a non-namespaced path into a namespaced path. On POSIX systems this is a noop.
 *
 * @param p - The path to convert.
 * @returns the namespaced path.
 */
export const toNamespacedPath: typeof path.toNamespacedPath = function (p) {
  return normalizeWindowsPath(p);
};

// extname
const _EXTNAME_RE = /.(\.[^./]+)$/;
/**
 * Returns the extension of the path, from the last occurrence of the '.' (period) character to the end of the string in the last part of the path.
 * If there is no '.' in the last part of the path, or if there are no '.' characters other than the first character of the basename of the path, an empty string is returned.
 *
 * @param p - The path to evaluate.
 * @returns the extension of the path.
 */
export const extname: typeof path.extname = function (p) {
  const match = _EXTNAME_RE.exec(normalizeWindowsPath(p));
  return (match && match[1]) || "";
};

/**
 * Specifies the relative path from one path to another.
 *
 * @param from - The source path.
 * @param to - The destination path.
 * @returns the relative path from the source to the target.
 */
export const relative: typeof path.relative = function (from, to) {
  const _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/");
  const _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");

  // Different windows drive letters
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0]) {
    return _to.join("/");
  }

  const _fromCopy = [..._from];
  for (const segment of _fromCopy) {
    if (_to[0] !== segment) {
      break;
    }
    _from.shift();
    _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};

/**
 * Returns the directory name of a path, similar to the Unix dirname command.
 * Trailing directory separators are ignored.
 *
 * @param p - The path to evaluate.
 * @returns the directory portion of the path.
 */
export const dirname: typeof path.dirname = function (p) {
  const segments = normalizeWindowsPath(p)
    .replace(/\/$/, "")
    .split("/")
    .slice(0, -1);
  if (segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0])) {
    segments[0] += "/";
  }
  return segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

/**
 * Returns a path string from an object.
 *
 * @param p - The path object.
 * @returns the formatted path string.
 */
export const format: typeof path.format = function (p) {
  const segments = [p.root, p.dir, p.base ?? p.name + p.ext].filter(Boolean);
  return normalizeWindowsPath(
    p.root ? resolve(...segments) : segments.join("/"),
  );
};

/**
 * Returns the last part of a path, similar to the Unix basename command.
 * Trailing directory separators are considered part of the path.
 *
 * @param p - The path to evaluate.
 * @param extension - An optional file extension to remove from the result.
 * @returns the last part of the path.
 */
export const basename: typeof path.basename = function (p, extension) {
  const lastSegment = normalizeWindowsPath(p).split("/").pop();
  return extension && lastSegment.endsWith(extension)
    ? lastSegment.slice(0, -extension.length)
    : lastSegment;
};

/**
 * Returns an object from a path string - the opposite of format().
 *
 * @param p - The path string to parse.
 * @returns an object representing the path.
 */
export const parse: typeof path.parse = function (p) {
  const root = normalizeWindowsPath(p).split("/").shift() || "/";
  const base = basename(p);
  const extension = extname(base);
  return {
    root,
    dir: dirname(p),
    base,
    ext: extension,
    name: base.slice(0, base.length - extension.length),
  };
};
