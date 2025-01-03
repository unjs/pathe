import { describe, expect, it, vi } from "vitest";

import {
  basename,
  dirname,
  extname,
  format,
  parse,
  relative,
  delimiter,
  isAbsolute,
  join,
  normalize,
  resolve,
  sep as separator,
  toNamespacedPath,
  normalizeString,
  matchesGlob,
} from "../src";

import { normalizeWindowsPath } from "../src/_internal";

runTest("normalizeWindowsPath", normalizeWindowsPath, {
  // POSIX
  "/foo/bar": "/foo/bar",

  // Windows
  "c:\\foo\\bar": "C:/foo/bar",
  "\\foo\\bar": "/foo/bar",
  ".\\foo\\bar": "./foo/bar",
});

runTest("isAbsolute", isAbsolute, {
  // POSIX
  "/foo/bar": true,
  "/baz/..": true,
  "quax/": false,
  ".": false,

  // Windows
  "C:": false,
  "C:.": false,
  "C:/": true,
  "C:.\\temp\\": false,
  "//server": true,
  "\\\\server": true,
  "C:/foo/..": true,
  "bar\\baz": false,
  "bar/baz": false,
});

runTest("normalizeString", normalizeString, {
  // POSIX
  "/foo/bar": "foo/bar",
  "/foo/bar/.././baz": "foo/baz",
  "/foo/bar/../.well-known/baz": "foo/.well-known/baz",
  "/foo/bar/../..well-known/baz": "foo/..well-known/baz",
  "/a/../": "",
  "/a/./": "a",
  "./foobar/../a": "a",
  "./foo/be/bar/../ab/test": "foo/be/ab/test",
  // './foobar./../a/./': 'a',

  // Windows
  [normalizeWindowsPath(String.raw`C:\temp\..`)]: "C:",
  [normalizeWindowsPath(String.raw`C:\temp\..\.\Users`)]: "C:/Users",
  [normalizeWindowsPath(String.raw`C:\temp\..\.well-known\Users`)]:
    "C:/.well-known/Users",
  [normalizeWindowsPath(String.raw`C:\temp\..\..well-known\Users`)]:
    "C:/..well-known/Users",
  [normalizeWindowsPath("C:\\a\\..\\")]: "C:",
  [normalizeWindowsPath(String.raw`C:\temp\myfile.html`)]:
    "C:/temp/myfile.html",
  [normalizeWindowsPath(String.raw`\temp\myfile.html`)]: "temp/myfile.html",
  [normalizeWindowsPath(String.raw`.\myfile.html`)]: "myfile.html",
});

runTest("basename", basename, [
  // POSIX
  ["/temp/myfile.html", "myfile.html"],
  ["./myfile.html", "myfile.html"],
  ["./myfile.html", ".html", "myfile"],
  ["./undefined", undefined, "undefined"],

  // Trailing separators (issue https://github.com/unjs/pathe/issues/179)
  // POSIX
  ["/foo/bar/", "bar"],
  ["/foo/bar///", "bar"],
  ["./foo/bar/", "bar"],
  ["./foo/bar///", "bar"],
  // Windows
  ["C:\\foo\\bar\\", "bar"],
  ["C:\\foo\\bar\\\\\\", "bar"],
  [".\\foo\\bar\\", "bar"],
  [".\\foo\\bar\\\\\\", "bar"],

  // Empty string
  ["", ""],

  // Windows
  [String.raw`C:\temp\myfile.html`, "myfile.html"],
  [String.raw`\temp\myfile.html`, "myfile.html"],
  [String.raw`.\myfile.html`, "myfile.html"],
  [String.raw`.\myfile.html`, ".html", "myfile"],
  [String.raw`.\undefined`, undefined, "undefined"],
]);

runTest("dirname", dirname, {
  // POSIX
  "test.html": ".",
  "/temp/": "/",
  "/temp/myfile.html": "/temp",
  "./myfile.html": ".",

  // Windows
  "C:\\temp\\": "C:/",
  "C:.\\temp\\": "C:.",
  "C:.\\temp\\bar\\": "C:./temp",
  "C:\\temp\\myfile.html": "C:/temp",
  "\\temp\\myfile.html": "/temp",
  ".\\myfile.html": ".",
});

runTest("extname", extname, {
  // POSIX
  "/temp/myfile.html": ".html",
  "./myfile.html": ".html",
  "./myfile.tar.gz": ".gz",
  "./myfile.tar.gz.br": ".br",

  ".foo": "",
  "..foo": ".foo",
  "foo.123": ".123",
  "..": "",
  ".": "",
  "./": "",
  // '...': '.', // TODO: Edge case behavior of Node?

  // Windows
  "C:\\temp\\myfile.html": ".html",
  "\\temp\\myfile.html": ".html",
  ".\\myfile.html": ".html",
});

runTest("format", format, [
  // POSIX
  [
    { root: "/ignored", dir: "/home/user/dir", base: "file.txt" },
    "/home/user/dir/file.txt",
  ],
  [{ root: "/", base: "file.txt", ext: "ignored" }, "/file.txt"],
  [{ root: "/", name: "file", ext: ".txt" }, "/file.txt"],
  [{ name: "file", ext: ".txt" }, "file.txt"],

  // Windows
  [{ name: "file", base: "file.txt" }, "file.txt"],
  [{ dir: String.raw`C:\path\dir`, base: "file.txt" }, "C:/path/dir/file.txt"],
]);

runTest("join", join, [
  ["."],
  [undefined, "."],
  ["/", "/path", "/path"],
  ["/test//", "//path", "/test/path"],
  ["some/nodejs/deep", "../path", "some/nodejs/path"],
  ["./some/local/unix/", "../path", "some/local/path"],
  [String.raw`./some\current\mixed`, String.raw`..\path`, "some/current/path"],
  [
    "../some/relative/destination",
    String.raw`..\path`,
    "../some/relative/path",
  ],
  ["some/nodejs/deep", "../path", "some/nodejs/path"],
  ["/foo", "bar", "baz/asdf", "quux", "..", "/foo/bar/baz/asdf"],

  [
    String.raw`C:\foo`,
    "bar",
    String.raw`baz\asdf`,
    "quux",
    "..",
    "C:/foo/bar/baz/asdf",
  ],
  [String.raw`some/nodejs\windows`, "../path", "some/nodejs/path"],
  [String.raw`some\windows\only`, String.raw`..\path`, "some/windows/path"],
  // UNC paths
  [String.raw`\\server\share\file`, String.raw`..\path`, "//server/share/path"],
  [String.raw`\\.\c:\temp\file`, String.raw`..\path`, "//./c:/temp/path"],
  [String.raw`\\server/share/file`, "../path", "//server/share/path"],
]);

runTest("normalize", normalize, {
  // POSIX
  "": ".",
  "/": "/",
  "/a/..": "/",
  "./a/../": "./",
  "./a/..": ".",
  "./": "./",
  "./../": "../",
  "happiness/ab/../": "happiness/",
  "happiness/a./../": "happiness/",
  "./../dep/": "../dep/",
  "path//dep\\": "path/dep/",
  "/foo/bar//baz/asdf/quux/..": "/foo/bar/baz/asdf",

  // Windows
  "C:\\": "C:/",
  "C:\\temp\\..": "C:/",
  "C:\\temp\\\\foo\\bar\\..\\": "C:/temp/foo/",
  "C:////temp\\\\/\\/\\/foo/bar": "C:/temp/foo/bar",
  "c:/windows/nodejs/path": "C:/windows/nodejs/path",
  "c:/windows/../nodejs/path": "C:/nodejs/path",

  "c:\\windows\\nodejs\\path": "C:/windows/nodejs/path",
  "c:\\windows\\..\\nodejs\\path": "C:/nodejs/path",

  "/windows\\unix/mixed": "/windows/unix/mixed",
  "\\windows//unix/mixed": "/windows/unix/mixed",
  "\\windows\\..\\unix/mixed/": "/unix/mixed/",
  ".//windows\\unix/mixed/": "windows/unix/mixed/",

  // UNC
  "\\\\server\\share\\file\\..\\path": "//server/share/path",
  "\\\\.\\c:\\temp\\file\\..\\path": "//./c:/temp/path",
  "\\\\server/share/file/../path": "//server/share/path",
  "\\\\C:\\foo\\bar": "//C:/foo/bar",
  "\\\\.\\foo\\bar": "//./foo/bar",
});

it("parse", () => {
  // POSIX
  expect(parse("/home/user/dir/file.txt")).to.deep.equal({
    root: "/",
    dir: "/home/user/dir",
    base: "file.txt",
    ext: ".txt",
    name: "file",
  });
  expect(parse("./dir/file")).to.deep.equal({
    root: "",
    dir: "./dir",
    base: "file",
    ext: "",
    name: "file",
  });

  // Windows
  expect(parse(String.raw`C:\path\dir\file.txt`)).to.deep.equal({
    root: "C:/",
    dir: "C:/path/dir",
    base: "file.txt",
    ext: ".txt",
    name: "file",
  });
  expect(parse(String.raw`.\dir\file`)).to.deep.equal({
    root: "",
    dir: "./dir",
    base: "file",
    ext: "",
    name: "file",
  });
  // Windows path can have spaces
  expect(parse(String.raw`C:\pa th\dir\file.txt`)).to.deep.equal({
    root: "C:/",
    dir: "C:/pa th/dir",
    base: "file.txt",
    ext: ".txt",
    name: "file",
  });
  // Test with normalized windows path
  expect(parse("C:/path/dir/file.txt")).to.deep.equal({
    root: "C:/",
    dir: "C:/path/dir",
    base: "file.txt",
    ext: ".txt",
    name: "file",
  });
  expect(parse("C:/pa th/dir/file.txt")).to.deep.equal({
    root: "C:/",
    dir: "C:/pa th/dir",
    base: "file.txt",
    ext: ".txt",
    name: "file",
  });
});

runTest("relative", relative, [
  // POSIX
  ["/data/orandea/test/aaa", "/data/orandea/impl/bbb", "../../impl/bbb"],
  ["/", "/foo/bar", "foo/bar"],
  ["/foo", "/", ".."],
  [
    () => process.cwd(),
    "./dist/client/b-scroll.d.ts",
    "dist/client/b-scroll.d.ts",
  ],

  // Windows
  [
    String.raw`C:\orandea\test\aaa`,
    String.raw`C:\orandea\impl\bbb`,
    "../../impl/bbb",
  ],
  [
    String.raw`C:\orandea\test\aaa`,
    String.raw`c:\orandea\impl\bbb`,
    "../../impl/bbb",
  ],
  ["C:\\", String.raw`C:\foo\bar`, "foo/bar"],
  [String.raw`C:\foo`, "C:\\", ".."],
  [String.raw`C:\foo`, String.raw`d:\bar`, "D:/bar"],
  [
    () => process.cwd().replace(/\\/g, "/"),
    "./dist/client/b-scroll.d.ts",
    "dist/client/b-scroll.d.ts",
  ],
  [
    () => process.cwd(),
    "./dist/client/b-scroll.d.ts",
    "dist/client/b-scroll.d.ts",
  ],
]);

runTest("resolve", resolve, [
  // POSIX
  ["/", "/path", "/path"],
  ["/", "", undefined, null, "", "/path", "/path"],
  ["/foo/bar", "./baz", "/foo/bar/baz"],
  ["/foo/bar", "./baz", undefined, null, "", "/foo/bar/baz"],
  ["/foo/bar", "..", ".", "./baz", "/foo/baz"],
  ["/foo/bar", "/tmp/file/", "/tmp/file"],
  [
    "wwwroot",
    "static_files/png/",
    "../gif/image.gif",
    () =>
      `${process.cwd().replace(/\\/g, "/")}/wwwroot/static_files/gif/image.gif`,
  ],

  // Windows
  [String.raw`C:\foo\bar`, String.raw`.\baz`, "C:/foo/bar/baz"],
  [String.raw`\foo\bar`, String.raw`.\baz`, "/foo/bar/baz"],
  [String.raw`\foo\bar`, "..", ".", String.raw`.\baz`, "/foo/baz"],
  [String.raw`\foo\bar`, "\\tmp\\file\\", "/tmp/file"],
  [String.raw`\foo\bar`, undefined, null, "", "\\tmp\\file\\", "/tmp/file"],
  [
    String.raw`\foo\bar`,
    undefined,
    null,
    "",
    "\\tmp\\file\\",
    undefined,
    null,
    "",
    "/tmp/file",
  ],
  [
    "wwwroot",
    "static_files\\png\\",
    String.raw`..\gif\image.gif`,
    () =>
      `${process.cwd().replace(/\\/g, "/")}/wwwroot/static_files/gif/image.gif`,
  ],
  [String.raw`C:\Windows\path\only`, "../../reports", "C:/Windows/reports"],
  [
    String.raw`C:\Windows\long\path\mixed/with/unix`,
    "../..",
    String.raw`..\../reports`,
    "C:/Windows/long/reports",
  ],
]);

describe("resolve with catastrophic process.cwd() failure", () => {
  it("still works", () => {
    const originalCwd = process.cwd;
    process.cwd = () => "";
    expect(resolve(".", "./")).to.equal(".");
    expect(resolve("..", "..")).to.equal("../..");
    process.cwd = originalCwd;
  });
});

runTest("toNamespacedPath", toNamespacedPath, {
  // POSIX
  "/foo/bar": "/foo/bar",

  // Windows
  "\\foo\\bar": "/foo/bar",
  "C:\\foo\\bar": "C:/foo/bar",
});

describe("constants", () => {
  it("delimiter", () => {
    expect(delimiter).to.equal(
      globalThis.process?.platform === "win32" ? ";" : ":",
    );
  });

  it("sep should equal /", () => {
    expect(separator).to.equal("/");
  });
});

runTest("matchesGlob", matchesGlob, [
  ["/foo/bar", "/foo/**", true],
  [String.raw`\foo\bar`, "/foo/**", true],
  ["/foo/bar", "/{bar,foo}/**", true],
]);

function _s(item) {
  return (JSON.stringify(_r(item)) || "undefined").replace(/"/g, "'");
}

function _r(item) {
  return typeof item === "function" ? item() : item;
}

export function runTest(name, function_, items) {
  if (!Array.isArray(items)) {
    items = Object.entries(items).map((e) => e.flat());
  }
  describe(`${name}`, () => {
    let cwd;
    for (const item of items) {
      const expected = item.pop();
      const arguments_ = item;
      it(`${name}(${arguments_.map((i) => _s(i)).join(",")}) should be ${_s(
        expected,
      )}`, () => {
        expect(function_(...arguments_.map((i) => _r(i)))).to.equal(
          _r(expected),
        );
      });
      it(`${name}(${arguments_.map((i) => _s(i)).join(",")}) should be ${_s(
        expected,
      )} on Windows`, () => {
        cwd = process.cwd;
        process.cwd = vi.fn(() => String.raw`C:\Windows\path\only`);
        expect(function_(...arguments_.map((i) => _r(i)))).to.equal(
          _r(expected),
        );
        process.cwd = cwd;
      });
    }
  });
}
