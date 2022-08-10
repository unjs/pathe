// Util to normalize windows paths to posix
export function normalizeWindowsPath (input: string = '') {
  if (!input || !input.includes('\\')) {
    return input
  }
  return input.replace(/\\/g, '/')
}
