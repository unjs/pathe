import { expect } from 'chai'

import { basename, delimiter, dirname, extname, format, isAbsolute, join, normalize, normalizeWindowsPath, parse, relative, resolve, sep, toNamespacedPath } from '../src'

const _s = item => JSON.stringify(item).replace(/"/g, '\'')

function runTest (fn, items) {
  const name = fn.name
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

runTest(normalizeWindowsPath, {
  // POSIX
  '/foo/bar': '/foo/bar',

  // Windows
  'c:\\foo\\bar': 'c:/foo/bar',
  '\\foo\\bar': '/foo/bar',
  '.\\foo\\bar': './foo/bar'
})

runTest(isAbsolute, {
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

it('basename', () => {
  // POSIX
  expect(basename('C:\\temp\\myfile.html')).to.equal('myfile.html')
  expect(basename('\\temp\\myfile.html')).to.equal('myfile.html')
  expect(basename('.\\myfile.html')).to.equal('myfile.html')

  // Windows
  expect(basename('/temp/myfile.html')).to.equal('myfile.html')
  expect(basename('./myfile.html')).to.equal('myfile.html')
})

describe('contatants', () => {
  it('delimiter should equal :', () => {
    expect(delimiter).to.equal(':')
  })

  it('sep should equal /', () => {
    expect(sep).to.equal('/')
  })
})

it('dirname', () => {
  // POSIX
  expect(dirname('/temp/myfile.html')).to.equal('/temp')
  expect(dirname('./myfile.html')).to.equal('.')

  // Windows
  expect(dirname('C:\\temp\\myfile.html')).to.equal('C:/temp')
  expect(dirname('\\temp\\myfile.html')).to.equal('/temp')
  expect(dirname('.\\myfile.html')).to.equal('.')
})

it('extname', () => {
  // POSIX
  expect(extname('/temp/myfile.html')).to.equal('.html')
  expect(extname('./myfile.html')).to.equal('.html')

  // Windows
  expect(extname('C:\\temp\\myfile.html')).to.equal('.html')
  expect(extname('\\temp\\myfile.html')).to.equal('.html')
  expect(extname('.\\myfile.html')).to.equal('.html')
})

it('format', () => {
  // POSIX
  expect(format({ root: '/ignored', dir: '/home/user/dir', base: 'file.txt' })).to.equal('/home/user/dir/file.txt')
  expect(format({ root: '/', base: 'file.txt', ext: 'ignored' })).to.equal('/file.txt')
  expect(format({ root: '/', name: 'file', ext: '.txt' })).to.equal('/file.txt')

  // Windows
  expect(format({ dir: 'C:\\path\\dir', base: 'file.txt' })).to.equal('C:/path/dir/file.txt')
})

runTest(join, [
  ['some/nodejs/deep', '../path', 'some/nodejs/path'],
  ['./some/local/unix/', '../path', 'some/local/path'],
  ['./some\\current\\mixed', '..\\path', 'some/current/path'],
  ['../some/relative/destination', '..\\path', '../some/relative/path'],
  ['some/nodejs/deep', '../path', 'some/nodejs/path'],
  ['/foo', 'bar', 'baz/asdf', 'quux', '..', '/foo/bar/baz/asdf'],

  ['C:\\foo', 'bar', 'baz\\asdf', 'quux', '..', 'C:/foo/bar/baz/asdf'],
  ['some/nodejs\\windows', '../path', 'some/nodejs/path'],
  ['some\\windows\\only', '..\\path', 'some/windows/path']
  // expect(join('\\\\server\\share\\file', '..\\path')).to.equal('//server/share/path')
  // expect(join('\\\\.\\c:\\temp\\file', '..\\path')).to.equal('//./c:/temp/path')
  // expect(join('//server/share/file', '../path')).to.equal('//server/share/path')
  // expect(join('//./c:/temp/file', '../path')).to.equal('//./c:/temp/path')
])

it('normalize', () => {
  // POSIX
  expect(normalize('./')).to.equal('./')
  expect(normalize('./../')).to.equal('../')
  expect(normalize('./../dep/')).to.equal('../dep/')
  expect(normalize('path//dep\\')).to.equal('path/dep/')
  expect(normalize('/foo/bar//baz/asdf/quux/..')).to.equal('/foo/bar/baz/asdf')

  // Windows
  expect(normalize('C:\\temp\\\\foo\\bar\\..\\')).to.equal('C:/temp/foo/')
  expect(normalize('C:////temp\\\\/\\/\\/foo/bar')).to.equal('C:/temp/foo/bar')
  expect(normalize('c:/windows/nodejs/path')).to.equal('c:/windows/nodejs/path')
  expect(normalize('c:/windows/../nodejs/path')).to.equal('c:/nodejs/path')

  expect(normalize('c:\\windows\\nodejs\\path')).to.equal('c:/windows/nodejs/path')
  expect(normalize('c:\\windows\\..\\nodejs\\path')).to.equal('c:/nodejs/path')

  expect(normalize('/windows\\unix/mixed')).to.equal('/windows/unix/mixed')
  expect(normalize('\\windows//unix/mixed')).to.equal('/windows/unix/mixed')
  expect(normalize('\\windows\\..\\unix/mixed/')).to.equal('/unix/mixed/')
  expect(normalize('.//windows\\unix/mixed/')).to.equal('windows/unix/mixed/')
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

it('relative', () => {
  // POSIX
  expect(relative('/data/orandea/test/aaa', '/data/orandea/impl/bbb')).to.equal('../../impl/bbb')

  // Windows
  expect(relative('C:\\orandea\\test\\aaa', 'C:\\orandea\\impl\\bbb')).to.equal('../../impl/bbb')
})

it('resolve', () => {
  // POSIX
  // expect(resolve('/foo/bar', './baz')).to.equal('/foo/bar/baz') // WIN32
  expect(resolve('/foo/bar', '/tmp/file/')).to.equal('/tmp/file')
  expect(resolve('wwwroot', 'static_files/png/', '../gif/image.gif')).to.equal(`${process.cwd()}/wwwroot/static_files/gif/image.gif`)

  // Windows
  // expect(resolve('C:\\foo\\bar', '.\\baz')).to.equal('C:/foo/bar/baz')
  // expect(resolve('\\foo\\bar', '.\\baz')).to.equal('/foo/bar/baz') // WIN32
  // expect(resolve('\\foo\\bar', '\\tmp\\file\\')).to.equal('/tmp/file')
  expect(resolve('wwwroot', 'static_files\\png\\', '..\\gif\\image.gif')).to.equal(`${process.cwd()}/wwwroot/static_files/gif/image.gif`)
  // expect(resolve('C:\\Windows\\path\\only', '../../reports')).to.equal('C:/Windows/reports')
  // expect(resolve('C:\\Windows\\long\\path\\mixed/with/unix', '../..', '..\\../reports')).to.equal('C:/Windows/long/reports')
})

it('toNamespacedPath', () => {
  // POSIX
  expect(toNamespacedPath('/foo/bar')).to.equal('/foo/bar')

  // Windows
  // expect(toNamespacedPath('\\foo\\bar')).to.equal('/foo/bar')
  // expect(toNamespacedPath('C:\\foo\\bar')).to.equal('C:/foo/bar')
})
