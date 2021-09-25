// Reference https://nodejs.org/api/path.html
import path from 'path'

// Force posix contants
export const sep = '/'
export const delimiter = ':'

// Export platforms as is
export const win32 = path.win32
export const posix = path.posix

// extname
export const extname: typeof path.extname = function (p) {
  return path.posix.extname(normalizeWindowsPath(p))
}

// normalize
export const normalize: typeof path.normalize = function (p) {
  return path.posix.normalize(normalizeWindowsPath(p))
}

// join
export const join: typeof path.join = function (...args) {
  return path.posix.join.apply(path.posix.join, args.map(arg => normalizeWindowsPath(arg)))
}

// relative
export const relative: typeof path.relative = function (from, to) {
  return path.posix.relative(normalizeWindowsPath(from), normalizeWindowsPath(to))
}

// dirname
export const dirname: typeof path.dirname = function (p) {
  return path.posix.dirname(normalizeWindowsPath(p))
}

// resolve
// TODO: Find a way to use path.posix for consistant behavior
export const resolve: typeof path.resolve = function (...args) {
  return path.resolve.apply(path.resolve, args.map(arg => normalizeWindowsPath(arg)))
}

// format
export const format: typeof path.format = function (p) {
  return normalizeWindowsPath(path.posix.format(p))
}

// basename
export const basename: typeof path.basename = function (p, ext) {
  return path.posix.basename(normalizeWindowsPath(p), ext)
}

// parse
export const parse: typeof path.parse = function (p) {
  return path.posix.parse(normalizeWindowsPath(p))
}

// toNamespacedPath
export const toNamespacedPath: typeof path.toNamespacedPath = function (p) {
  return p
}

// isAbsolute
const _IS_ABSOLUTE_RE = /^\/|^\\|^[a-zA-Z]:[/\\]/
export const isAbsolute: typeof path.isAbsolute = function (p) {
  return _IS_ABSOLUTE_RE.test(p)
}

// Util to normalize windows paths to posix
export function normalizeWindowsPath (input: string = '') {
  if (!input.includes('\\')) {
    return input
  }
  return input.replace(/\\/g, '/')
}

// Default export
export default {
  win32,
  posix,
  sep,
  delimiter,
  resolve,
  normalize,
  isAbsolute,
  join,
  relative,
  toNamespacedPath,
  dirname,
  basename,
  extname,
  format,
  parse
} as typeof path
