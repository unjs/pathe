import { describe, expect, it } from 'vitest'

import { resolveAliases, sortAliases, filename } from '../src/utils'

describe('resolveAliases', () => {
  it('should work', () => {
    expect(resolveAliases({
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

describe('sortAliases', () => {
  it('should work', () => {
    expect(sortAliases(['a/foo', 'a/foo-barbaz', 'a/foo/bar', 'a/b/c'])).toMatchInlineSnapshot(`
      [
        "a/foo/bar",
        "a/b/c",
        "a/foo",
        "a/foo-barbaz",
      ]
    `)
  })

  it.todo('compare unrelated prefixes', () => {
    expect(sortPaths([
      'path/to/1.intro/foo/bar',
      'path/to/2.guide/foo/bar/baz',
    ])).toMatchInlineSnapshot(`
      [
        "path/to/2.guide/foo/bar/baz",
        "path/to/1.intro/foo/bar",
      ]
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
