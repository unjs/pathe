import { join } from "./_path";
import { normalizeWindowsPath } from "./_internal";

const pathSeparators = new Set(["/", "\\", undefined]);

const normalizedAliasSymbol = Symbol.for("pathe:normalizedAlias");

const SLASH_RE = /[/\\]/;

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

      if (
        aliases[key].startsWith(alias) &&
        pathSeparators.has(aliases[key][alias.length])
      ) {
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
export function reverseResolveAlias(
  path: string,
  aliases: Record<string, string>,
): string[] {
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
