import { describe, expect, it } from 'vitest'

import { normalizeAliases, filename } from '../src/utils'

describe('normalizeAliases', () => {
  it('should work', () => {
    expect(normalizeAliases({
      '@foo/bar': '@foo/bar/dist/index.mjs',
      '@foo/bar/utils': '@foo/bar/dist/utils.mjs',
      '@': '/root',
      bingpot: '@/bingpot/index.ts',
      unchanged: '@bingpot/index.ts'
    })).toMatchInlineSnapshot(`
      {
        "@": "/root",
        "@foo/bar": "@foo/bar/dist/index.mjs",
        "@foo/bar/utils": "@foo/bar/dist/utils.mjs",
        "bingpot": "/root/bingpot/index.ts",
        "unchanged": "@bingpot/index.ts",
      }
    `)
  })
})

describe('filename', () => {
  const files = {
  // POSIX
    'test.html': 'test',
    '/temp/myfile.html': 'myfile',
    './myfile.html': 'myfile',

    // Windows
    'C:\\temp\\': undefined,
    'C:\\temp\\myfile.html': 'myfile',
    '\\temp\\myfile.html': 'myfile',
    '.\\myfile.html': 'myfile'
  }
  for (const file in files) {
    it(file, () => {
      expect(filename(file)).toEqual(files[file])
    })
  }
})
