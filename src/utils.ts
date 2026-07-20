import { join } from "./_path";
import { normalizeWindowsPath } from "./_internal";

const pathSeparators = new Set(["/", "\\", undefined]);

const normalizedAliasSymbol = Symbol.for("pathe:normalizedAlias");

const SLASH_RE = /[/\\]/;

// Characters that are illegal in Windows file and directory names, plus
// C0 control characters and the ASCII separator characters. See issue #47.
const UNSAFE_NAME_CHARS = /[<>:"/\\|?*\u0000-\u001F]/g;

// Windows reserved device names (with optional extension): CON, PRN, AUX,
// NUL, COM1-9, LPT1-9. These cannot be used as a file or directory name.
const RESERVED_NAME_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\.|$)/i;

/**
 * Sanitizes a file or directory name so it is valid across platforms (notably
 * Windows). Removes illegal characters (`< > : " / \ | ? *` and C0 controls),
 * strips leading/trailing dots and spaces, collapses internal whitespace,
 * neutralises Windows reserved device names (CON, PRN, …), and clamps the
 * length to 255 characters (preserving the extension when possible). An empty
 * or all-illegal name falls back to `"unnamed"`. See issue #47.
 */
export function safeName(name: string): string {
  let cleaned = String(name).replace(UNSAFE_NAME_CHARS, "");
  cleaned = cleaned.replace(/^(?:\.|\s)+/, "").replace(/(?:\.|\s)+$/, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (RESERVED_NAME_RE.test(cleaned)) {
    cleaned = "_" + cleaned;
  }
  if (!cleaned) {
    cleaned = "unnamed";
  }
  if (cleaned.length > 255) {
    const extMatch = cleaned.match(/\.[^.]+$/);
    const ext = extMatch ? extMatch[0] : "";
    const baseMax = Math.max(0, 255 - ext.length);
    cleaned = cleaned.slice(0, baseMax) + ext;
  }
  return cleaned;
}

/**
 * Sanitizes a full path by applying {@link safeName} to every path segment,
 * preserving its absolute/relative shape. Consecutive separators are collapsed
 * to a single `/`, a leading separator is preserved (absolute paths), and a
 * trailing separator is preserved. See issue #47.
 */
export function safePath(path: string): string {
  const input = String(path);
  const isAbsolute = input.startsWith("/") || /^[A-Za-z]:[\\/]/.test(input);
  const hasTrailingSep = input.length > 0 && /[\\/]/.test(input[input.length - 1]);
  // A Windows drive prefix is `X:` + separator; require the separator so that
  // a leading `name:` (e.g. `a:b`) is not mistaken for a drive prefix.
  const stripped = input.replace(/^[A-Za-z]:[\\/]/, "");
  const segments = stripped
    .split(/[\\/]+/)
    .filter(segment => segment.length > 0)
    .map(segment => safeName(segment));
  const joined = segments.join("/");
  const prefix = isAbsolute ? "/" : "";
  const suffix = hasTrailingSep && joined ? "/" : "";
  return prefix + joined + suffix;
}

/**
 * Normalises alias mappings, ensuring that more specific aliases are resolved before less specific ones.
 * This function also ensures that aliases do not resolve to themselves cyclically.
 *
 * @param _aliases - A set of alias mappings where each key is an alias and its value is the actual path it points to.
 * @returns a set of normalised alias mappings.
 */
export function normalizeAliases(_aliases: Record<string, string>) {
  if ((_aliases as any)[normalizedAliasSymbol]) {
    return _aliases;
  }

  // Sort aliases from specific to general (ie. fs/promises before fs)
  const aliases = Object.fromEntries(
    Object.entries(_aliases).sort(([a], [b]) => _compareAliases(a, b)),
  );

  // Resolve alias values in relation to each other
  for (const key in aliases) {
    for (const alias in aliases) {
      // don't resolve a more specific alias with regard to a less specific one
      if (alias === key || key.startsWith(alias)) {
        continue;
      }

      if (aliases[key]?.startsWith(alias) && pathSeparators.has(aliases[key][alias.length])) {
        aliases[key] = aliases[alias] + aliases[key].slice(alias.length);
      }
    }
  }

  Object.defineProperty(aliases, normalizedAliasSymbol, {
    value: true,
    enumerable: false,
  });
  return aliases;
}

/**
 * Resolves a path string to its alias if applicable, otherwise returns the original path.
 * This function normalises the path, resolves the alias and then joins it to the alias target if necessary.
 *
 * @param path - The path string to resolve.
 * @param aliases - A set of alias mappings to use for resolution.
 * @returns the resolved path as a string.
 */
export function resolveAlias(path: string, aliases: Record<string, string>) {
  const _path = normalizeWindowsPath(path);
  aliases = normalizeAliases(aliases);
  for (const [alias, to] of Object.entries(aliases)) {
    if (!_path.startsWith(alias)) {
      continue;
    }

    // Strip trailing slash from alias for check
    const _alias = hasTrailingSlash(alias) ? alias.slice(0, -1) : alias;

    if (hasTrailingSlash(_path[_alias.length])) {
      return join(to, _path.slice(alias.length));
    }
  }
  return _path;
}

/**
 * Resolves a path string to its possible alias.
 *
 * Returns an array of possible alias resolutions (could be empty), sorted by specificity (longest first).
 */
export function reverseResolveAlias(path: string, aliases: Record<string, string>): string[] {
  const _path = normalizeWindowsPath(path);
  aliases = normalizeAliases(aliases);

  const matches: string[] = [];

  for (const [to, alias] of Object.entries(aliases)) {
    if (!_path.startsWith(alias)) {
      continue;
    }

    // Strip trailing slash from alias for check
    const _alias = hasTrailingSlash(alias) ? alias.slice(0, -1) : alias;

    if (hasTrailingSlash(_path[_alias.length])) {
      matches.push(join(to, _path.slice(alias.length)));
    }
  }

  // Sort by length, longest (more specific) first
  return matches.sort((a, b) => b.length - a.length);
}

/**
 * Extracts the filename from a given path, excluding any directory paths and the file extension.
 *
 * @param path - The full path of the file from which to extract the filename.
 * @returns the filename without the extension, or `undefined` if the filename cannot be extracted.
 */
export function filename(path: string) {
  const base = path.split(SLASH_RE).pop();

  if (!base) {
    return undefined;
  }

  const separatorIndex = base.lastIndexOf(".");

  if (separatorIndex <= 0) {
    return base;
  }

  return base.slice(0, separatorIndex);
}

// --- internals ---

function _compareAliases(a: string, b: string) {
  return b.split("/").length - a.split("/").length;
}

// Returns true if path ends with a slash or **is empty**
function hasTrailingSlash(path = "/") {
  const lastChar = path[path.length - 1];
  return lastChar === "/" || lastChar === "\\";
}
