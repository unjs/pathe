import { expect } from 'chai'

import { basename, delimiter, dirname, extname, format, isAbsolute, join, normalize, normalizeWindowsPath, parse, relative, resolve, sep, toNamespacedPath } from '../src'

describe('normalizeWindowsPath', () => {
  it('handles no input', () => {
    expect(normalizeWindowsPath()).to.equal('')
  })
  it('should not change posix paths', () => {
    expect(normalizeWindowsPath('/foo/bar')).to.equal('/foo/bar')
  })
  it('should normalise windows paths', () => {
    expect(normalizeWindowsPath('c:\\foo\\bar')).to.equal('c:/foo/bar')
    expect(normalizeWindowsPath('\\foo\\bar')).to.equal('/foo/bar')
    expect(normalizeWindowsPath('.\\foo\\bar')).to.equal('./foo/bar')
  })
})

describe('isAbsolute', () => {
  it('should recognise absolute posix paths', () => {
    expect(isAbsolute('/foo/bar')).to.be.true
    expect(isAbsolute('/baz/..')).to.be.true
    expect(isAbsolute('qux/')).to.be.false
    expect(isAbsolute('.')).to.be.false
  })
  it('should recognise absolute windows paths', () => {
    expect(isAbsolute('//server')).to.be.true
    expect(isAbsolute('\\\\server')).to.be.true
    expect(isAbsolute('C:/foo/..')).to.be.true
    expect(isAbsolute('C:\\foo\\..')).to.be.true
    expect(isAbsolute('bar\\baz')).to.be.false
    expect(isAbsolute('bar/baz')).to.be.false
    expect(isAbsolute('.')).to.be.false
  })
})

describe('basename', () => {
  it('should return correct base names on windows', () => {
    expect(basename('C:\\temp\\myfile.html')).to.equal('myfile.html')
    expect(basename('\\temp\\myfile.html')).to.equal('myfile.html')
    expect(basename('.\\myfile.html')).to.equal('myfile.html')
  })
  it('should return correct base names on posix', () => {
    expect(basename('/temp/myfile.html')).to.equal('myfile.html')
    expect(basename('./myfile.html')).to.equal('myfile.html')
  })
})

describe('delimiter', () => {
  it('should equal :', () => {
    expect(delimiter).to.equal(':')
  })
})
describe('sep', () => {
  it('should equal /', () => {
    expect(sep).to.equal('/')
  })
})
describe('dirname', () => {
  it('should return correct directory on windows', () => {
    expect(dirname('C:\\temp\\myfile.html')).to.equal('C:/temp')
    expect(dirname('\\temp\\myfile.html')).to.equal('/temp')
    expect(dirname('.\\myfile.html')).to.equal('.')
  })
  it('should return correct directory on posix', () => {
    expect(dirname('/temp/myfile.html')).to.equal('/temp')
    expect(dirname('./myfile.html')).to.equal('.')
  })
})
describe('extname', () => {
  it('should return correct extensions on windows', () => {
    expect(extname('C:\\temp\\myfile.html')).to.equal('.html')
    expect(extname('\\temp\\myfile.html')).to.equal('.html')
    expect(extname('.\\myfile.html')).to.equal('.html')
  })
  it('should return correct extensions on posix', () => {
    expect(extname('/temp/myfile.html')).to.equal('.html')
    expect(extname('./myfile.html')).to.equal('.html')
  })
})
describe('format', () => {
  it('should format directory on windows', () => {
    expect(format({
      dir: 'C:\\path\\dir',
      base: 'file.txt'
    })).to.equal('C:/path/dir/file.txt')
  })
  it('should format directory on posix', () => {
    expect(format({
      root: '/ignored',
      dir: '/home/user/dir',
      base: 'file.txt'
    })).to.equal('/home/user/dir/file.txt')
    expect(format({
      root: '/',
      base: 'file.txt',
      ext: 'ignored'
    })).to.equal('/file.txt')
    expect(format({
      root: '/',
      name: 'file',
      ext: '.txt'
    })).to.equal('/file.txt')
  })
})
describe('join', () => {
  it('should join path segments on windows', () => {
    expect(join('C:\\foo', 'bar', 'baz\\asdf', 'quux', '..')).to.equal('C:/foo/bar/baz/asdf')
  })
  it('should join path segments on posix', () => {
    expect(join('/foo', 'bar', 'baz/asdf', 'quux', '..')).to.equal('/foo/bar/baz/asdf')
  })
})
describe('normalize', () => {
  it('should normalise paths on windows', () => {
    expect(normalize('C:\\temp\\\\foo\\bar\\..\\')).to.equal('C:/temp/foo/')
    expect(normalize('C:////temp\\\\/\\/\\/foo/bar')).to.equal('C:/temp/foo/bar')
  })
  it('should normalise paths on posix', () => {
    expect(normalize('/foo/bar//baz/asdf/quux/..')).to.equal('/foo/bar/baz/asdf')
  })
})
describe('parse', () => {
  it('should parse paths on windows', () => {
    expect(parse('C:\\path\\dir\\file.txt')).to.deep.equal({
      root: 'C:/',
      dir: 'C:/path/dir',
      base: 'file.txt',
      ext: '.txt',
      name: 'file'
    })
  })
  it('should parse paths on posix', () => {
    expect(parse('/home/user/dir/file.txt')).to.deep.equal({
      root: '/',
      dir: '/home/user/dir',
      base: 'file.txt',
      ext: '.txt',
      name: 'file'
    })
  })
})
describe('relative', () => {
  it('should calculate relative paths on windows', () => {
    expect(relative('C:\\orandea\\test\\aaa', 'C:\\orandea\\impl\\bbb')).to.equal('../../impl/bbb')
  })
  it('should calculate relative paths on posix', () => {
    expect(relative('/data/orandea/test/aaa', '/data/orandea/impl/bbb')).to.equal('../../impl/bbb')
  })
})
describe('resolve', () => {
  it('should resolve paths on windows', () => {
    expect(resolve('C:\\foo\\bar', '.\\baz')).to.equal('C:/foo/bar/baz')
    expect(resolve('\\foo\\bar', '.\\baz')).to.equal('/foo/bar/baz')

    expect(resolve('\\foo\\bar', '\\tmp\\file\\')).to.equal('/tmp/file')
    expect(resolve('wwwroot', 'static_files\\png\\', '..\\gif\\image.gif')).to.equal(`${process.cwd()}/wwwroot/static_files/gif/image.gif`)
  })
  it('should resolve paths on posix', () => {
    expect(resolve('/foo/bar', './baz')).to.equal('/foo/bar/baz')
    expect(resolve('/foo/bar', '/tmp/file/')).to.equal('/tmp/file')

    expect(resolve('wwwroot', 'static_files/png/', '../gif/image.gif')).to.equal(`${process.cwd()}/wwwroot/static_files/gif/image.gif`)
  })
})
describe('toNamespacedPath', () => {
  it('does not change windows paths', () => {
    expect(toNamespacedPath('\\foo\\bar')).to.equal('/foo/bar')
    expect(toNamespacedPath('C:\\foo\\bar')).to.equal('C:/foo/bar')
  })
  it('does not change posix paths', () => {
    expect(toNamespacedPath('/foo/bar')).to.equal('/foo/bar')
  })
})
