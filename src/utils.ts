import { join } from "./path";
import { normalizeWindowsPath } from "./_internal";

const SEPARATORS = ["/", "\\"];
const pathSeparators = new Set([...SEPARATORS, undefined]);

const normalizedAliasSymbol = Symbol.for("pathe:normalizedAlias");

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

export function resolveAlias(path: string, aliases: Record<string, string>) {
  const _path = normalizeWindowsPath(path);
  aliases = normalizeAliases(aliases);
  for (const alias in aliases) { 
    if (_path.startsWith(alias) && pathSeparators.has(_path[SEPARATORS.includes(alias[alias.length - 1]) ? alias.length - 1 : alias.length])) {
      return join(aliases[alias], _path.slice(alias.length));
    }
  }
  return _path;
}

const FILENAME_RE = /(^|[/\\])([^/\\]+?)(?=(\.[^.]+)?$)/;

export function filename(path: string) {
  return path.match(FILENAME_RE)?.[2];
}

// --- internals ---

function _compareAliases(a: string, b: string) {
  return b.split("/").length - a.split("/").length;
}
