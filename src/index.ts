// Reference https://nodejs.org/api/path.html
import type path from 'path'

import * as _path from './path'
export * from './path'

// Default export
export default {
  ..._path
} as Omit<typeof path, 'win32' | 'posix'>
