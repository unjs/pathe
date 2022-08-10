const pathSeparators = ['/', '\\', undefined]

export function normalizeAliases (_aliases: Record<string, string>) {
  // Sort aliases from specific to general (ie. fs/promises before fs)
  const aliases = Object.fromEntries(Object.entries(_aliases).sort(([a], [b]) => _compareAliases(a, b)))
  // Resolve alias values in relation to each other
  for (const key in aliases) {
    for (const alias in aliases) {
      // don't resolve a more specific alias with regard to a less specific one
      if (alias === key || key.startsWith(alias)) { continue }

      if (aliases[key].startsWith(alias) && pathSeparators.includes(aliases[key][alias.length])) {
        aliases[key] = aliases[alias] + aliases[key].slice(alias.length)
      }
    }
  }
  return aliases
}

const FILENAME_RE = /(?<=^|[\\/])([^\\/]+?)(?=(\.[^.]+)?$)/

export function filename (path: string) {
  return path.match(FILENAME_RE)?.[0]
}

// --- internals ---

function _compareAliases (a: string, b: string) {
  return b.split('/').length - a.split('/').length
}
