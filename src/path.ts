/*
Based on Node.js implementation:
 - Forked from: https://github.com/nodejs/node/blob/4b030d057375e58d2e99182f6ef7aa70f6ebcf99/lib/path.js
 - Latest: https://github.com/nodejs/node/blob/main/lib/path.js
Check LICENSE file

*/

import type path from 'path'

import { normalizeWindowsPath } from './utils'

const _UNC_REGEX = /^[/][/]/
const _UNC_DRIVE_REGEX = /^[/][/]([.]{1,2}[/])?([a-zA-Z]):[/]/
const _IS_ABSOLUTE_RE = /^\/|^\\|^[a-zA-Z]:[/\\]/

// Force POSIX contants
export const sep = '/'
export const delimiter = ':'

// normalize
export const normalize: typeof path.normalize = function (path: string) {
  if (path.length === 0) { return '.' }

  // Normalize windows argument
  path = normalizeWindowsPath(path)

  const isUNCPath = path.match(_UNC_REGEX)
  const hasUNCDrive = isUNCPath && path.match(_UNC_DRIVE_REGEX)
  const isPathAbsolute = isAbsolute(path)
  const trailingSeparator = path[path.length - 1] === '/'

  // Normalize the path
  path = normalizeString(path, !isPathAbsolute)

  if (path.length === 0) {
    if (isPathAbsolute) { return '/' }
    return trailingSeparator ? './' : '.'
  }
  if (trailingSeparator) { path += '/' }

  if (isUNCPath) {
    if (hasUNCDrive) {
      return `//./${path}`
    }
    return `//${path}`
  }

  return isPathAbsolute && !isAbsolute(path) ? `/${path}` : path
}

// join
export const join: typeof path.join = function (...args) {
  if (args.length === 0) {
    return '.'
  }

  let joined: string
  for (let i = 0; i < args.length; ++i) {
    const arg = args[i]
    if (arg.length > 0) {
      if (joined === undefined) {
        joined = arg
      } else {
        joined += `/${arg}`
      }
    }
  }
  if (joined === undefined) {
    return '.'
  }

  return normalize(joined.replace(/\/\/+/g, '/'))
}

// resolve
export const resolve: typeof path.resolve = function (...args) {
  // Normalize windows arguments
  args = args.map(arg => normalizeWindowsPath(arg))

  let resolvedPath = ''
  let resolvedAbsolute = false

  for (let i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
    const path = i >= 0 ? args[i] : process.cwd().replace(/\\/g, '/')

    // Skip empty entries
    if (path.length === 0) {
      continue
    }

    resolvedPath = `${path}/${resolvedPath}`
    resolvedAbsolute = isAbsolute(path)
  }

  // At this point the path should be resolved to a full absolute path, but
  // handle relative paths to be safe (might happen when process.cwd() fails)

  // Normalize the path
  resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute)

  if (resolvedAbsolute && !isAbsolute(resolvedPath)) {
    return `/${resolvedPath}`
  }

  return resolvedPath.length > 0 ? resolvedPath : '.'
}

// Resolves . and .. elements in a path with directory names
export function normalizeString (path: string, allowAboveRoot: boolean) {
  let res = ''
  let lastSegmentLength = 0
  let lastSlash = -1
  let dots = 0
  let char = null
  for (let i = 0; i <= path.length; ++i) {
    if (i < path.length) {
      char = path[i]
    } else if (char === '/') {
      break
    } else {
      char = '/'
    }
    if (char === '/') {
      if (lastSlash === i - 1 || dots === 1) {
        // NOOP
      } else if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 ||
            res[res.length - 1] !== '.' ||
            res[res.length - 2] !== '.') {
          if (res.length > 2) {
            const lastSlashIndex = res.lastIndexOf('/')
            if (lastSlashIndex === -1) {
              res = ''
              lastSegmentLength = 0
            } else {
              res = res.slice(0, lastSlashIndex)
              lastSegmentLength = res.length - 1 - res.lastIndexOf('/')
            }
            lastSlash = i
            dots = 0
            continue
          } else if (res.length !== 0) {
            res = ''
            lastSegmentLength = 0
            lastSlash = i
            dots = 0
            continue
          }
        }
        if (allowAboveRoot) {
          res += res.length > 0 ? '/..' : '..'
          lastSegmentLength = 2
        }
      } else {
        if (res.length > 0) {
          res += `/${path.slice(lastSlash + 1, i)}`
        } else {
          res = path.slice(lastSlash + 1, i)
        }
        lastSegmentLength = i - lastSlash - 1
      }
      lastSlash = i
      dots = 0
    } else if (char === '.' && dots !== -1) {
      ++dots
    } else {
      dots = -1
    }
  }
  return res
}

// isAbsolute
export const isAbsolute: typeof path.isAbsolute = function (p) {
  return _IS_ABSOLUTE_RE.test(p)
}

// toNamespacedPath
export const toNamespacedPath: typeof path.toNamespacedPath = function (p) {
  return normalizeWindowsPath(p)
}

// extname
const _EXTNAME_RE = /(?<!^)\.[^/.]+$/
export const extname: typeof path.extname = function (p) {
  const match = _EXTNAME_RE.exec(normalizeWindowsPath(p))
  return (match && match[0]) || ''
}

// relative
export const relative: typeof path.relative = function (from, to) {
  const _from = resolve(from).split('/')
  const _to = resolve(to).split('/')
  for (const segment of [..._from]) {
    if (_to[0] !== segment) { break }
    _from.shift()
    _to.shift()
  }
  return [..._from.map(() => '..'), ..._to].join('/')
}

// dirname
export const dirname: typeof path.dirname = function (p) {
  return normalizeWindowsPath(p).replace(/\/$/, '').split('/').slice(0, -1).join('/') || (isAbsolute(p) ? '/' : '.')
}

// format
export const format: typeof path.format = function (p) {
  const segments = [p.root, p.dir, p.base ?? (p.name + p.ext)].filter(Boolean)
  return normalizeWindowsPath(p.root ? resolve(...segments) : segments.join('/'))
}

// basename
export const basename: typeof path.basename = function (p, ext) {
  const lastSegment = normalizeWindowsPath(p).split('/').pop()
  return lastSegment.endsWith(ext) ? lastSegment.slice(0, -ext.length) : lastSegment
}

// parse
export const parse: typeof path.parse = function (p) {
  const root = normalizeWindowsPath(p).split('/').shift() || '/'
  const base = basename(p)
  const ext = extname(base)
  return {
    root,
    dir: dirname(p),
    base,
    ext,
    name: base.slice(0, base.length - ext.length)
  }
}
