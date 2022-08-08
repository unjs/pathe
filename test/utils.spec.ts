import { describe, expect, it } from 'vitest'

import { resolveAliases, sortPaths, comparePaths, filename } from '../src/utils'

describe('resolveAliases', () => {
  it('should work', () => {
    expect(resolveAliases({
      '@foo/bar': '@foo/bar/dist/index.mjs',
      '@foo/bar/utils': '@foo/bar/dist/utils.mjs',
      '@': '/root',
      bingpot: '@/bingpot/index.ts'
    })).toMatchInlineSnapshot(`
      {
        "@": "/root",
        "@foo/bar": "@foo/bar/dist/index.mjs",
        "@foo/bar/utils": "@foo/bar/dist/utils.mjs",
        "bingpot": "/root/bingpot/index.ts",
      }
    `)
  })
})

describe('sortPaths', () => {
  it('should work', () => {
    expect(sortPaths(['a/foo', 'a/foo-barbaz', 'a/foo/bar', 'a/b/c'])).toMatchInlineSnapshot(`
      [
        "a/foo/bar",
        "a/b/c",
        "a/foo-barbaz",
        "a/foo",
      ]
    `)
  })
})

describe('comparePaths', () => {
  it('should work', () => {
    expect(comparePaths('foo', 'foo/bar')).toEqual(1)
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
