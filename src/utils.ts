export function resolveAliases (_aliases: Record<string, string>) {
  // Sort aliases from specific to general (ie. fs/promises before fs)
  const aliases = Object.fromEntries(Object.entries(_aliases).sort(([a], [b]) =>
    (b.split('/').length - a.split('/').length) || (b.length - a.length)
  ))
  // Resolve alias values in relation to each other
  for (const key in aliases) {
    for (const alias in aliases) {
      if (alias === '@' && !aliases[key].startsWith('@/')) { continue } // Don't resolve @foo/bar

      if (aliases[key].startsWith(alias)) {
        aliases[key] = aliases[alias] + aliases[key].slice(alias.length)
      }
    }
  }
  return aliases
}

export function sortPaths (paths: string[]) {
  return paths.sort((a, b) =>
    (b.split('/').length - a.split('/').length) || (b.length - a.length)
  )
}

const FILENAME_RE = /(?<=^|\/)([^/]+?)(?=(\.[^.]+)?$)/

export function filename (path: string) {
  return path.match(FILENAME_RE)?.[0]
}
