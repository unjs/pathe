import { expect } from 'chai'

import { basename, dirname, extname, format, parse, relative, delimiter, isAbsolute, join, normalize, resolve, sep, toNamespacedPath } from '../src'

import { normalizeWindowsPath } from '../src/utils'

runTest('normalizeWindowsPath', normalizeWindowsPath, {
  // POSIX
  '/foo/bar': '/foo/bar',

  // Windows
  'c:\\foo\\bar': 'c:/foo/bar',
  '\\foo\\bar': '/foo/bar',
  '.\\foo\\bar': './foo/bar'
})

runTest('isAbsolute', isAbsolute, {
  // POSIX
  '/foo/bar': true,
  '/baz/..': true,
  'quax/': false,
  '.': false,

  // Windows
  '//server': true,
  '\\\\server': true,
  'C:/foo/..': true,
  'bar\\baz': false,
  'bar/baz': false
})

runTest('basename', basename, {
  // POSIX
  'C:\\temp\\myfile.html': 'myfile.html',
  '\\temp\\myfile.html': 'myfile.html',
  '.\\myfile.html': 'myfile.html',

  // Windows
  '/temp/myfile.html': 'myfile.html',
  './myfile.html': 'myfile.html'
})

runTest('dirname', dirname, {
  // POSIX
  '/temp/myfile.html': '/temp',
  './myfile.html': '.',

  // Windows
  'C:\\temp\\myfile.html': 'C:/temp',
  '\\temp\\myfile.html': '/temp',
  '.\\myfile.html': '.'
})

runTest('extname', extname, {
  // POSIX
  '/temp/myfile.html': '.html',
  './myfile.html': '.html',

  // Windows
  'C:\\temp\\myfile.html': '.html',
  '\\temp\\myfile.html': '.html',
  '.\\myfile.html': '.html'
})

runTest('format', format, [
  // POSIX
  [{ root: '/ignored', dir: '/home/user/dir', base: 'file.txt' }, '/home/user/dir/file.txt'],
  [{ root: '/', base: 'file.txt', ext: 'ignored' }, '/file.txt'],
  [{ root: '/', name: 'file', ext: '.txt' }, '/file.txt'],

  // Windows
  [{ dir: 'C:\\path\\dir', base: 'file.txt' }, 'C:/path/dir/file.txt']
])

runTest('join', join, [
  ['some/nodejs/deep', '../path', 'some/nodejs/path'],
  ['./some/local/unix/', '../path', 'some/local/path'],
  ['./some\\current\\mixed', '..\\path', 'some/current/path'],
  ['../some/relative/destination', '..\\path', '../some/relative/path'],
  ['some/nodejs/deep', '../path', 'some/nodejs/path'],
  ['/foo', 'bar', 'baz/asdf', 'quux', '..', '/foo/bar/baz/asdf'],

  ['C:\\foo', 'bar', 'baz\\asdf', 'quux', '..', 'C:/foo/bar/baz/asdf'],
  ['some/nodejs\\windows', '../path', 'some/nodejs/path'],
  ['some\\windows\\only', '..\\path', 'some/windows/path'],
  // UNC paths
  ['\\\\server\\share\\file', '..\\path', '//server/share/path'],
  ['\\\\.\\c:\\temp\\file', '..\\path', '//./c:/temp/path'],
  ['\\\\server/share/file', '../path', '//server/share/path']
])

runTest('normalize', normalize, {
  // POSIX
  './': './',
  './../': '../',
  './../dep/': '../dep/',
  'path//dep\\': 'path/dep/',
  '/foo/bar//baz/asdf/quux/..': '/foo/bar/baz/asdf',

  // Windows
  'C:\\temp\\\\foo\\bar\\..\\': 'C:/temp/foo/',
  'C:////temp\\\\/\\/\\/foo/bar': 'C:/temp/foo/bar',
  'c:/windows/nodejs/path': 'c:/windows/nodejs/path',
  'c:/windows/../nodejs/path': 'c:/nodejs/path',

  'c:\\windows\\nodejs\\path': 'c:/windows/nodejs/path',
  'c:\\windows\\..\\nodejs\\path': 'c:/nodejs/path',

  '/windows\\unix/mixed': '/windows/unix/mixed',
  '\\windows//unix/mixed': '/windows/unix/mixed',
  '\\windows\\..\\unix/mixed/': '/unix/mixed/',
  './/windows\\unix/mixed/': 'windows/unix/mixed/',

  // UNC
  '\\\\server\\share\\file\\..\\path': '//server/share/path',
  '\\\\.\\c:\\temp\\file\\..\\path': '//./c:/temp/path',
  '\\\\server/share/file/../path': '//server/share/path'
})

it('parse', () => {
  // POSIX
  expect(parse('/home/user/dir/file.txt')).to.deep.equal({
    root: '/',
    dir: '/home/user/dir',
    base: 'file.txt',
    ext: '.txt',
    name: 'file'
  })

  // Windows
  expect(parse('C:\\path\\dir\\file.txt')).to.deep.equal({
    root: '', // 'C:/',
    dir: 'C:/path/dir',
    base: 'file.txt',
    ext: '.txt',
    name: 'file'
  })
})

runTest('relative', relative, [
  // POSIX
  ['/data/orandea/test/aaa', '/data/orandea/impl/bbb', '../../impl/bbb'],

  // Windows
  ['C:\\orandea\\test\\aaa', 'C:\\orandea\\impl\\bbb', '../../impl/bbb']
])

runTest('resolve', resolve, [
  // POSIX
  ['/foo/bar', './baz', '/foo/bar/baz'],
  ['/foo/bar', '/tmp/file/', '/tmp/file'],
  ['wwwroot', 'static_files/png/', '../gif/image.gif', `${process.cwd()}/wwwroot/static_files/gif/image.gif`],

  // Windows
  ['C:\\foo\\bar', '.\\baz', 'C:/foo/bar/baz'],
  ['\\foo\\bar', '.\\baz', '/foo/bar/baz'],
  ['\\foo\\bar', '\\tmp\\file\\', '/tmp/file'],
  ['wwwroot', 'static_files\\png\\', '..\\gif\\image.gif', `${process.cwd()}/wwwroot/static_files/gif/image.gif`],
  ['C:\\Windows\\path\\only', '../../reports', 'C:/Windows/reports'],
  ['C:\\Windows\\long\\path\\mixed/with/unix', '../..', '..\\../reports', 'C:/Windows/long/reports']
])

runTest('toNamespacedPath', toNamespacedPath, {
  // POSIX
  '/foo/bar': '/foo/bar',

  // Windows
  '\\foo\\bar': '/foo/bar',
  'C:\\foo\\bar': 'C:/foo/bar'
})

describe('contatants', () => {
  it('delimiter should equal :', () => {
    expect(delimiter).to.equal(':')
  })

  it('sep should equal /', () => {
    expect(sep).to.equal('/')
  })
})

function _s (item) {
  return JSON.stringify(item).replace(/"/g, '\'')
}

export function runTest (name, fn, items) {
  if (!Array.isArray(items)) {
    items = Object.entries(items).map(e => e.flat())
  }
  describe(`${name}`, () => {
    for (const item of items) {
      const expected = item.pop()
      const args = item
      it(`${name}(${args.map(_s).join(',')}) should be ${_s(expected)}`, () => {
        expect(fn(...args)).to.equal(expected)
      })
    }
  })
}
