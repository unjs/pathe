// Behavioral test suite vendored from zeptomatch's `test/index.js`:
//  - https://github.com/fabiospampinato/zeptomatch/blob/master/test/index.js
//
// Adapted to run against the ported `matchGlob` implementation. The `partial`
// and `memoization` blocks are skipped as those features are not used by pathe.
//
// The MIT License (MIT)
// Copyright (c) 2023-present Fabio Spampinato
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
import { describe as vDescribe, it as vIt, expect } from "vitest";

import { matchGlob } from "../src/_glob";

// The vendored suite exercises features (e.g. `partial`) not ported to
// `matchGlob`; accept and ignore an optional options arg so those (skipped)
// cases still type-check.
const isMatch = (
  glob: string | string[],
  path: string,
  _options?: { partial?: boolean },
): boolean => matchGlob(glob, path);

const compile = (_glob?: string | string[], _options?: { partial?: boolean }): unknown => {
  throw new Error("compile() is not ported");
};

type Assert = {
  true: (v: unknown) => void;
  false: (v: unknown) => void;
  is: (a: unknown, b: unknown) => void;
  not: (a: unknown, b: unknown) => void;
};

type Register = ((label: string, body: (t: Assert) => void) => void) & {
  skip: (label: string, body: (t: Assert) => void) => void;
};

const describe = (name: string, fn: (it: Register) => void): void => {
  vDescribe(name, () => {
    const register = (label: string, body: (t: Assert) => void) => {
      if (/partial|memoization/.test(label)) {
        vIt.skip(label, () => {});
        return;
      }
      vIt(label, () => {
        body({
          true: (v) => expect(v).toBe(true),
          false: (v) => expect(v).toBe(false),
          is: (a, b) => expect(a).toBe(b),
          not: (a, b) => expect(a).not.toBe(b),
        });
      });
    };
    register.skip = (label: string, _body: (t: Assert) => void) => vIt.skip(label, () => {});
    fn(register);
  });
};

describe("Zeptomatch", (it) => {
  // Native tests

  it("native", (t) => {
    t.true(isMatch([], ""));
    t.true(!isMatch([], "a"));

    t.true(isMatch(["*.md", "*.js"], "foo.md"));
    t.true(isMatch(["*.md", "*.js"], "foo.js"));
    t.true(!isMatch(["*.md", "*.js"], "foo.txt"));

    t.true(!isMatch("*/**foo", "foo/bar/foo"));
    t.true(isMatch("*/**foo", "foo/barfoo"));

    t.true(!isMatch("*/**foo", "foo\\bar\\foo"));
    t.true(isMatch("*/**foo", "foo\\barfoo"));

    t.true(!isMatch("*.js", "abcd"));
    t.true(isMatch("*.js", "a.js"));
    t.true(!isMatch("*.js", "a.md"));
    t.true(!isMatch("*.js", "a/b.js"));

    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aaa"));
    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aab"));
    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aba"));
    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "abb"));
    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "baa"));
    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bab"));
    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bba"));
    t.true(isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bbb"));
    t.true(!isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "a"));
    t.true(!isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "b"));
    t.true(!isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "aa"));
    t.true(!isMatch("{a{a{a,b},b{a,b}},b{a{a,b},b{a,b}}}", "bb"));
  });

  it("native_grammar_full", (t) => {
    // Escaped
    t.true(isMatch("\\n", "\n"));
    t.true(isMatch("\\(", "("));
    // Escape
    t.true(isMatch("(", "("));
    // Slash
    t.true(isMatch("/", "/"));
    t.true(isMatch("/", "\\"));
    t.true(isMatch("\\", "/"));
    t.true(isMatch("\\", "\\"));
    // Passthrough
    t.true(isMatch("abc", "abc"));

    // Negation
    t.true(isMatch("!foo", "bar"));
    t.false(isMatch("!foo", "foo"));
    t.true(isMatch("!!foo", "foo"));
    t.false(isMatch("!!!foo", "foo"));

    // StarStar
    t.true(isMatch("**", "foo/bar"));

    // Star
    t.true(isMatch("*", "abc"));
    t.true(isMatch("*.js", "abc.js"));

    // Question
    t.true(isMatch("?", "a"));
    t.false(isMatch("?", ""));
    t.false(isMatch("?", "/"));
    t.false(isMatch("?", "\\"));

    // Class
    t.true(isMatch("[a-z]", "a"));
    t.true(isMatch("[A-Z]", "A"));
    t.true(isMatch("[a-zA-Z]", "a"));
    t.true(isMatch("[a-zA-Z]", "A"));
    t.true(isMatch("[0-9]", "0"));
    t.true(isMatch("[a-z][0-9]", "a0"));
    t.true(isMatch("[^a-z][^0-9]", "0a"));
    t.false(isMatch("[a-z]", "A"));
    t.false(isMatch("[A-Z]", "a"));

    // Range
    t.true(isMatch("{1..9}", "1"));
    t.true(isMatch("{a..z}", "a"));
    t.true(isMatch("{A..Z}", "A"));
    t.true(isMatch("{A..Z}{1..9}", "A1"));
    t.true(isMatch("{1..9}{A..Z}", "1A"));
    t.false(isMatch("{a..z}", "A"));
    t.false(isMatch("{A..Z}", "a"));

    // Braces
    t.true(isMatch("{foo,bar}", "foo"));
    t.true(isMatch("{foo,bar}", "bar"));
    t.true(isMatch("{}", ""));
    t.true(isMatch("{,}", ""));
    t.true(isMatch("{,foo}", ""));
    t.true(isMatch("{,foo}", "foo"));
    t.false(isMatch("{foo,bar}", ""));
    t.false(isMatch("{foo,bar}", "foobar"));
    t.true(isMatch("{foo/bar,baz/qux}", "foo/bar"));
    t.true(isMatch("{foo/bar,baz/qux}", "baz/qux"));
    t.false(isMatch("{foo/bar,baz/qux}", "foo/qux"));
    t.false(isMatch("{foo/bar,baz/qux}", "baz/bar"));
  });

  it("native_grammar_partial", (t) => {
    // Escaped
    t.false(isMatch("\\n\\n", "\n", { partial: true }));
    t.false(isMatch("\\(\\(", "(", { partial: true }));
    // Escape
    t.false(isMatch("((", "(", { partial: true }));
    // Slash
    t.true(isMatch("//", "/", { partial: true }));
    t.true(isMatch("//", "\\", { partial: true }));
    // Passthrough
    t.false(isMatch("abc", "", { partial: true }));
    t.false(isMatch("abc", "a", { partial: true }));
    t.false(isMatch("abc", "ab", { partial: true }));
    t.true(isMatch("abc", "abc", { partial: true }));

    // Negation
    t.true(isMatch("!foo/bar", "bar", { partial: true }));
    t.false(isMatch("!foo", "foo", { partial: true }));
    t.true(isMatch("!!foo", "foo", { partial: true }));
    t.false(isMatch("!!!foo", "foo", { partial: true }));

    // StarStar
    t.true(isMatch("**", "", { partial: true }));
    t.true(isMatch("**", "foo", { partial: true }));
    t.true(isMatch("**", "foo/", { partial: true }));
    t.true(isMatch("**", "foo/bar", { partial: true }));
    t.true(isMatch("**", "foo/bar/", { partial: true }));

    // Star
    t.true(isMatch("*", "", { partial: true }));
    t.true(isMatch("*", "abc", { partial: true }));
    t.true(isMatch("*.js", "abc.js", { partial: true }));
    t.false(isMatch("*.js", "abc", { partial: true }));

    // Question
    t.false(isMatch("a?b", "a", { partial: true }));
    t.false(isMatch("a?b", "ab", { partial: true }));
    t.true(isMatch("a?b", "abb", { partial: true }));
    t.false(isMatch("a?b", "abc", { partial: true }));

    // Class
    t.false(isMatch("[a-z][a-z]", "a", { partial: true }));
    t.false(isMatch("[A-Z][A-Z]", "A", { partial: true }));
    t.false(isMatch("[a-zA-Z][a-zA-Z]", "a", { partial: true }));
    t.false(isMatch("[a-zA-Z][a-zA-Z]", "A", { partial: true }));
    t.false(isMatch("[0-9][0-9]", "0", { partial: true }));
    t.false(isMatch("[a-z][0-9][a-z][0-9]", "a0", { partial: true }));
    t.false(isMatch("[^a-z][^0-9][^a-z][^0-9]", "0a", { partial: true }));

    // Range
    t.false(isMatch("{1..9}{1..9}", "1", { partial: true }));
    t.false(isMatch("{a..z}{a..z}", "a", { partial: true }));
    t.false(isMatch("{A..Z}{A..Z}", "A", { partial: true }));
    t.false(isMatch("{A..Z}{1..9}{A..Z}{1..9}", "A1", { partial: true }));
    t.false(isMatch("{1..9}{A..Z}{1..9}{A..Z}", "1A", { partial: true }));

    // Braces
    t.false(isMatch("{foo,bar}baz", "foo", { partial: true }));
    t.false(isMatch("{foo,bar}baz", "bar", { partial: true }));
    t.false(isMatch("{foo,bar}baz", "f", { partial: true }));
    t.false(isMatch("{foo,bar}baz", "b", { partial: true }));

    t.true(isMatch("{foo/bar,baz/qux}", "foo", { partial: true }));
    t.true(isMatch("{foo/bar,baz/qux}", "foo/", { partial: true }));
    t.true(isMatch("{foo/bar,baz/qux}", "baz", { partial: true }));
    t.true(isMatch("{foo/bar,baz/qux}", "baz/", { partial: true }));
    t.false(isMatch("{foo/bar,baz/qux}", "foo/qux", { partial: true }));
    t.false(isMatch("{foo/bar,baz/qux}", "baz/bar", { partial: true }));
  });

  it("native_memoization", (t) => {
    const glob = "foo";
    const re1 = compile(glob);
    const re2 = compile(glob);
    const re3 = compile(glob, { partial: true });
    const re4 = compile(glob, { partial: true });
    t.is(re1, re2);
    t.is(re3, re4);
    t.not(re1, re3);

    const globs = ["foo", "bar"];
    const re5 = compile(globs);
    const re6 = compile(globs);
    const re7 = compile(globs, { partial: true });
    const re8 = compile(globs, { partial: true });
    t.is(re5, re6);
    t.is(re7, re8);
    t.not(re5, re8);
  });

  it("native_partial_0", (t) => {
    const glob = "/*/b/x/y/z";

    t.true(isMatch(glob, "/a/b", { partial: true }));
    t.false(isMatch(glob, "/a/b"));
    t.false(isMatch(glob, "/a/b/c", { partial: true }));
  });

  it("native_partial_1", (t) => {
    const glob = "foo/**/{bar/baz,qux}/*.js";

    // Partial

    t.false(isMatch(glob, "", { partial: true }));
    t.true(isMatch(glob, "foo", { partial: true }));
    t.true(isMatch(glob, "foo/", { partial: true }));

    t.true(isMatch(glob, "foo/bar", { partial: true }));
    t.true(isMatch(glob, "foo/bar/", { partial: true }));
    t.true(isMatch(glob, "foo/qux", { partial: true }));
    t.true(isMatch(glob, "foo/qux/", { partial: true }));

    t.true(isMatch(glob, "foo/bar_", { partial: true }));
    t.true(isMatch(glob, "foo/bar_", { partial: true }));
    t.true(isMatch(glob, "foo/bar/_", { partial: true }));
    t.true(isMatch(glob, "foo/qux_", { partial: true }));
    t.true(isMatch(glob, "foo/qux/_", { partial: true }));

    // Full

    t.false(isMatch(glob, ""));
    t.false(isMatch(glob, "foo"));
    t.false(isMatch(glob, "foo/"));

    t.false(isMatch(glob, "foo/bar"));
    t.false(isMatch(glob, "foo/bar/"));
    t.false(isMatch(glob, "foo/qux"));
    t.false(isMatch(glob, "foo/qux/"));

    t.false(isMatch(glob, "foo/bar_"));
    t.false(isMatch(glob, "foo/bar/_"));
    t.false(isMatch(glob, "foo/qux_"));
    t.false(isMatch(glob, "foo/qux/_"));
  });

  it("native_partial_2", (t) => {
    const glob = "foo/*/{bar/baz,qux}/*.js";

    // Partial

    t.false(isMatch(glob, "", { partial: true }));
    t.true(isMatch(glob, "foo", { partial: true }));
    t.true(isMatch(glob, "foo/", { partial: true }));

    t.true(isMatch(glob, "foo/bar", { partial: true }));
    t.true(isMatch(glob, "foo/bar/", { partial: true }));
    t.true(isMatch(glob, "foo/qux", { partial: true }));
    t.true(isMatch(glob, "foo/qux/", { partial: true }));

    t.true(isMatch(glob, "foo/bar_", { partial: true }));
    t.true(isMatch(glob, "foo/bar_", { partial: true }));
    t.false(isMatch(glob, "foo/bar/_", { partial: true }));
    t.true(isMatch(glob, "foo/qux_", { partial: true }));
    t.false(isMatch(glob, "foo/qux/_", { partial: true }));

    // Full

    t.false(isMatch(glob, ""));
    t.false(isMatch(glob, "foo"));
    t.false(isMatch(glob, "foo/"));

    t.false(isMatch(glob, "foo/bar"));
    t.false(isMatch(glob, "foo/bar/"));
    t.false(isMatch(glob, "foo/qux"));
    t.false(isMatch(glob, "foo/qux/"));

    t.false(isMatch(glob, "foo/bar_"));
    t.false(isMatch(glob, "foo/bar/_"));
    t.false(isMatch(glob, "foo/qux_"));
    t.false(isMatch(glob, "foo/qux/_"));
  });

  it("native_partial_3", (t) => {
    const glob = "foo/{bar/baz,qux}/*.js";

    // Partial

    t.false(isMatch(glob, "", { partial: true }));
    t.true(isMatch(glob, "foo", { partial: true }));
    t.true(isMatch(glob, "foo/", { partial: true }));

    t.true(isMatch(glob, "foo/bar", { partial: true }));
    t.true(isMatch(glob, "foo/bar/", { partial: true }));
    t.true(isMatch(glob, "foo/qux", { partial: true }));
    t.true(isMatch(glob, "foo/qux/", { partial: true }));

    t.false(isMatch(glob, "foo/bar_", { partial: true }));
    t.false(isMatch(glob, "foo/bar_", { partial: true }));
    t.false(isMatch(glob, "foo/bar/_", { partial: true }));
    t.false(isMatch(glob, "foo/bar/baz/_", { partial: true }));
    t.false(isMatch(glob, "foo/qux_", { partial: true }));
    t.false(isMatch(glob, "foo/qux/_", { partial: true }));

    // Full

    t.false(isMatch(glob, ""));
    t.false(isMatch(glob, "foo"));
    t.false(isMatch(glob, "foo/"));

    t.false(isMatch(glob, "foo/bar"));
    t.false(isMatch(glob, "foo/bar/"));
    t.false(isMatch(glob, "foo/qux"));
    t.false(isMatch(glob, "foo/qux/"));

    t.false(isMatch(glob, "foo/bar_"));
    t.false(isMatch(glob, "foo/bar/_"));
    t.false(isMatch(glob, "foo/qux_"));
    t.false(isMatch(glob, "foo/qux/_"));
  });

  it("native_range", (t) => {
    // Numeric

    t.true(isMatch("{1..20}", "1"));
    t.true(isMatch("{1..20}", "10"));
    t.true(isMatch("{1..20}", "20"));

    t.true(isMatch("{20..1}", "1"));
    t.true(isMatch("{20..1}", "10"));
    t.true(isMatch("{20..1}", "20"));

    t.true(!isMatch("{1..20}", "0"));
    t.true(!isMatch("{1..20}", "22"));

    t.true(!isMatch("{20..1}", "0"));
    t.true(!isMatch("{20..1}", "22"));

    // Numeric padded

    t.true(isMatch("{01..20}", "01"));
    t.true(isMatch("{01..20}", "10"));
    t.true(isMatch("{01..20}", "20"));

    t.true(isMatch("{20..01}", "01"));
    t.true(isMatch("{20..01}", "10"));
    t.true(isMatch("{20..01}", "20"));

    t.true(!isMatch("{01..20}", "00"));
    t.true(!isMatch("{01..20}", "1"));
    t.true(!isMatch("{01..20}", "22"));

    t.true(!isMatch("{20..01}", "00"));
    t.true(!isMatch("{20..01}", "1"));
    t.true(!isMatch("{20..01}", "22"));

    // Alphabetic

    t.true(isMatch("{a..zz}", "a"));
    t.true(isMatch("{a..zz}", "bb"));
    t.true(isMatch("{a..zz}", "za"));

    t.true(isMatch("{zz..a}", "a"));
    t.true(isMatch("{zz..a}", "bb"));
    t.true(isMatch("{zz..a}", "za"));

    t.true(!isMatch("{a..zz}", "aaa"));
    t.true(!isMatch("{a..zz}", "A"));

    t.true(!isMatch("{zz..a}", "aaa"));
    t.true(!isMatch("{zz..a}", "A"));

    // Alphabetic uppercase

    t.true(isMatch("{A..ZZ}", "A"));
    t.true(isMatch("{A..ZZ}", "BB"));
    t.true(isMatch("{A..ZZ}", "ZA"));

    t.true(isMatch("{ZZ..A}", "A"));
    t.true(isMatch("{ZZ..A}", "BB"));
    t.true(isMatch("{ZZ..A}", "ZA"));

    t.true(!isMatch("{A..ZZ}", "AAA"));
    t.true(!isMatch("{A..ZZ}", "a"));

    t.true(!isMatch("{ZZ..A}", "AAA"));
    t.true(!isMatch("{ZZ..A}", "a"));
  });

  it("native_slashes_normalization", (t) => {
    t.true(isMatch("foo/*.json", "foo\\bar.json"));
    t.true(isMatch("foo/*.json", "foo/bar.json"));
  });

  it("native_trailing slash", (t) => {
    t.true(isMatch("foo", "foo"));
    t.true(isMatch("foo", "foo/"));

    t.false(isMatch("foo/", "foo"));
    t.true(isMatch("foo/", "foo/"));
    t.true(isMatch("foo/", "foo//"));
  });

  // Tests adapted from "picomatch": https://github.com/micromatch/picomatch
  // License: https://github.com/micromatch/picomatch/blob/master/LICENSE

  it("multiple_patterns", (t) => {
    t.true(isMatch([".", "foo"], "."));
    t.true(isMatch(["a", "foo"], "a"));
    t.true(isMatch(["*", "foo", "bar"], "ab"));
    t.true(isMatch(["*b", "foo", "bar"], "ab"));
    t.true(!isMatch(["./*", "foo", "bar"], "ab"));
    t.true(isMatch(["a*", "foo", "bar"], "ab"));
    t.true(isMatch(["ab", "foo"], "ab"));

    t.true(!isMatch(["/a", "foo"], "/ab"));
    t.true(!isMatch(["?/?", "foo", "bar"], "/ab"));
    t.true(!isMatch(["a/*", "foo", "bar"], "/ab"));
    t.true(!isMatch(["a/b", "foo"], "a/b/c"));
    t.true(!isMatch(["*/*", "foo", "bar"], "ab"));
    t.true(!isMatch(["/a", "foo", "bar"], "ab"));
    t.true(!isMatch(["a", "foo"], "ab"));
    t.true(!isMatch(["b", "foo"], "ab"));
    t.true(!isMatch(["c", "foo", "bar"], "ab"));
    t.true(!isMatch(["ab", "foo"], "abcd"));
    t.true(!isMatch(["bc", "foo"], "abcd"));
    t.true(!isMatch(["c", "foo"], "abcd"));
    t.true(!isMatch(["cd", "foo"], "abcd"));
    t.true(!isMatch(["d", "foo"], "abcd"));
    t.true(!isMatch(["f", "foo", "bar"], "abcd"));
    t.true(!isMatch(["/*", "foo", "bar"], "ef"));
  });

  it("file_extensions", (t) => {
    t.true(isMatch("*.md", ".c.md"));
    t.true(!isMatch(".c.", ".c.md"));
    t.true(!isMatch(".md", ".c.md"));
    t.true(isMatch("*.md", ".md"));
    t.true(!isMatch(".m", ".md"));
    t.true(!isMatch("*.md", "a/b/c.md"));
    t.true(!isMatch(".md", "a/b/c.md"));
    t.true(!isMatch("a/*.md", "a/b/c.md"));
    t.true(!isMatch("*.md", "a/b/c/c.md"));
    t.true(!isMatch("c.js", "a/b/c/c.md"));
    t.true(isMatch(".*.md", ".c.md"));
    t.true(isMatch(".md", ".md"));
    t.true(isMatch("a/**/*.*", "a/b/c.js"));
    t.true(isMatch("**/*.md", "a/b/c.md"));
    t.true(isMatch("a/*/*.md", "a/b/c.md"));
    t.true(isMatch("*.md", "c.md"));
  });

  it("dot_files", (t) => {
    t.true(!isMatch(".*.md", "a/b/c/.xyz.md"));
    t.true(isMatch("*.md", ".c.md"));
    t.true(isMatch(".*", ".c.md"));
    t.true(isMatch("**/*.md", "a/b/c/.xyz.md"));
    t.true(isMatch("**/.*.md", "a/b/c/.xyz.md"));
    t.true(isMatch("a/b/c/*.md", "a/b/c/.xyz.md"));
    t.true(isMatch("a/b/c/.*.md", "a/b/c/.xyz.md"));
  });

  it("matching", (t) => {
    t.true(isMatch("a+b/src/*.js", "a+b/src/glimini.js"));
    t.true(isMatch("+b/src/*.js", "+b/src/glimini.js"));
    t.true(isMatch("coffee+/src/*.js", "coffee+/src/glimini.js"));
    t.true(isMatch("coffee+/src/*", "coffee+/src/glimini.js"));

    t.true(isMatch(".", "."));
    t.true(isMatch("/a", "/a"));
    t.true(!isMatch("/a", "/ab"));
    t.true(isMatch("a", "a"));
    t.true(!isMatch("/a", "ab"));
    t.true(!isMatch("a", "ab"));
    t.true(isMatch("ab", "ab"));
    t.true(!isMatch("cd", "abcd"));
    t.true(!isMatch("bc", "abcd"));
    t.true(!isMatch("ab", "abcd"));

    t.true(isMatch("a.b", "a.b"));
    t.true(isMatch("*.b", "a.b"));
    t.true(isMatch("a.*", "a.b"));
    t.true(isMatch("*.*", "a.b"));
    t.true(isMatch("a*.c*", "a-b.c-d"));
    t.true(isMatch("*b.*d", "a-b.c-d"));
    t.true(isMatch("*.*", "a-b.c-d"));
    t.true(isMatch("*.*-*", "a-b.c-d"));
    t.true(isMatch("*-*.*-*", "a-b.c-d"));
    t.true(isMatch("*.c-*", "a-b.c-d"));
    t.true(isMatch("*.*-d", "a-b.c-d"));
    t.true(isMatch("a-*.*-d", "a-b.c-d"));
    t.true(isMatch("*-b.c-*", "a-b.c-d"));
    t.true(isMatch("*-b*c-*", "a-b.c-d"));
    t.true(!isMatch("*-bc-*", "a-b.c-d"));

    t.true(!isMatch("./*/", "/ab"));
    t.true(!isMatch("*", "/ef"));
    t.true(!isMatch("./*/", "ab"));
    t.true(!isMatch("/*", "ef"));
    t.true(isMatch("/*", "/ab"));
    t.true(isMatch("/*", "/cd"));
    t.true(isMatch("*", "ab"));
    t.true(!isMatch("./*", "ab"));
    t.true(isMatch("ab", "ab"));
    t.true(!isMatch("./*/", "ab/"));

    t.true(!isMatch("*.js", "a/b/c/z.js"));
    t.true(!isMatch("*.js", "a/b/z.js"));
    t.true(!isMatch("*.js", "a/z.js"));
    t.true(isMatch("*.js", "z.js"));

    t.true(isMatch("z*.js", "z.js"));
    t.true(isMatch("a/z*.js", "a/z.js"));
    t.true(isMatch("*/z*.js", "a/z.js"));

    t.true(isMatch("**/*.js", "a/b/c/z.js"));
    t.true(isMatch("**/*.js", "a/b/z.js"));
    t.true(isMatch("**/*.js", "a/z.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/c/d/e/z.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/c/d/z.js"));
    t.true(isMatch("a/b/c/**/*.js", "a/b/c/z.js"));
    t.true(isMatch("a/b/c**/*.js", "a/b/c/z.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/c/z.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/z.js"));

    t.true(!isMatch("a/b/**/*.js", "a/z.js"));
    t.true(!isMatch("a/b/**/*.js", "z.js"));

    t.true(isMatch("z*", "z.js"));
    t.true(isMatch("**/z*", "z.js"));
    t.true(isMatch("**/z*.js", "z.js"));
    t.true(isMatch("**/*.js", "z.js"));
    t.true(isMatch("**/foo", "foo"));

    t.true(!isMatch("z*.js", "zzjs"));
    t.true(!isMatch("*z.js", "zzjs"));

    t.true(!isMatch("a/b/**/f", "a/b/c/d/"));
    t.true(isMatch("a/**", "a"));
    t.true(isMatch("**", "a"));
    t.true(isMatch("**", "a/"));
    t.true(isMatch("a/b-*/**/z.js", "a/b-c/d/e/z.js"));
    t.true(isMatch("a/b-*/**/z.js", "a/b-c/z.js"));
    t.true(isMatch("**", "a/b/c/d"));
    t.true(isMatch("**", "a/b/c/d/"));
    t.true(isMatch("**/**", "a/b/c/d/"));
    t.true(isMatch("**/b/**", "a/b/c/d/"));
    t.true(isMatch("a/b/**", "a/b/c/d/"));
    t.true(isMatch("a/b/**/", "a/b/c/d/"));
    t.true(isMatch("a/b/**/c/**/", "a/b/c/d/"));
    t.true(isMatch("a/b/**/c/**/d/", "a/b/c/d/"));
    t.true(isMatch("a/b/**/**/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/c/**/d/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/d/**/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/e.f"));
    t.true(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/g/e.f"));

    t.true(!isMatch("*/foo", "bar/baz/foo"));
    t.true(!isMatch("**/bar/*", "deep/foo/bar"));
    t.true(!isMatch("*/bar/**", "deep/foo/bar/baz/x"));
    t.true(!isMatch("foo?bar", "foo/bar"));
    t.true(!isMatch("**/bar*", "foo/bar/baz"));
    t.true(!isMatch("**/bar**", "foo/bar/baz"));
    t.true(!isMatch("foo**bar", "foo/baz/bar"));
    t.true(!isMatch("foo*bar", "foo/baz/bar"));
    t.true(!isMatch("**/bar/*/", "deep/foo/bar/baz"));
    t.true(isMatch("**/bar/*", "deep/foo/bar/baz/"));
    t.true(isMatch("**/bar/*", "deep/foo/bar/baz"));
    t.true(isMatch("foo/**", "foo"));
    t.true(isMatch("**/bar/*{,/}", "deep/foo/bar/baz/"));
    t.true(isMatch("a/**/j/**/z/*.md", "a/b/j/c/z/x.md"));
    t.true(isMatch("a/**/j/**/z/*.md", "a/j/z/x.md"));
    t.true(isMatch("**/foo", "bar/baz/foo"));
    t.true(isMatch("**/bar/**", "deep/foo/bar/"));
    t.true(isMatch("**/bar/*", "deep/foo/bar/baz"));
    t.true(isMatch("**/bar/*/", "deep/foo/bar/baz/"));
    t.true(isMatch("**/bar/**", "deep/foo/bar/baz/"));
    t.true(isMatch("**/bar/*/*", "deep/foo/bar/baz/x"));
    t.true(isMatch("foo/**/**/bar", "foo/b/a/z/bar"));
    t.true(isMatch("foo/**/bar", "foo/b/a/z/bar"));
    t.true(isMatch("foo/**/**/bar", "foo/bar"));
    t.true(isMatch("foo/**/bar", "foo/bar"));
    t.true(isMatch("foo[/]bar", "foo/bar"));
    t.true(isMatch("*/bar/**", "foo/bar/baz/x"));
    t.true(isMatch("foo/**/**/bar", "foo/baz/bar"));
    t.true(isMatch("foo/**/bar", "foo/baz/bar"));
    t.true(isMatch("foo**bar", "foobazbar"));
    t.true(isMatch("**/foo", "XXX/foo"));

    t.true(isMatch("foo//baz.md", "foo//baz.md"));
    t.true(isMatch("foo//*baz.md", "foo//baz.md"));
    t.true(isMatch("foo{/,//}baz.md", "foo//baz.md"));
    t.true(isMatch("foo{/,//}baz.md", "foo/baz.md"));
    t.true(!isMatch("foo/+baz.md", "foo//baz.md"));
    t.true(!isMatch("foo//+baz.md", "foo//baz.md"));
    t.true(!isMatch("foo/baz.md", "foo//baz.md"));
    t.true(!isMatch("foo//baz.md", "foo/baz.md"));

    t.true(!isMatch("aaa?bbb", "aaa/bbb"));

    t.true(isMatch("*.md", ".c.md"));
    t.true(!isMatch("*.md", "a/.c.md"));
    t.true(isMatch("a/.c.md", "a/.c.md"));
    t.true(!isMatch("*.md", ".a"));
    t.true(!isMatch("*.md", ".verb.txt"));
    t.true(isMatch("a/b/c/.*.md", "a/b/c/.xyz.md"));
    t.true(isMatch(".md", ".md"));
    t.true(!isMatch(".md", ".txt"));
    t.true(isMatch(".md", ".md"));
    t.true(isMatch(".a", ".a"));
    t.true(isMatch(".b*", ".b"));
    t.true(isMatch(".a*", ".ab"));
    t.true(isMatch(".*", ".ab"));
    t.true(isMatch("*.*", ".ab"));
    t.true(!isMatch("a/b/c/*.md", ".md"));
    t.true(!isMatch("a/b/c/*.md", ".a.md"));
    t.true(isMatch("a/b/c/*.md", "a/b/c/d.a.md"));
    t.true(!isMatch("a/b/c/*.md", "a/b/d/.md"));

    t.true(isMatch("*.md", ".c.md"));
    t.true(isMatch(".*", ".c.md"));
    t.true(isMatch("a/b/c/*.md", "a/b/c/.xyz.md"));
    t.true(isMatch("a/b/c/.*.md", "a/b/c/.xyz.md"));
  });

  it("brackets", (t) => {
    t.true(isMatch("foo[/]bar", "foo/bar"));
    t.true(isMatch("foo[/]bar[/]", "foo/bar/"));
    t.true(isMatch("foo[/]bar[/]baz", "foo/bar/baz"));
  });

  it("ranges", (t) => {
    t.true(isMatch("a/{a..c}", "a/c"));
    t.true(!isMatch("a/{a..c}", "a/z"));
    t.true(isMatch("a/{1..100}", "a/99"));
    t.true(!isMatch("a/{1..100}", "a/101"));
    t.true(isMatch("a/{01..10}", "a/02"));
    t.true(!isMatch("a/{01..10}", "a/2"));
  });

  it("exploits", (t) => {
    t.true(!isMatch(`${"\\".repeat(65500)}A`, "\\A")); // This matches in picomatch, but why though?
    t.true(isMatch(`!${"\\".repeat(65500)}A`, "A"));
    t.true(isMatch(`!(${"\\".repeat(65500)}A)`, "A"));
    t.true(!isMatch(`[!(${"\\".repeat(65500)}A`, "A"));
  });

  it("wildmat", (t) => {
    t.true(!isMatch("*f", "foo"));
    t.true(!isMatch("??", "foo"));
    t.true(!isMatch("bar", "foo"));
    t.true(!isMatch("foo\\*bar", "foobar"));
    t.true(isMatch("\\??\\?b", "?a?b"));
    t.true(isMatch("*ab", "aaaaaaabababab"));
    t.true(isMatch("*", "foo"));
    t.true(isMatch("*foo*", "foo"));
    t.true(isMatch("???", "foo"));
    t.true(isMatch("f*", "foo"));
    t.true(isMatch("foo", "foo"));
    t.true(isMatch("*ob*a*r*", "foobar"));

    t.true(
      !isMatch(
        "-*-*-*-*-*-*-12-*-*-*-m-*-*-*",
        "-adobe-courier-bold-o-normal--12-120-75-75-/-70-iso8859-1",
      ),
    );
    t.true(
      !isMatch(
        "-*-*-*-*-*-*-12-*-*-*-m-*-*-*",
        "-adobe-courier-bold-o-normal--12-120-75-75-X-70-iso8859-1",
      ),
    );
    t.true(!isMatch("*X*i", "ab/cXd/efXg/hi"));
    t.true(!isMatch("*Xg*i", "ab/cXd/efXg/hi"));
    t.true(!isMatch("**/*a*b*g*n*t", "abcd/abcdefg/abcdefghijk/abcdefghijklmnop.txtz"));
    t.true(!isMatch("*/*/*", "foo"));
    t.true(!isMatch("fo", "foo"));
    t.true(!isMatch("*/*/*", "foo/bar"));
    t.true(!isMatch("foo?bar", "foo/bar"));
    t.true(!isMatch("*/*/*", "foo/bb/aa/rr"));
    t.true(!isMatch("foo*", "foo/bba/arr"));
    t.true(!isMatch("foo**", "foo/bba/arr"));
    t.true(!isMatch("foo/*", "foo/bba/arr"));
    t.true(!isMatch("foo/**arr", "foo/bba/arr"));
    t.true(!isMatch("foo/**z", "foo/bba/arr"));
    t.true(!isMatch("foo/*arr", "foo/bba/arr"));
    t.true(!isMatch("foo/*z", "foo/bba/arr"));
    t.true(
      !isMatch(
        "XXX/*/*/*/*/*/*/12/*/*/*/m/*/*/*",
        "XXX/adobe/courier/bold/o/normal//12/120/75/75/X/70/iso8859/1",
      ),
    );
    t.true(
      isMatch(
        "-*-*-*-*-*-*-12-*-*-*-m-*-*-*",
        "-adobe-courier-bold-o-normal--12-120-75-75-m-70-iso8859-1",
      ),
    );
    t.true(isMatch("**/*X*/**/*i", "ab/cXd/efXg/hi"));
    t.true(isMatch("*/*X*/*/*i", "ab/cXd/efXg/hi"));
    t.true(isMatch("**/*a*b*g*n*t", "abcd/abcdefg/abcdefghijk/abcdefghijklmnop.txt"));
    t.true(isMatch("*X*i", "abcXdefXghi"));
    t.true(isMatch("foo", "foo"));
    t.true(isMatch("foo/*", "foo/bar"));
    t.true(isMatch("foo/bar", "foo/bar"));
    t.true(isMatch("foo[/]bar", "foo/bar"));
    t.true(isMatch("**/**/**", "foo/bb/aa/rr"));
    t.true(isMatch("*/*/*", "foo/bba/arr"));
    t.true(isMatch("foo/**", "foo/bba/arr"));
  });

  it.skip("posix_classes", (t) => {
    t.true(isMatch("[[:xdigit:]]", "e"));

    t.true(isMatch("[[:alpha:]123]", "a"));
    t.true(isMatch("[[:alpha:]123]", "1"));
    t.true(!isMatch("[[:alpha:]123]", "5"));
    t.true(isMatch("[[:alpha:]123]", "A"));

    t.true(isMatch("[[:alpha:]]", "A"));
    t.true(!isMatch("[[:alpha:]]", "9"));
    t.true(isMatch("[[:alpha:]]", "b"));

    t.true(!isMatch("[![:alpha:]]", "A"));
    t.true(isMatch("[![:alpha:]]", "9"));
    t.true(!isMatch("[![:alpha:]]", "b"));

    t.true(!isMatch("[^[:alpha:]]", "A"));
    t.true(isMatch("[^[:alpha:]]", "9"));
    t.true(!isMatch("[^[:alpha:]]", "b"));

    t.true(!isMatch("[[:digit:]]", "A"));
    t.true(isMatch("[[:digit:]]", "9"));
    t.true(!isMatch("[[:digit:]]", "b"));

    t.true(isMatch("[^[:digit:]]", "A"));
    t.true(!isMatch("[^[:digit:]]", "9"));
    t.true(isMatch("[^[:digit:]]", "b"));

    t.true(isMatch("[![:digit:]]", "A"));
    t.true(!isMatch("[![:digit:]]", "9"));
    t.true(isMatch("[![:digit:]]", "b"));

    t.true(isMatch("[[:lower:]]", "a"));
    t.true(!isMatch("[[:lower:]]", "A"));
    t.true(!isMatch("[[:lower:]]", "9"));

    t.true(isMatch("[:alpha:]", "a"));
    t.true(isMatch("[:alpha:]", "l"));
    t.true(isMatch("[:alpha:]", "p"));
    t.true(isMatch("[:alpha:]", "h"));
    t.true(isMatch("[:alpha:]", ":"));
    t.true(!isMatch("[:alpha:]", "b"));

    t.true(isMatch("[[:lower:][:digit:]]", "9"));
    t.true(isMatch("[[:lower:][:digit:]]", "a"));
    t.true(!isMatch("[[:lower:][:digit:]]", "A"));
    t.true(!isMatch("[[:lower:][:digit:]]", "aa"));
    t.true(!isMatch("[[:lower:][:digit:]]", "99"));
    t.true(!isMatch("[[:lower:][:digit:]]", "a9"));
    t.true(!isMatch("[[:lower:][:digit:]]", "9a"));
    t.true(!isMatch("[[:lower:][:digit:]]", "aA"));
    t.true(!isMatch("[[:lower:][:digit:]]", "9A"));
    t.true(isMatch("[[:lower:][:digit:]]+", "aa"));
    t.true(isMatch("[[:lower:][:digit:]]+", "99"));
    t.true(isMatch("[[:lower:][:digit:]]+", "a9"));
    t.true(isMatch("[[:lower:][:digit:]]+", "9a"));
    t.true(!isMatch("[[:lower:][:digit:]]+", "aA"));
    t.true(!isMatch("[[:lower:][:digit:]]+", "9A"));
    t.true(isMatch("[[:lower:][:digit:]]*", "a"));
    t.true(!isMatch("[[:lower:][:digit:]]*", "A"));
    t.true(!isMatch("[[:lower:][:digit:]]*", "AA"));
    t.true(isMatch("[[:lower:][:digit:]]*", "aa"));
    t.true(isMatch("[[:lower:][:digit:]]*", "aaa"));
    t.true(isMatch("[[:lower:][:digit:]]*", "999"));

    t.true(!isMatch("a[[:word:]]+c", "a c"));
    t.true(!isMatch("a[[:word:]]+c", "a.c"));
    t.true(!isMatch("a[[:word:]]+c", "a.xy.zc"));
    t.true(!isMatch("a[[:word:]]+c", "a.zc"));
    t.true(!isMatch("a[[:word:]]+c", "abq"));
    t.true(!isMatch("a[[:word:]]+c", "axy zc"));
    t.true(!isMatch("a[[:word:]]+c", "axy"));
    t.true(!isMatch("a[[:word:]]+c", "axy.zc"));
    t.true(isMatch("a[[:word:]]+c", "a123c"));
    t.true(isMatch("a[[:word:]]+c", "a1c"));
    t.true(isMatch("a[[:word:]]+c", "abbbbc"));
    t.true(isMatch("a[[:word:]]+c", "abbbc"));
    t.true(isMatch("a[[:word:]]+c", "abbc"));
    t.true(isMatch("a[[:word:]]+c", "abc"));

    t.true(!isMatch("a[[:word:]]+", "a c"));
    t.true(!isMatch("a[[:word:]]+", "a.c"));
    t.true(!isMatch("a[[:word:]]+", "a.xy.zc"));
    t.true(!isMatch("a[[:word:]]+", "a.zc"));
    t.true(!isMatch("a[[:word:]]+", "axy zc"));
    t.true(!isMatch("a[[:word:]]+", "axy.zc"));
    t.true(isMatch("a[[:word:]]+", "a123c"));
    t.true(isMatch("a[[:word:]]+", "a1c"));
    t.true(isMatch("a[[:word:]]+", "abbbbc"));
    t.true(isMatch("a[[:word:]]+", "abbbc"));
    t.true(isMatch("a[[:word:]]+", "abbc"));
    t.true(isMatch("a[[:word:]]+", "abc"));
    t.true(isMatch("a[[:word:]]+", "abq"));
    t.true(isMatch("a[[:word:]]+", "axy"));
    t.true(isMatch("a[[:word:]]+", "axyzc"));
    t.true(isMatch("a[[:word:]]+", "axyzc"));

    t.true(isMatch("[[:lower:]]", "a"));
    t.true(isMatch("[[:upper:]]", "A"));
    t.true(isMatch("[[:digit:][:upper:][:space:]]", "A"));
    t.true(isMatch("[[:digit:][:upper:][:space:]]", "1"));
    t.true(isMatch("[[:digit:][:upper:][:space:]]", " "));
    t.true(isMatch("[[:xdigit:]]", "5"));
    t.true(isMatch("[[:xdigit:]]", "f"));
    t.true(isMatch("[[:xdigit:]]", "D"));
    t.true(
      isMatch(
        "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]",
        "_",
      ),
    );
    t.true(
      isMatch(
        "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:graph:][:lower:][:print:][:punct:][:space:][:upper:][:xdigit:]]",
        "_",
      ),
    );
    t.true(
      isMatch(
        "[^[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]",
        ".",
      ),
    );
    t.true(isMatch("[a-c[:digit:]x-z]", "5"));
    t.true(isMatch("[a-c[:digit:]x-z]", "b"));
    t.true(isMatch("[a-c[:digit:]x-z]", "y"));

    t.true(!isMatch("[[:lower:]]", "A"));
    t.true(isMatch("[![:lower:]]", "A"));
    t.true(!isMatch("[[:upper:]]", "a"));
    t.true(!isMatch("[[:digit:][:upper:][:space:]]", "a"));
    t.true(!isMatch("[[:digit:][:upper:][:space:]]", "."));
    t.true(
      !isMatch(
        "[[:alnum:][:alpha:][:blank:][:cntrl:][:digit:][:lower:][:space:][:upper:][:xdigit:]]",
        ".",
      ),
    );
    t.true(!isMatch("[a-c[:digit:]x-z]", "q"));

    t.true(isMatch("a [b]", "a [b]"));
    t.true(isMatch("a [b]", "a b"));

    t.true(isMatch("a [b] c", "a [b] c"));
    t.true(isMatch("a [b] c", "a b c"));

    t.true(isMatch("a \\[b\\]", "a [b]"));
    t.true(!isMatch("a \\[b\\]", "a b"));

    t.true(isMatch("a ([b])", "a [b]"));
    t.true(isMatch("a ([b])", "a b"));

    t.true(isMatch("a (\\[b\\]|[b])", "a b"));
    t.true(isMatch("a (\\[b\\]|[b])", "a [b]"));

    t.true(isMatch("[[:xdigit:]]", "e"));
    t.true(isMatch("[[:xdigit:]]", "1"));
    t.true(isMatch("[[:alpha:]123]", "a"));
    t.true(isMatch("[[:alpha:]123]", "1"));

    t.true(isMatch("[![:alpha:]]", "9"));
    t.true(isMatch("[^[:alpha:]]", "9"));

    t.true(isMatch("[[:word:]]", "A"));
    t.true(isMatch("[[:word:]]", "B"));
    t.true(isMatch("[[:word:]]", "a"));
    t.true(isMatch("[[:word:]]", "b"));

    t.true(isMatch("[[:word:]]", "1"));
    t.true(isMatch("[[:word:]]", "2"));

    t.true(isMatch("[[:digit:]]", "1"));
    t.true(isMatch("[[:digit:]]", "2"));

    t.true(!isMatch("[[:digit:]]", "a"));
    t.true(!isMatch("[[:digit:]]", "A"));

    t.true(isMatch("[[:upper:]]", "A"));
    t.true(isMatch("[[:upper:]]", "B"));

    t.true(!isMatch("[[:upper:]]", "a"));
    t.true(!isMatch("[[:upper:]]", "b"));

    t.true(!isMatch("[[:upper:]]", "1"));
    t.true(!isMatch("[[:upper:]]", "2"));

    t.true(isMatch("[[:lower:]]", "a"));
    t.true(isMatch("[[:lower:]]", "b"));

    t.true(!isMatch("[[:lower:]]", "A"));
    t.true(!isMatch("[[:lower:]]", "B"));

    t.true(isMatch("[[:lower:]][[:upper:]]", "aA"));
    t.true(!isMatch("[[:lower:]][[:upper:]]", "AA"));
    t.true(!isMatch("[[:lower:]][[:upper:]]", "Aa"));

    t.true(isMatch("[[:xdigit:]]*", "ababab"));
    t.true(isMatch("[[:xdigit:]]*", "020202"));
    t.true(isMatch("[[:xdigit:]]*", "900"));

    t.true(isMatch("[[:punct:]]", "!"));
    t.true(isMatch("[[:punct:]]", "?"));
    t.true(isMatch("[[:punct:]]", "#"));
    t.true(isMatch("[[:punct:]]", "&"));
    t.true(isMatch("[[:punct:]]", "@"));
    t.true(isMatch("[[:punct:]]", "+"));
    t.true(isMatch("[[:punct:]]", "*"));
    t.true(isMatch("[[:punct:]]", ":"));
    t.true(isMatch("[[:punct:]]", "="));
    t.true(isMatch("[[:punct:]]", "|"));
    t.true(isMatch("[[:punct:]]*", "|++"));

    t.true(!isMatch("[[:punct:]]", "?*+"));

    t.true(isMatch("[[:punct:]]*", "?*+"));
    t.true(isMatch("foo[[:punct:]]*", "foo"));
    t.true(isMatch("foo[[:punct:]]*", "foo?*+"));

    t.true(isMatch("[:al:]", "a"));
    t.true(isMatch("[[:al:]", "a"));
    t.true(isMatch("[abc[:punct:][0-9]", "!"));

    t.true(isMatch("[_[:alpha:]]*", "PATH"));

    t.true(isMatch("[_[:alpha:]][_[:alnum:]]*", "PATH"));

    t.true(isMatch("[[:alpha:]][[:digit:]][[:upper:]]", "a1B"));
    t.true(!isMatch("[[:alpha:]][[:digit:]][[:upper:]]", "a1b"));
    t.true(isMatch("[[:digit:][:punct:][:space:]]", "."));
    t.true(!isMatch("[[:digit:][:punct:][:space:]]", "a"));
    t.true(isMatch("[[:digit:][:punct:][:space:]]", "!"));
    t.true(!isMatch("[[:digit:]][[:punct:]][[:space:]]", "!"));
    t.true(isMatch("[[:digit:]][[:punct:]][[:space:]]", "1! "));
    t.true(!isMatch("[[:digit:]][[:punct:]][[:space:]]", "1!  "));

    t.true(isMatch("[[:digit:]]", "9"));
    t.true(!isMatch("[[:digit:]]", "X"));
    t.true(isMatch("[[:lower:]][[:upper:]]", "aB"));
    t.true(isMatch("[[:alpha:][:digit:]]", "a"));
    t.true(isMatch("[[:alpha:][:digit:]]", "3"));
    t.true(!isMatch("[[:alpha:][:digit:]]", "aa"));
    t.true(!isMatch("[[:alpha:][:digit:]]", "a3"));
    t.true(!isMatch("[[:alpha:]\\]", "a"));
    t.true(!isMatch("[[:alpha:]\\]", "b"));

    t.true(isMatch("[[:blank:]]", "\t"));
    t.true(isMatch("[[:space:]]", "\t"));
    t.true(isMatch("[[:space:]]", " "));

    t.true(!isMatch("[[:ascii:]]", "\\377"));
    t.true(!isMatch("[1[:alpha:]123]", "9"));

    t.true(!isMatch("[[:punct:]]", " "));

    t.true(isMatch("[[:graph:]]", "A"));
    t.true(!isMatch("[[:graph:]]", "\\b"));
    t.true(!isMatch("[[:graph:]]", "\\n"));
    t.true(!isMatch("[[:graph:]]", "\\s"));
  });

  it.skip("extglobs", (t) => {
    t.true(isMatch("c!(.)z", "cbz"));
    t.true(!isMatch("c!(*)z", "cbz"));
    t.true(isMatch("c!(b*)z", "cccz"));
    t.true(isMatch("c!(+)z", "cbz"));
    t.true(!isMatch("c!(?)z", "cbz")); // This matches in picomatch, but why though?
    t.true(isMatch("c!(@)z", "cbz"));

    t.true(!isMatch("c!(?:foo)?z", "c/z"));
    t.true(isMatch("c!(?:foo)?z", "c!fooz"));
    t.true(isMatch("c!(?:foo)?z", "c!z"));

    // t.true ( !isMatch ( '!(abc)', 'abc' ) );
    // t.true ( !isMatch ( '!(a)', 'a' ) );
    // t.true ( isMatch ( '!(a)', 'aa' ) );
    // t.true ( isMatch ( '!(a)', 'b' ) );

    t.true(isMatch("a!(b)c", "aac"));
    t.true(!isMatch("a!(b)c", "abc"));
    t.true(isMatch("a!(b)c", "acc"));
    t.true(isMatch("a!(z)", "abz"));
    t.true(!isMatch("a!(z)", "az"));

    t.true(!isMatch("a!(.)", "a."));
    t.true(!isMatch("!(.)a", ".a"));
    t.true(!isMatch("a!(.)c", "a.c"));
    t.true(isMatch("a!(.)c", "abc"));

    t.true(!isMatch("/!(*.d).ts", "/file.d.ts"));
    t.true(isMatch("/!(*.d).ts", "/file.ts"));
    t.true(isMatch("/!(*.d).ts", "/file.something.ts"));
    // t.true ( isMatch ( '/!(*.d).ts', '/file.d.something.ts' ) );
    // t.true ( isMatch ( '/!(*.d).ts', '/file.dhello.ts' ) );

    // t.true ( !isMatch ( '**/!(*.d).ts', '/file.d.ts' ) );
    // t.true ( isMatch ( '**/!(*.d).ts', '/file.ts' ) );
    // t.true ( isMatch ( '**/!(*.d).ts', '/file.something.ts' ) );
    // t.true ( isMatch ( '**/!(*.d).ts', '/file.d.something.ts' ) );
    // t.true ( isMatch ( '**/!(*.d).ts', '/file.dhello.ts' ) );

    // t.true ( !isMatch ( '/!(*.d).{ts,tsx}', '/file.d.ts' ) );
    // t.true ( isMatch ( '/!(*.d).{ts,tsx}', '/file.ts' ) );
    // t.true ( isMatch ( '/!(*.d).{ts,tsx}', '/file.something.ts' ) );
    // t.true ( isMatch ( '/!(*.d).{ts,tsx}', '/file.d.something.ts' ) );
    // t.true ( isMatch ( '/!(*.d).{ts,tsx}', '/file.dhello.ts' ) );

    // t.true ( !isMatch ( '/!(*.d).@(ts)', '/file.d.ts' ) );
    // t.true ( isMatch ( '/!(*.d).@(ts)', '/file.ts' ) );
    // t.true ( isMatch ( '/!(*.d).@(ts)', '/file.something.ts' ) );
    // t.true ( isMatch ( '/!(*.d).@(ts)', '/file.d.something.ts' ) );
    // t.true ( isMatch ( '/!(*.d).@(ts)', '/file.dhello.ts' ) );

    t.true(!isMatch("foo/!(abc)", "foo/abc"));
    t.true(isMatch("foo/!(abc)", "foo/bar"));

    t.true(!isMatch("a/!(z)", "a/z"));
    t.true(isMatch("a/!(z)", "a/b"));

    t.true(!isMatch("c/!(z)/v", "c/z/v"));
    t.true(isMatch("c/!(z)/v", "c/a/v"));

    t.true(isMatch("!(b/a)", "a/a"));
    t.true(!isMatch("!(b/a)", "b/a"));

    // t.true ( !isMatch ( '!(!(foo))*', 'foo/bar' ) );
    t.true(isMatch("!(b/a)", "a/a"));
    t.true(!isMatch("!(b/a)", "b/a"));

    // t.true ( isMatch ( '(!(b/a))', 'a/a' ) );
    // t.true ( isMatch ( '!((b/a))', 'a/a' ) );
    // t.true ( !isMatch ( '!((b/a))', 'b/a' ) );

    t.true(!isMatch("(!(?:b/a))", "a/a"));
    t.true(!isMatch("!((?:b/a))", "b/a"));

    // t.true ( isMatch ( '!(b/(a))', 'a/a' ) );
    // t.true ( !isMatch ( '!(b/(a))', 'b/a' ) );

    t.true(isMatch("!(b/a)", "a/a"));
    t.true(!isMatch("!(b/a)", "b/a"));

    // t.true ( !isMatch ( 'c!(z)', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(z)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(.)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(*)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(+)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(?)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(@)z', 'c/z' ) );

    // t.true ( !isMatch ( 'a!(z)', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(.)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(/)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(/z)z', 'c/z' ) );
    // t.true ( !isMatch ( 'c!(/z)z', 'c/b' ) );
    // t.true ( isMatch ( 'c!(/z)z', 'c/b/z' ) );

    // t.true ( isMatch ( '!!(abc)', 'abc' ) );
    // t.true ( !isMatch ( '!!!(abc)', 'abc' ) );
    // t.true ( isMatch ( '!!!!(abc)', 'abc' ) );
    // t.true ( !isMatch ( '!!!!!(abc)', 'abc' ) );
    // t.true ( isMatch ( '!!!!!!(abc)', 'abc' ) );
    // t.true ( !isMatch ( '!!!!!!!(abc)', 'abc' ) );
    // t.true ( isMatch ( '!!!!!!!!(abc)', 'abc' ) );

    // t.true ( isMatch ( '!(!(abc))', 'abc' ) );
    // t.true ( !isMatch ( '!(!(!(abc)))', 'abc' ) );
    // t.true ( isMatch ( '!(!(!(!(abc))))', 'abc' ) );
    // t.true ( !isMatch ( '!(!(!(!(!(abc)))))', 'abc' ) );
    // t.true ( isMatch ( '!(!(!(!(!(!(abc))))))', 'abc' ) );
    // t.true ( !isMatch ( '!(!(!(!(!(!(!(abc)))))))', 'abc' ) );
    // t.true ( isMatch ( '!(!(!(!(!(!(!(!(abc))))))))', 'abc' ) );

    // t.true ( isMatch ( 'foo/!(!(abc))', 'foo/abc' ) );
    // t.true ( !isMatch ( 'foo/!(!(!(abc)))', 'foo/abc' ) );
    // t.true ( isMatch ( 'foo/!(!(!(!(abc))))', 'foo/abc' ) );
    // t.true ( !isMatch ( 'foo/!(!(!(!(!(abc)))))', 'foo/abc' ) );
    // t.true ( isMatch ( 'foo/!(!(!(!(!(!(abc))))))', 'foo/abc' ) );
    // t.true ( !isMatch ( 'foo/!(!(!(!(!(!(!(abc)))))))', 'foo/abc' ) );
    // t.true ( isMatch ( 'foo/!(!(!(!(!(!(!(!(abc))))))))', 'foo/abc' ) );

    t.true(!isMatch("!(moo).!(cow)", "moo.cow"));
    t.true(!isMatch("!(moo).!(cow)", "foo.cow"));
    t.true(!isMatch("!(moo).!(cow)", "moo.bar"));
    t.true(isMatch("!(moo).!(cow)", "foo.bar"));

    // t.true ( !isMatch ( '@(!(a) )*', 'a   ' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'a   b' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'a  b' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'a  ' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'a ' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'a' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'aa' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'b' ) );
    // t.true ( !isMatch ( '@(!(a) )*', 'bb' ) );
    // t.true ( isMatch ( '@(!(a) )*', ' a ' ) );
    // t.true ( isMatch ( '@(!(a) )*', 'b  ' ) );
    // t.true ( isMatch ( '@(!(a) )*', 'b ' ) );

    t.true(!isMatch("a*!(z)", "c/z"));
    t.true(isMatch("a*!(z)", "abz"));
    t.true(isMatch("a*!(z)", "az"));

    t.true(!isMatch("!(a*)", "a"));
    t.true(!isMatch("!(a*)", "aa"));
    t.true(!isMatch("!(a*)", "ab"));
    t.true(isMatch("!(a*)", "b"));

    t.true(!isMatch("!(*a*)", "a"));
    t.true(!isMatch("!(*a*)", "aa"));
    t.true(!isMatch("!(*a*)", "ab"));
    t.true(!isMatch("!(*a*)", "ac"));
    t.true(isMatch("!(*a*)", "b"));

    // t.true ( !isMatch ( '!(*a)', 'a' ) );
    // t.true ( !isMatch ( '!(*a)', 'aa' ) );
    // t.true ( !isMatch ( '!(*a)', 'bba' ) );
    // t.true ( isMatch ( '!(*a)', 'ab' ) );
    // t.true ( isMatch ( '!(*a)', 'ac' ) );
    // t.true ( isMatch ( '!(*a)', 'b' ) );

    t.true(!isMatch("!(*a)*", "a"));
    t.true(!isMatch("!(*a)*", "aa"));
    t.true(!isMatch("!(*a)*", "bba"));
    t.true(!isMatch("!(*a)*", "ab"));
    t.true(!isMatch("!(*a)*", "ac"));
    t.true(isMatch("!(*a)*", "b"));

    t.true(!isMatch("!(a)*", "a"));
    t.true(!isMatch("!(a)*", "abb"));
    t.true(isMatch("!(a)*", "ba"));

    t.true(isMatch("a!(b)*", "aa"));
    t.true(!isMatch("a!(b)*", "ab"));
    t.true(!isMatch("a!(b)*", "aba"));
    t.true(isMatch("a!(b)*", "ac"));

    // t.true ( isMatch ( '!(!(moo)).!(!(cow))', 'moo.cow' ) );

    t.true(!isMatch("!(a|b)c", "ac"));
    t.true(!isMatch("!(a|b)c", "bc"));
    t.true(isMatch("!(a|b)c", "cc"));

    t.true(!isMatch("!(a|b)c.!(d|e)", "ac.d"));
    t.true(!isMatch("!(a|b)c.!(d|e)", "bc.d"));
    t.true(!isMatch("!(a|b)c.!(d|e)", "cc.d"));
    t.true(!isMatch("!(a|b)c.!(d|e)", "ac.e"));
    t.true(!isMatch("!(a|b)c.!(d|e)", "bc.e"));
    t.true(!isMatch("!(a|b)c.!(d|e)", "cc.e"));
    t.true(!isMatch("!(a|b)c.!(d|e)", "ac.f"));
    t.true(!isMatch("!(a|b)c.!(d|e)", "bc.f"));
    t.true(isMatch("!(a|b)c.!(d|e)", "cc.f"));
    t.true(isMatch("!(a|b)c.!(d|e)", "dc.g"));

    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'ac.d' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'bc.d' ) );
    // t.true ( !isMatch ( '!(a|b)c.!(d|e)', 'cc.d' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'cc.d' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'cc.d' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'ac.e' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'bc.e' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'cc.e' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'ac.f' ) );
    // t.true ( isMatch ( '!(!(a|b)c.!(d|e))', 'bc.f' ) );
    // t.true ( !isMatch ( '!(!(a|b)c.!(d|e))', 'cc.f' ) );
    // t.true ( !isMatch ( '!(!(a|b)c.!(d|e))', 'dc.g' ) );

    // t.true ( !isMatch ( '@(a|b).md', '.md' ) );
    // t.true ( !isMatch ( '@(a|b).md', 'a.js' ) );
    // t.true ( !isMatch ( '@(a|b).md', 'c.md' ) );
    // t.true ( isMatch ( '@(a|b).md', 'a.md' ) );
    // t.true ( isMatch ( '@(a|b).md', 'b.md' ) );

    t.true(!isMatch("+(a|b).md", ".md"));
    t.true(!isMatch("+(a|b).md", "a.js"));
    t.true(!isMatch("+(a|b).md", "c.md"));
    t.true(isMatch("+(a|b).md", "a.md"));
    t.true(isMatch("+(a|b).md", "aa.md"));
    t.true(isMatch("+(a|b).md", "ab.md"));
    t.true(isMatch("+(a|b).md", "b.md"));
    t.true(isMatch("+(a|b).md", "bb.md"));

    t.true(!isMatch("*(a|b).md", "a.js"));
    t.true(!isMatch("*(a|b).md", "c.md"));
    t.true(isMatch("*(a|b).md", ".md"));
    t.true(isMatch("*(a|b).md", "a.md"));
    t.true(isMatch("*(a|b).md", "aa.md"));
    t.true(isMatch("*(a|b).md", "ab.md"));
    t.true(isMatch("*(a|b).md", "b.md"));
    t.true(isMatch("*(a|b).md", "bb.md"));

    t.true(!isMatch("?(a|b).md", "a.js"));
    t.true(!isMatch("?(a|b).md", "bb.md"));
    t.true(!isMatch("?(a|b).md", "c.md"));
    t.true(isMatch("?(a|b).md", ".md"));
    t.true(isMatch("?(a|ab|b).md", "a.md"));
    t.true(isMatch("?(a|b).md", "a.md"));
    t.true(isMatch("?(a|aa|b).md", "aa.md"));
    t.true(isMatch("?(a|ab|b).md", "ab.md"));
    t.true(isMatch("?(a|ab|b).md", "b.md"));

    t.true(isMatch("+(a)?(b)", "ab"));
    t.true(isMatch("+(a)?(b)", "aab"));
    t.true(isMatch("+(a)?(b)", "aa"));
    t.true(isMatch("+(a)?(b)", "a"));

    t.true(!isMatch("a?(b*)", "ax"));
    t.true(isMatch("?(a*|b)", "ax"));

    t.true(!isMatch("a*(b*)", "ax"));
    t.true(isMatch("*(a*|b)", "ax"));

    t.true(!isMatch("a@(b*)", "ax"));
    t.true(isMatch("@(a*|b)", "ax"));

    t.true(!isMatch("a?(b*)", "ax"));
    t.true(isMatch("?(a*|b)", "ax"));

    t.true(isMatch("a!(b*)", "ax"));
    t.true(!isMatch("!(a*|b)", "ax"));

    // t.true ( isMatch ( '!(a/**)', 'a' ) );
    // t.true ( !isMatch ( '!(a/**)', 'a/' ) );
    // t.true ( !isMatch ( '!(a/**)', 'a/b' ) );
    // t.true ( !isMatch ( '!(a/**)', 'a/b/c' ) );
    // t.true ( isMatch ( '!(a/**)', 'b' ) );
    // t.true ( isMatch ( '!(a/**)', 'b/c' ) );

    t.true(isMatch("a/!(b*)", "a/a"));
    t.true(!isMatch("a/!(b*)", "a/b"));
    t.true(!isMatch("a/!(b/*)", "a/b/c"));
    t.true(!isMatch("a/!(b*)", "a/b/c"));
    t.true(isMatch("a/!(b*)", "a/c"));

    t.true(isMatch("a/!(b*)/**", "a/a/"));
    t.true(isMatch("a/!(b*)", "a/a"));
    t.true(isMatch("a/!(b*)/**", "a/a"));
    t.true(!isMatch("a/!(b*)/**", "a/b"));
    t.true(!isMatch("a/!(b*)/**", "a/b/c"));
    t.true(isMatch("a/!(b*)/**", "a/c"));
    t.true(isMatch("a/!(b*)", "a/c"));
    t.true(isMatch("a/!(b*)/**", "a/c/"));

    t.true(isMatch("a*(z)", "a"));
    t.true(isMatch("a*(z)", "az"));
    t.true(isMatch("a*(z)", "azz"));
    t.true(isMatch("a*(z)", "azzz"));
    t.true(!isMatch("a*(z)", "abz"));
    t.true(!isMatch("a*(z)", "cz"));

    t.true(!isMatch("*(b/a)", "a/a"));
    t.true(!isMatch("*(b/a)", "a/b"));
    t.true(!isMatch("*(b/a)", "a/c"));
    t.true(isMatch("*(b/a)", "b/a"));
    t.true(!isMatch("*(b/a)", "b/b"));
    t.true(!isMatch("*(b/a)", "b/c"));

    // t.true ( !isMatch ( 'a**(z)', 'cz' ) );
    // t.true ( isMatch ( 'a**(z)', 'abz' ) );
    // t.true ( isMatch ( 'a**(z)', 'az' ) );

    t.true(!isMatch("*(z)", "c/z/v"));
    t.true(isMatch("*(z)", "z"));
    t.true(!isMatch("*(z)", "zf"));
    t.true(!isMatch("*(z)", "fz"));

    t.true(!isMatch("c/*(z)/v", "c/a/v"));
    t.true(isMatch("c/*(z)/v", "c/z/v"));

    t.true(!isMatch("*.*(js).js", "a.md.js"));
    t.true(isMatch("*.*(js).js", "a.js.js"));

    t.true(!isMatch("a+(z)", "a"));
    t.true(isMatch("a+(z)", "az"));
    t.true(!isMatch("a+(z)", "cz"));
    t.true(!isMatch("a+(z)", "abz"));
    t.true(!isMatch("a+(z)", "a+z"));
    t.true(isMatch("a++(z)", "a+z"));
    t.true(!isMatch("a+(z)", "c+z"));
    t.true(!isMatch("a+(z)", "a+bz"));
    t.true(!isMatch("+(z)", "az"));
    t.true(!isMatch("+(z)", "cz"));
    t.true(!isMatch("+(z)", "abz"));
    t.true(!isMatch("+(z)", "fz"));
    t.true(isMatch("+(z)", "z"));
    t.true(isMatch("+(z)", "zz"));
    t.true(isMatch("c/+(z)/v", "c/z/v"));
    t.true(isMatch("c/+(z)/v", "c/zz/v"));
    t.true(!isMatch("c/+(z)/v", "c/a/v"));

    t.true(isMatch("a??(z)", "a?z"));
    t.true(isMatch("a??(z)", "a.z"));
    t.true(!isMatch("a??(z)", "a/z"));
    t.true(isMatch("a??(z)", "a?"));
    t.true(isMatch("a??(z)", "ab"));
    t.true(!isMatch("a??(z)", "a/"));

    t.true(!isMatch("a?(z)", "a?z"));
    t.true(!isMatch("a?(z)", "abz"));
    t.true(!isMatch("a?(z)", "z"));
    t.true(isMatch("a?(z)", "a"));
    t.true(isMatch("a?(z)", "az"));

    t.true(!isMatch("?(z)", "abz"));
    t.true(!isMatch("?(z)", "az"));
    t.true(!isMatch("?(z)", "cz"));
    t.true(!isMatch("?(z)", "fz"));
    t.true(!isMatch("?(z)", "zz"));
    t.true(isMatch("?(z)", "z"));

    t.true(!isMatch("c/?(z)/v", "c/a/v"));
    t.true(!isMatch("c/?(z)/v", "c/zz/v"));
    t.true(isMatch("c/?(z)/v", "c/z/v"));

    t.true(isMatch("c/@(z)/v", "c/z/v"));
    t.true(!isMatch("c/@(z)/v", "c/a/v"));
    t.true(isMatch("@(*.*)", "moo.cow"));

    t.true(!isMatch("a*@(z)", "cz"));
    t.true(isMatch("a*@(z)", "abz"));
    t.true(isMatch("a*@(z)", "az"));

    t.true(!isMatch("a@(z)", "cz"));
    t.true(!isMatch("a@(z)", "abz"));
    t.true(isMatch("a@(z)", "az"));

    t.true(!isMatch("(b|a).(a)", "aa.aa"));
    t.true(!isMatch("(b|a).(a)", "a.bb"));
    t.true(!isMatch("(b|a).(a)", "a.aa.a"));
    t.true(!isMatch("(b|a).(a)", "cc.a"));
    // t.true ( isMatch ( '(b|a).(a)', 'a.a' ) );
    t.true(!isMatch("(b|a).(a)", "c.a"));
    t.true(!isMatch("(b|a).(a)", "dd.aa.d"));
    // t.true ( isMatch ( '(b|a).(a)', 'b.a' ) );

    // t.true ( !isMatch ( '@(b|a).@(a)', 'aa.aa' ) );
    // t.true ( !isMatch ( '@(b|a).@(a)', 'a.bb' ) );
    // t.true ( !isMatch ( '@(b|a).@(a)', 'a.aa.a' ) );
    // t.true ( !isMatch ( '@(b|a).@(a)', 'cc.a' ) );
    // t.true ( isMatch ( '@(b|a).@(a)', 'a.a' ) );
    // t.true ( !isMatch ( '@(b|a).@(a)', 'c.a' ) );
    // t.true ( !isMatch ( '@(b|a).@(a)', 'dd.aa.d' ) );
    // t.true ( isMatch ( '@(b|a).@(a)', 'b.a' ) );

    // t.true ( !isMatch ( '*(0|1|3|5|7|9)', '' ) );

    t.true(isMatch("*(0|1|3|5|7|9)", "137577991"));
    t.true(!isMatch("*(0|1|3|5|7|9)", "2468"));

    t.true(isMatch("*.c?(c)", "file.c"));
    t.true(!isMatch("*.c?(c)", "file.C"));
    t.true(isMatch("*.c?(c)", "file.cc"));
    t.true(!isMatch("*.c?(c)", "file.ccc"));

    t.true(isMatch("!(*.c|*.h|Makefile.in|config*|README)", "parse.y"));
    t.true(!isMatch("!(*.c|*.h|Makefile.in|config*|README)", "shell.c"));
    t.true(isMatch("!(*.c|*.h|Makefile.in|config*|README)", "Makefile"));
    t.true(!isMatch("!(*.c|*.h|Makefile.in|config*|README)", "Makefile.in"));

    t.true(!isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;"));
    t.true(!isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;0"));
    t.true(isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;1"));
    t.true(isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;139"));
    t.true(!isMatch("*\\;[1-9]*([0-9])", "VMS.FILE;1N"));

    t.true(isMatch("!([*)*", "abcx"));
    t.true(isMatch("!([*)*", "abcz"));
    t.true(isMatch("!([*)*", "bbc"));

    t.true(isMatch("!([[*])*", "abcx"));
    t.true(isMatch("!([[*])*", "abcz"));
    t.true(isMatch("!([[*])*", "bbc"));

    t.true(isMatch("+(a|b\\[)*", "abcx"));
    t.true(isMatch("+(a|b\\[)*", "abcz"));
    t.true(!isMatch("+(a|b\\[)*", "bbc"));

    t.true(isMatch("+(a|b[)*", "abcx"));
    t.true(isMatch("+(a|b[)*", "abcz"));
    t.true(!isMatch("+(a|b[)*", "bbc"));

    t.true(!isMatch("[a*(]*z", "abcx"));
    t.true(isMatch("[a*(]*z", "abcz"));
    t.true(!isMatch("[a*(]*z", "bbc"));
    t.true(isMatch("[a*(]*z", "aaz"));
    t.true(isMatch("[a*(]*z", "aaaz"));

    t.true(!isMatch("[a*(]*)z", "abcx"));
    t.true(!isMatch("[a*(]*)z", "abcz"));
    t.true(!isMatch("[a*(]*)z", "bbc"));

    t.true(!isMatch("+()c", "abc"));
    t.true(!isMatch("+()x", "abc"));
    t.true(isMatch("+(*)c", "abc"));
    t.true(!isMatch("+(*)x", "abc"));
    t.true(!isMatch("no-file+(a|b)stuff", "abc"));
    t.true(!isMatch("no-file+(a*(c)|b)stuff", "abc"));

    t.true(isMatch("a+(b|c)d", "abd"));
    t.true(isMatch("a+(b|c)d", "acd"));

    t.true(!isMatch("a+(b|c)d", "abc"));

    // t.true ( isMatch ( 'a!(b|B)', 'abd' ) );
    // t.true ( isMatch ( 'a!(@(b|B))', 'acd' ) );
    // t.true ( isMatch ( 'a!(@(b|B))', 'ac' ) );
    // t.true ( !isMatch ( 'a!(@(b|B))', 'ab' ) );

    // t.true ( !isMatch ( 'a!(@(b|B))d', 'abc' ) );
    // t.true ( !isMatch ( 'a!(@(b|B))d', 'abd' ) );
    // t.true ( isMatch ( 'a!(@(b|B))d', 'acd' ) );

    t.true(isMatch("a[b*(foo|bar)]d", "abd"));
    t.true(!isMatch("a[b*(foo|bar)]d", "abc"));
    t.true(!isMatch("a[b*(foo|bar)]d", "acd"));

    // t.true ( !isMatch ( 'para+([0-9])', 'para' ) );
    // t.true ( !isMatch ( 'para?([345]|99)1', 'para381' ) );
    // t.true ( !isMatch ( 'para*([0-9])', 'paragraph' ) );
    // t.true ( !isMatch ( 'para@(chute|graph)', 'paramour' ) );
    // t.true ( isMatch ( 'para*([0-9])', 'para' ) );
    // t.true ( isMatch ( 'para!(*.[0-9])', 'para.38' ) );
    // t.true ( isMatch ( 'para!(*.[00-09])', 'para.38' ) );
    // t.true ( isMatch ( 'para!(*.[0-9])', 'para.graph' ) );
    // t.true ( isMatch ( 'para*([0-9])', 'para13829383746592' ) );
    // t.true ( isMatch ( 'para!(*.[0-9])', 'para39' ) );
    // t.true ( isMatch ( 'para+([0-9])', 'para987346523' ) );
    // t.true ( isMatch ( 'para?([345]|99)1', 'para991' ) );
    // t.true ( isMatch ( 'para!(*.[0-9])', 'paragraph' ) );
    // t.true ( isMatch ( 'para@(chute|graph)', 'paragraph' ) );

    t.true(!isMatch("*(a|b[)", "foo"));
    t.true(!isMatch("*(a|b[)", "("));
    t.true(!isMatch("*(a|b[)", ")"));
    t.true(!isMatch("*(a|b[)", "|"));
    t.true(isMatch("*(a|b)", "a"));
    t.true(isMatch("*(a|b)", "b"));
    t.true(isMatch("*(a|b\\[)", "b["));
    t.true(isMatch("+(a|b\\[)", "ab["));
    t.true(!isMatch("+(a|b\\[)", "ab[cde"));
    t.true(isMatch("+(a|b\\[)*", "ab[cde"));

    // t.true ( isMatch ( '*(a|b|f)*', 'foo' ) );
    // t.true ( isMatch ( '*(a|b|o)*', 'foo' ) );
    // t.true ( isMatch ( '*(a|b|f|o)', 'foo' ) );
    // t.true ( isMatch ( '\\*\\(a\\|b\\[\\)', '*(a|b[)' ) );
    // t.true ( !isMatch ( '*(a|b)', 'foo' ) );
    // t.true ( !isMatch ( '*(a|b\\[)', 'foo' ) );
    // t.true ( isMatch ( '*(a|b\\[)|f*', 'foo' ) );

    // t.true ( isMatch ( '@(*).@(*)', 'moo.cow' ) );
    // t.true ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.a' ) );
    // t.true ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.b' ) );
    // t.true ( !isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.c' ) );
    // t.true ( !isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.c.d' ) );
    // t.true ( !isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'c.c' ) );
    // t.true ( !isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.' ) );
    // t.true ( !isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'd.d' ) );
    // t.true ( !isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'e.e' ) );
    // t.true ( !isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'f.f' ) );
    // t.true ( isMatch ( '*.@(a|b|@(ab|a*@(b))*@(c)d)', 'a.abcd' ) );

    // t.true ( !isMatch ( '!(*.a|*.b|*.c)', 'a.a' ) );
    // t.true ( !isMatch ( '!(*.a|*.b|*.c)', 'a.b' ) );
    // t.true ( !isMatch ( '!(*.a|*.b|*.c)', 'a.c' ) );
    // t.true ( isMatch ( '!(*.a|*.b|*.c)', 'a.c.d' ) );
    // t.true ( !isMatch ( '!(*.a|*.b|*.c)', 'c.c' ) );
    // t.true ( isMatch ( '!(*.a|*.b|*.c)', 'a.' ) );
    // t.true ( isMatch ( '!(*.a|*.b|*.c)', 'd.d' ) );
    // t.true ( isMatch ( '!(*.a|*.b|*.c)', 'e.e' ) );
    // t.true ( isMatch ( '!(*.a|*.b|*.c)', 'f.f' ) );
    // t.true ( isMatch ( '!(*.a|*.b|*.c)', 'a.abcd' ) );

    t.true(isMatch("!(*.[^a-c])", "a.a"));
    t.true(isMatch("!(*.[^a-c])", "a.b"));
    t.true(isMatch("!(*.[^a-c])", "a.c"));
    t.true(!isMatch("!(*.[^a-c])", "a.c.d"));
    t.true(isMatch("!(*.[^a-c])", "c.c"));
    t.true(isMatch("!(*.[^a-c])", "a."));
    t.true(!isMatch("!(*.[^a-c])", "d.d"));
    t.true(!isMatch("!(*.[^a-c])", "e.e"));
    t.true(!isMatch("!(*.[^a-c])", "f.f"));
    t.true(isMatch("!(*.[^a-c])", "a.abcd"));

    // t.true ( !isMatch ( '!(*.[a-c])', 'a.a' ) );
    // t.true ( !isMatch ( '!(*.[a-c])', 'a.b' ) );
    // t.true ( !isMatch ( '!(*.[a-c])', 'a.c' ) );
    // t.true ( isMatch ( '!(*.[a-c])', 'a.c.d' ) );
    // t.true ( !isMatch ( '!(*.[a-c])', 'c.c' ) );
    // t.true ( isMatch ( '!(*.[a-c])', 'a.' ) );
    // t.true ( isMatch ( '!(*.[a-c])', 'd.d' ) );
    // t.true ( isMatch ( '!(*.[a-c])', 'e.e' ) );
    // t.true ( isMatch ( '!(*.[a-c])', 'f.f' ) );
    // t.true ( isMatch ( '!(*.[a-c])', 'a.abcd' ) );

    t.true(!isMatch("!(*.[a-c]*)", "a.a"));
    t.true(!isMatch("!(*.[a-c]*)", "a.b"));
    t.true(!isMatch("!(*.[a-c]*)", "a.c"));
    t.true(!isMatch("!(*.[a-c]*)", "a.c.d"));
    t.true(!isMatch("!(*.[a-c]*)", "c.c"));
    t.true(isMatch("!(*.[a-c]*)", "a."));
    t.true(isMatch("!(*.[a-c]*)", "d.d"));
    t.true(isMatch("!(*.[a-c]*)", "e.e"));
    t.true(isMatch("!(*.[a-c]*)", "f.f"));
    t.true(!isMatch("!(*.[a-c]*)", "a.abcd"));

    // t.true ( !isMatch ( '*.!(a|b|c)', 'a.a' ) );
    // t.true ( !isMatch ( '*.!(a|b|c)', 'a.b' ) );
    // t.true ( !isMatch ( '*.!(a|b|c)', 'a.c' ) );
    // t.true ( isMatch ( '*.!(a|b|c)', 'a.c.d' ) );
    // t.true ( !isMatch ( '*.!(a|b|c)', 'c.c' ) );
    // t.true ( isMatch ( '*.!(a|b|c)', 'a.' ) );
    // t.true ( isMatch ( '*.!(a|b|c)', 'd.d' ) );
    // t.true ( isMatch ( '*.!(a|b|c)', 'e.e' ) );
    // t.true ( isMatch ( '*.!(a|b|c)', 'f.f' ) );
    // t.true ( isMatch ( '*.!(a|b|c)', 'a.abcd' ) );

    t.true(isMatch("*!(.a|.b|.c)", "a.a"));
    t.true(isMatch("*!(.a|.b|.c)", "a.b"));
    t.true(isMatch("*!(.a|.b|.c)", "a.c"));
    t.true(isMatch("*!(.a|.b|.c)", "a.c.d"));
    t.true(isMatch("*!(.a|.b|.c)", "c.c"));
    t.true(isMatch("*!(.a|.b|.c)", "a."));
    t.true(isMatch("*!(.a|.b|.c)", "d.d"));
    t.true(isMatch("*!(.a|.b|.c)", "e.e"));
    t.true(isMatch("*!(.a|.b|.c)", "f.f"));
    t.true(isMatch("*!(.a|.b|.c)", "a.abcd"));

    t.true(!isMatch("!(*.[a-c])*", "a.a"));
    t.true(!isMatch("!(*.[a-c])*", "a.b"));
    t.true(!isMatch("!(*.[a-c])*", "a.c"));
    t.true(!isMatch("!(*.[a-c])*", "a.c.d"));
    t.true(!isMatch("!(*.[a-c])*", "c.c"));
    t.true(isMatch("!(*.[a-c])*", "a."));
    t.true(isMatch("!(*.[a-c])*", "d.d"));
    t.true(isMatch("!(*.[a-c])*", "e.e"));
    t.true(isMatch("!(*.[a-c])*", "f.f"));
    t.true(!isMatch("!(*.[a-c])*", "a.abcd"));

    t.true(isMatch("*!(.a|.b|.c)*", "a.a"));
    t.true(isMatch("*!(.a|.b|.c)*", "a.b"));
    t.true(isMatch("*!(.a|.b|.c)*", "a.c"));
    t.true(isMatch("*!(.a|.b|.c)*", "a.c.d"));
    t.true(isMatch("*!(.a|.b|.c)*", "c.c"));
    t.true(isMatch("*!(.a|.b|.c)*", "a."));
    t.true(isMatch("*!(.a|.b|.c)*", "d.d"));
    t.true(isMatch("*!(.a|.b|.c)*", "e.e"));
    t.true(isMatch("*!(.a|.b|.c)*", "f.f"));
    t.true(isMatch("*!(.a|.b|.c)*", "a.abcd"));

    t.true(!isMatch("*.!(a|b|c)*", "a.a"));
    t.true(!isMatch("*.!(a|b|c)*", "a.b"));
    t.true(!isMatch("*.!(a|b|c)*", "a.c"));
    t.true(isMatch("*.!(a|b|c)*", "a.c.d"));
    t.true(!isMatch("*.!(a|b|c)*", "c.c"));
    t.true(isMatch("*.!(a|b|c)*", "a."));
    t.true(isMatch("*.!(a|b|c)*", "d.d"));
    t.true(isMatch("*.!(a|b|c)*", "e.e"));
    t.true(isMatch("*.!(a|b|c)*", "f.f"));
    t.true(!isMatch("*.!(a|b|c)*", "a.abcd"));

    // t.true ( !isMatch ( '@()ef', 'def' ) );
    // t.true ( isMatch ( '@()ef', 'ef' ) );

    // t.true ( !isMatch ( '()ef', 'def' ) );
    // t.true ( isMatch ( '()ef', 'ef' ) );

    // t.true ( isMatch ( 'a\\\\\\(b', 'a\\(b' ) );
    // t.true ( isMatch ( 'a(b', 'a(b' ) );
    // t.true ( isMatch ( 'a\\(b', 'a(b' ) );
    // t.true ( !isMatch ( 'a(b', 'a((b' ) );
    // t.true ( !isMatch ( 'a(b', 'a((((b' ) );
    // t.true ( !isMatch ( 'a(b', 'ab' ) );

    t.true(isMatch("a\\(b", "a(b"));
    t.true(!isMatch("a\\(b", "a((b"));
    t.true(!isMatch("a\\(b", "a((((b"));
    t.true(!isMatch("a\\(b", "ab"));

    t.true(isMatch("a(*b", "a(b"));
    t.true(isMatch("a\\(*b", "a(ab"));
    t.true(isMatch("a(*b", "a((b"));
    t.true(isMatch("a(*b", "a((((b"));
    t.true(!isMatch("a(*b", "ab"));

    t.true(isMatch("a\\(b", "a(b"));
    t.true(isMatch("a\\(\\(b", "a((b"));
    t.true(isMatch("a\\(\\(\\(\\(b", "a((((b"));

    t.true(!isMatch("a\\\\(b", "a(b"));
    t.true(!isMatch("a\\\\(b", "a((b"));
    t.true(!isMatch("a\\\\(b", "a((((b"));
    t.true(!isMatch("a\\\\(b", "ab"));

    t.true(!isMatch("a\\\\b", "a/b"));
    t.true(!isMatch("a\\\\b", "ab"));
  });

  // Tests adapted from "glob-match": https://github.com/devongovett/glob-match
  // License: https://github.com/devongovett/glob-match/blob/main/LICENSE

  it("basic", (t) => {
    t.true(isMatch("abc", "abc"));
    t.true(isMatch("*", "abc"));
    t.true(isMatch("*", ""));
    t.true(isMatch("**", ""));
    t.true(isMatch("*c", "abc"));
    t.true(!isMatch("*b", "abc"));
    t.true(isMatch("a*", "abc"));
    t.true(!isMatch("b*", "abc"));
    t.true(isMatch("a*", "a"));
    t.true(isMatch("*a", "a"));
    t.true(isMatch("a*b*c*d*e*", "axbxcxdxe"));
    t.true(isMatch("a*b*c*d*e*", "axbxcxdxexxx"));
    t.true(isMatch("a*b?c*x", "abxbbxdbxebxczzx"));
    t.true(!isMatch("a*b?c*x", "abxbbxdbxebxczzy"));

    t.true(isMatch("a/*/test", "a/foo/test"));
    t.true(!isMatch("a/*/test", "a/foo/bar/test"));
    t.true(isMatch("a/**/test", "a/foo/test"));
    t.true(isMatch("a/**/test", "a/foo/bar/test"));
    t.true(isMatch("a/**/b/c", "a/foo/bar/b/c"));
    t.true(isMatch("a\\*b", "a*b"));
    t.true(!isMatch("a\\*b", "axb"));

    t.true(isMatch("[abc]", "a"));
    t.true(isMatch("[abc]", "b"));
    t.true(isMatch("[abc]", "c"));
    t.true(!isMatch("[abc]", "d"));
    t.true(isMatch("x[abc]x", "xax"));
    t.true(isMatch("x[abc]x", "xbx"));
    t.true(isMatch("x[abc]x", "xcx"));
    t.true(!isMatch("x[abc]x", "xdx"));
    t.true(!isMatch("x[abc]x", "xay"));
    t.true(isMatch("[?]", "?"));
    t.true(!isMatch("[?]", "a"));
    t.true(isMatch("[*]", "*"));
    t.true(!isMatch("[*]", "a"));

    t.true(isMatch("[a-cx]", "a"));
    t.true(isMatch("[a-cx]", "b"));
    t.true(isMatch("[a-cx]", "c"));
    t.true(!isMatch("[a-cx]", "d"));
    t.true(isMatch("[a-cx]", "x"));

    t.true(!isMatch("[^abc]", "a"));
    t.true(!isMatch("[^abc]", "b"));
    t.true(!isMatch("[^abc]", "c"));
    t.true(isMatch("[^abc]", "d"));
    t.true(!isMatch("[!abc]", "a"));
    t.true(!isMatch("[!abc]", "b"));
    t.true(!isMatch("[!abc]", "c"));
    t.true(isMatch("[!abc]", "d"));
    t.true(isMatch("[\\!]", "!"));

    t.true(isMatch("a*b*[cy]*d*e*", "axbxcxdxexxx"));
    t.true(isMatch("a*b*[cy]*d*e*", "axbxyxdxexxx"));
    t.true(isMatch("a*b*[cy]*d*e*", "axbxxxyxdxexxx"));

    t.true(isMatch("test.{jpg,png}", "test.jpg"));
    t.true(isMatch("test.{jpg,png}", "test.png"));
    t.true(isMatch("test.{j*g,p*g}", "test.jpg"));
    t.true(isMatch("test.{j*g,p*g}", "test.jpxxxg"));
    t.true(isMatch("test.{j*g,p*g}", "test.jxg"));
    t.true(!isMatch("test.{j*g,p*g}", "test.jnt"));
    t.true(isMatch("test.{j*g,j*c}", "test.jnc"));
    t.true(isMatch("test.{jpg,p*g}", "test.png"));
    t.true(isMatch("test.{jpg,p*g}", "test.pxg"));
    t.true(!isMatch("test.{jpg,p*g}", "test.pnt"));
    t.true(isMatch("test.{jpeg,png}", "test.jpeg"));
    t.true(!isMatch("test.{jpeg,png}", "test.jpg"));
    t.true(isMatch("test.{jpeg,png}", "test.png"));
    t.true(isMatch("test.{jp\\,g,png}", "test.jp,g"));
    t.true(!isMatch("test.{jp\\,g,png}", "test.jxg"));
    t.true(isMatch("test/{foo,bar}/baz", "test/foo/baz"));
    t.true(isMatch("test/{foo,bar}/baz", "test/bar/baz"));
    t.true(!isMatch("test/{foo,bar}/baz", "test/baz/baz"));
    t.true(isMatch("test/{foo*,bar*}/baz", "test/foooooo/baz"));
    t.true(isMatch("test/{foo*,bar*}/baz", "test/barrrrr/baz"));
    t.true(isMatch("test/{*foo,*bar}/baz", "test/xxxxfoo/baz"));
    t.true(isMatch("test/{*foo,*bar}/baz", "test/xxxxbar/baz"));
    t.true(isMatch("test/{foo/**,bar}/baz", "test/bar/baz"));
    t.true(!isMatch("test/{foo/**,bar}/baz", "test/bar/test/baz"));

    t.true(!isMatch("*.txt", "some/big/path/to/the/needle.txt"));
    t.true(
      isMatch(
        "some/**/needle.{js,tsx,mdx,ts,jsx,txt}",
        "some/a/bigger/path/to/the/crazy/needle.txt",
      ),
    );
    t.true(
      isMatch("some/**/{a,b,c}/**/needle.txt", "some/foo/a/bigger/path/to/the/crazy/needle.txt"),
    );
    t.true(
      !isMatch("some/**/{a,b,c}/**/needle.txt", "some/foo/d/bigger/path/to/the/crazy/needle.txt"),
    );

    t.true(isMatch("a/{a{a,b},b}", "a/aa"));
    t.true(isMatch("a/{a{a,b},b}", "a/ab"));
    t.true(!isMatch("a/{a{a,b},b}", "a/ac"));
    t.true(isMatch("a/{a{a,b},b}", "a/b"));
    t.true(!isMatch("a/{a{a,b},b}", "a/c"));
    t.true(isMatch("a/{b,c[}]*}", "a/b"));
    t.true(isMatch("a/{b,c[}]*}", "a/c}xx"));
  });

  it("bash", (t) => {
    t.true(!isMatch("a*", "*"));
    t.true(!isMatch("a*", "**"));
    t.true(!isMatch("a*", "\\*"));
    t.true(!isMatch("a*", "a/*"));
    t.true(!isMatch("a*", "b"));
    t.true(!isMatch("a*", "bc"));
    t.true(!isMatch("a*", "bcd"));
    t.true(!isMatch("a*", "bdir/"));
    t.true(!isMatch("a*", "Beware"));
    t.true(isMatch("a*", "a"));
    t.true(isMatch("a*", "ab"));
    t.true(isMatch("a*", "abc"));

    t.true(!isMatch("\\a*", "*"));
    t.true(!isMatch("\\a*", "**"));
    t.true(!isMatch("\\a*", "\\*"));

    t.true(isMatch("\\a*", "a"));
    t.true(!isMatch("\\a*", "a/*"));
    t.true(isMatch("\\a*", "abc"));
    t.true(isMatch("\\a*", "abd"));
    t.true(isMatch("\\a*", "abe"));
    t.true(!isMatch("\\a*", "b"));
    t.true(!isMatch("\\a*", "bb"));
    t.true(!isMatch("\\a*", "bcd"));
    t.true(!isMatch("\\a*", "bdir/"));
    t.true(!isMatch("\\a*", "Beware"));
    t.true(!isMatch("\\a*", "c"));
    t.true(!isMatch("\\a*", "ca"));
    t.true(!isMatch("\\a*", "cb"));
    t.true(!isMatch("\\a*", "d"));
    t.true(!isMatch("\\a*", "dd"));
    t.true(!isMatch("\\a*", "de"));
  });

  it("bash_directories", (t) => {
    t.true(!isMatch("b*/", "*"));
    t.true(!isMatch("b*/", "**"));
    t.true(!isMatch("b*/", "\\*"));
    t.true(!isMatch("b*/", "a"));
    t.true(!isMatch("b*/", "a/*"));
    t.true(!isMatch("b*/", "abc"));
    t.true(!isMatch("b*/", "abd"));
    t.true(!isMatch("b*/", "abe"));
    t.true(!isMatch("b*/", "b"));
    t.true(!isMatch("b*/", "bb"));
    t.true(!isMatch("b*/", "bcd"));
    t.true(isMatch("b*/", "bdir/"));
    t.true(!isMatch("b*/", "Beware"));
    t.true(!isMatch("b*/", "c"));
    t.true(!isMatch("b*/", "ca"));
    t.true(!isMatch("b*/", "cb"));
    t.true(!isMatch("b*/", "d"));
    t.true(!isMatch("b*/", "dd"));
    t.true(!isMatch("b*/", "de"));
  });

  it("bash_escaping", (t) => {
    t.true(!isMatch("\\^", "*"));
    t.true(!isMatch("\\^", "**"));
    t.true(!isMatch("\\^", "\\*"));
    t.true(!isMatch("\\^", "a"));
    t.true(!isMatch("\\^", "a/*"));
    t.true(!isMatch("\\^", "abc"));
    t.true(!isMatch("\\^", "abd"));
    t.true(!isMatch("\\^", "abe"));
    t.true(!isMatch("\\^", "b"));
    t.true(!isMatch("\\^", "bb"));
    t.true(!isMatch("\\^", "bcd"));
    t.true(!isMatch("\\^", "bdir/"));
    t.true(!isMatch("\\^", "Beware"));
    t.true(!isMatch("\\^", "c"));
    t.true(!isMatch("\\^", "ca"));
    t.true(!isMatch("\\^", "cb"));
    t.true(!isMatch("\\^", "d"));
    t.true(!isMatch("\\^", "dd"));
    t.true(!isMatch("\\^", "de"));

    t.true(isMatch("\\*", "*"));
    t.true(!isMatch("\\*", "\\*")); // Why would this match? https://github.com/micromatch/picomatch/issues/117
    t.true(!isMatch("\\*", "**"));
    t.true(!isMatch("\\*", "a"));
    t.true(!isMatch("\\*", "a/*"));
    t.true(!isMatch("\\*", "abc"));
    t.true(!isMatch("\\*", "abd"));
    t.true(!isMatch("\\*", "abe"));
    t.true(!isMatch("\\*", "b"));
    t.true(!isMatch("\\*", "bb"));
    t.true(!isMatch("\\*", "bcd"));
    t.true(!isMatch("\\*", "bdir/"));
    t.true(!isMatch("\\*", "Beware"));
    t.true(!isMatch("\\*", "c"));
    t.true(!isMatch("\\*", "ca"));
    t.true(!isMatch("\\*", "cb"));
    t.true(!isMatch("\\*", "d"));
    t.true(!isMatch("\\*", "dd"));
    t.true(!isMatch("\\*", "de"));

    t.true(!isMatch("a\\*", "*"));
    t.true(!isMatch("a\\*", "**"));
    t.true(!isMatch("a\\*", "\\*"));
    t.true(!isMatch("a\\*", "a"));
    t.true(!isMatch("a\\*", "a/*"));
    t.true(!isMatch("a\\*", "abc"));
    t.true(!isMatch("a\\*", "abd"));
    t.true(!isMatch("a\\*", "abe"));
    t.true(!isMatch("a\\*", "b"));
    t.true(!isMatch("a\\*", "bb"));
    t.true(!isMatch("a\\*", "bcd"));
    t.true(!isMatch("a\\*", "bdir/"));
    t.true(!isMatch("a\\*", "Beware"));
    t.true(!isMatch("a\\*", "c"));
    t.true(!isMatch("a\\*", "ca"));
    t.true(!isMatch("a\\*", "cb"));
    t.true(!isMatch("a\\*", "d"));
    t.true(!isMatch("a\\*", "dd"));
    t.true(!isMatch("a\\*", "de"));

    t.true(isMatch("*q*", "aqa"));
    t.true(isMatch("*q*", "aaqaa"));
    t.true(!isMatch("*q*", "*"));
    t.true(!isMatch("*q*", "**"));
    t.true(!isMatch("*q*", "\\*"));
    t.true(!isMatch("*q*", "a"));
    t.true(!isMatch("*q*", "a/*"));
    t.true(!isMatch("*q*", "abc"));
    t.true(!isMatch("*q*", "abd"));
    t.true(!isMatch("*q*", "abe"));
    t.true(!isMatch("*q*", "b"));
    t.true(!isMatch("*q*", "bb"));
    t.true(!isMatch("*q*", "bcd"));
    t.true(!isMatch("*q*", "bdir/"));
    t.true(!isMatch("*q*", "Beware"));
    t.true(!isMatch("*q*", "c"));
    t.true(!isMatch("*q*", "ca"));
    t.true(!isMatch("*q*", "cb"));
    t.true(!isMatch("*q*", "d"));
    t.true(!isMatch("*q*", "dd"));
    t.true(!isMatch("*q*", "de"));

    t.true(isMatch("\\**", "*"));
    t.true(isMatch("\\**", "**"));
    t.true(!isMatch("\\**", "\\*"));
    t.true(!isMatch("\\**", "a"));
    t.true(!isMatch("\\**", "a/*"));
    t.true(!isMatch("\\**", "abc"));
    t.true(!isMatch("\\**", "abd"));
    t.true(!isMatch("\\**", "abe"));
    t.true(!isMatch("\\**", "b"));
    t.true(!isMatch("\\**", "bb"));
    t.true(!isMatch("\\**", "bcd"));
    t.true(!isMatch("\\**", "bdir/"));
    t.true(!isMatch("\\**", "Beware"));
    t.true(!isMatch("\\**", "c"));
    t.true(!isMatch("\\**", "ca"));
    t.true(!isMatch("\\**", "cb"));
    t.true(!isMatch("\\**", "d"));
    t.true(!isMatch("\\**", "dd"));
    t.true(!isMatch("\\**", "de"));
  });

  it("bash_classes", (t) => {
    t.true(!isMatch("a*[^c]", "*"));
    t.true(!isMatch("a*[^c]", "**"));
    t.true(!isMatch("a*[^c]", "\\*"));
    t.true(!isMatch("a*[^c]", "a"));
    t.true(!isMatch("a*[^c]", "a/*"));
    t.true(!isMatch("a*[^c]", "abc"));
    t.true(isMatch("a*[^c]", "abd"));
    t.true(isMatch("a*[^c]", "abe"));
    t.true(!isMatch("a*[^c]", "b"));
    t.true(!isMatch("a*[^c]", "bb"));
    t.true(!isMatch("a*[^c]", "bcd"));
    t.true(!isMatch("a*[^c]", "bdir/"));
    t.true(!isMatch("a*[^c]", "Beware"));
    t.true(!isMatch("a*[^c]", "c"));
    t.true(!isMatch("a*[^c]", "ca"));
    t.true(!isMatch("a*[^c]", "cb"));
    t.true(!isMatch("a*[^c]", "d"));
    t.true(!isMatch("a*[^c]", "dd"));
    t.true(!isMatch("a*[^c]", "de"));
    t.true(!isMatch("a*[^c]", "baz"));
    t.true(!isMatch("a*[^c]", "bzz"));
    t.true(!isMatch("a*[^c]", "BZZ"));
    t.true(!isMatch("a*[^c]", "beware"));
    t.true(!isMatch("a*[^c]", "BewAre"));

    t.true(isMatch("a[X-]b", "a-b"));
    t.true(isMatch("a[X-]b", "aXb"));

    t.true(!isMatch("[a-y]*[^c]", "*"));
    t.true(isMatch("[a-y]*[^c]", "a*"));
    t.true(!isMatch("[a-y]*[^c]", "**"));
    t.true(!isMatch("[a-y]*[^c]", "\\*"));
    t.true(!isMatch("[a-y]*[^c]", "a"));
    t.true(isMatch("[a-y]*[^c]", "a123b"));
    t.true(!isMatch("[a-y]*[^c]", "a123c"));
    t.true(isMatch("[a-y]*[^c]", "ab"));
    t.true(!isMatch("[a-y]*[^c]", "a/*"));
    t.true(!isMatch("[a-y]*[^c]", "abc"));
    t.true(isMatch("[a-y]*[^c]", "abd"));
    t.true(isMatch("[a-y]*[^c]", "abe"));
    t.true(!isMatch("[a-y]*[^c]", "b"));
    t.true(isMatch("[a-y]*[^c]", "bd"));
    t.true(isMatch("[a-y]*[^c]", "bb"));
    t.true(isMatch("[a-y]*[^c]", "bcd"));
    t.true(isMatch("[a-y]*[^c]", "bdir/"));
    t.true(!isMatch("[a-y]*[^c]", "Beware"));
    t.true(!isMatch("[a-y]*[^c]", "c"));
    t.true(isMatch("[a-y]*[^c]", "ca"));
    t.true(isMatch("[a-y]*[^c]", "cb"));
    t.true(!isMatch("[a-y]*[^c]", "d"));
    t.true(isMatch("[a-y]*[^c]", "dd"));
    t.true(isMatch("[a-y]*[^c]", "dd"));
    t.true(isMatch("[a-y]*[^c]", "dd"));
    t.true(isMatch("[a-y]*[^c]", "de"));
    t.true(isMatch("[a-y]*[^c]", "baz"));
    t.true(isMatch("[a-y]*[^c]", "bzz"));
    t.true(isMatch("[a-y]*[^c]", "bzz"));
    t.true(!isMatch("bzz", "[a-y]*[^c]"));
    t.true(!isMatch("[a-y]*[^c]", "BZZ"));
    t.true(isMatch("[a-y]*[^c]", "beware"));
    t.true(!isMatch("[a-y]*[^c]", "BewAre"));

    t.true(isMatch("a\\*b/*", "a*b/ooo"));
    t.true(isMatch("a\\*?/*", "a*b/ooo"));

    t.true(!isMatch("a[b]c", "*"));
    t.true(!isMatch("a[b]c", "**"));
    t.true(!isMatch("a[b]c", "\\*"));
    t.true(!isMatch("a[b]c", "a"));
    t.true(!isMatch("a[b]c", "a/*"));
    t.true(isMatch("a[b]c", "abc"));
    t.true(!isMatch("a[b]c", "abd"));
    t.true(!isMatch("a[b]c", "abe"));
    t.true(!isMatch("a[b]c", "b"));
    t.true(!isMatch("a[b]c", "bb"));
    t.true(!isMatch("a[b]c", "bcd"));
    t.true(!isMatch("a[b]c", "bdir/"));
    t.true(!isMatch("a[b]c", "Beware"));
    t.true(!isMatch("a[b]c", "c"));
    t.true(!isMatch("a[b]c", "ca"));
    t.true(!isMatch("a[b]c", "cb"));
    t.true(!isMatch("a[b]c", "d"));
    t.true(!isMatch("a[b]c", "dd"));
    t.true(!isMatch("a[b]c", "de"));
    t.true(!isMatch("a[b]c", "baz"));
    t.true(!isMatch("a[b]c", "bzz"));
    t.true(!isMatch("a[b]c", "BZZ"));
    t.true(!isMatch("a[b]c", "beware"));
    t.true(!isMatch("a[b]c", "BewAre"));

    t.true(!isMatch('a["b"]c', "*"));
    t.true(!isMatch('a["b"]c', "**"));
    t.true(!isMatch('a["b"]c', "\\*"));
    t.true(!isMatch('a["b"]c', "a"));
    t.true(!isMatch('a["b"]c', "a/*"));
    t.true(isMatch('a["b"]c', "abc"));
    t.true(!isMatch('a["b"]c', "abd"));
    t.true(!isMatch('a["b"]c', "abe"));
    t.true(!isMatch('a["b"]c', "b"));
    t.true(!isMatch('a["b"]c', "bb"));
    t.true(!isMatch('a["b"]c', "bcd"));
    t.true(!isMatch('a["b"]c', "bdir/"));
    t.true(!isMatch('a["b"]c', "Beware"));
    t.true(!isMatch('a["b"]c', "c"));
    t.true(!isMatch('a["b"]c', "ca"));
    t.true(!isMatch('a["b"]c', "cb"));
    t.true(!isMatch('a["b"]c', "d"));
    t.true(!isMatch('a["b"]c', "dd"));
    t.true(!isMatch('a["b"]c', "de"));
    t.true(!isMatch('a["b"]c', "baz"));
    t.true(!isMatch('a["b"]c', "bzz"));
    t.true(!isMatch('a["b"]c', "BZZ"));
    t.true(!isMatch('a["b"]c', "beware"));
    t.true(!isMatch('a["b"]c', "BewAre"));

    t.true(!isMatch("a[\\\\b]c", "*"));
    t.true(!isMatch("a[\\\\b]c", "**"));
    t.true(!isMatch("a[\\\\b]c", "\\*"));
    t.true(!isMatch("a[\\\\b]c", "a"));
    t.true(!isMatch("a[\\\\b]c", "a/*"));
    t.true(isMatch("a[\\\\b]c", "abc"));
    t.true(!isMatch("a[\\\\b]c", "abd"));
    t.true(!isMatch("a[\\\\b]c", "abe"));
    t.true(!isMatch("a[\\\\b]c", "b"));
    t.true(!isMatch("a[\\\\b]c", "bb"));
    t.true(!isMatch("a[\\\\b]c", "bcd"));
    t.true(!isMatch("a[\\\\b]c", "bdir/"));
    t.true(!isMatch("a[\\\\b]c", "Beware"));
    t.true(!isMatch("a[\\\\b]c", "c"));
    t.true(!isMatch("a[\\\\b]c", "ca"));
    t.true(!isMatch("a[\\\\b]c", "cb"));
    t.true(!isMatch("a[\\\\b]c", "d"));
    t.true(!isMatch("a[\\\\b]c", "dd"));
    t.true(!isMatch("a[\\\\b]c", "de"));
    t.true(!isMatch("a[\\\\b]c", "baz"));
    t.true(!isMatch("a[\\\\b]c", "bzz"));
    t.true(!isMatch("a[\\\\b]c", "BZZ"));
    t.true(!isMatch("a[\\\\b]c", "beware"));
    t.true(!isMatch("a[\\\\b]c", "BewAre"));

    t.true(!isMatch("a[\\b]c", "*"));
    t.true(!isMatch("a[\\b]c", "**"));
    t.true(!isMatch("a[\\b]c", "\\*"));
    t.true(!isMatch("a[\\b]c", "a"));
    t.true(!isMatch("a[\\b]c", "a/*"));
    t.true(!isMatch("a[\\b]c", "abc"));
    t.true(!isMatch("a[\\b]c", "abd"));
    t.true(!isMatch("a[\\b]c", "abe"));
    t.true(!isMatch("a[\\b]c", "b"));
    t.true(!isMatch("a[\\b]c", "bb"));
    t.true(!isMatch("a[\\b]c", "bcd"));
    t.true(!isMatch("a[\\b]c", "bdir/"));
    t.true(!isMatch("a[\\b]c", "Beware"));
    t.true(!isMatch("a[\\b]c", "c"));
    t.true(!isMatch("a[\\b]c", "ca"));
    t.true(!isMatch("a[\\b]c", "cb"));
    t.true(!isMatch("a[\\b]c", "d"));
    t.true(!isMatch("a[\\b]c", "dd"));
    t.true(!isMatch("a[\\b]c", "de"));
    t.true(!isMatch("a[\\b]c", "baz"));
    t.true(!isMatch("a[\\b]c", "bzz"));
    t.true(!isMatch("a[\\b]c", "BZZ"));
    t.true(!isMatch("a[\\b]c", "beware"));
    t.true(!isMatch("a[\\b]c", "BewAre"));

    t.true(!isMatch("a[b-d]c", "*"));
    t.true(!isMatch("a[b-d]c", "**"));
    t.true(!isMatch("a[b-d]c", "\\*"));
    t.true(!isMatch("a[b-d]c", "a"));
    t.true(!isMatch("a[b-d]c", "a/*"));
    t.true(isMatch("a[b-d]c", "abc"));
    t.true(!isMatch("a[b-d]c", "abd"));
    t.true(!isMatch("a[b-d]c", "abe"));
    t.true(!isMatch("a[b-d]c", "b"));
    t.true(!isMatch("a[b-d]c", "bb"));
    t.true(!isMatch("a[b-d]c", "bcd"));
    t.true(!isMatch("a[b-d]c", "bdir/"));
    t.true(!isMatch("a[b-d]c", "Beware"));
    t.true(!isMatch("a[b-d]c", "c"));
    t.true(!isMatch("a[b-d]c", "ca"));
    t.true(!isMatch("a[b-d]c", "cb"));
    t.true(!isMatch("a[b-d]c", "d"));
    t.true(!isMatch("a[b-d]c", "dd"));
    t.true(!isMatch("a[b-d]c", "de"));
    t.true(!isMatch("a[b-d]c", "baz"));
    t.true(!isMatch("a[b-d]c", "bzz"));
    t.true(!isMatch("a[b-d]c", "BZZ"));
    t.true(!isMatch("a[b-d]c", "beware"));
    t.true(!isMatch("a[b-d]c", "BewAre"));

    t.true(!isMatch("a?c", "*"));
    t.true(!isMatch("a?c", "**"));
    t.true(!isMatch("a?c", "\\*"));
    t.true(!isMatch("a?c", "a"));
    t.true(!isMatch("a?c", "a/*"));
    t.true(isMatch("a?c", "abc"));
    t.true(!isMatch("a?c", "abd"));
    t.true(!isMatch("a?c", "abe"));
    t.true(!isMatch("a?c", "b"));
    t.true(!isMatch("a?c", "bb"));
    t.true(!isMatch("a?c", "bcd"));
    t.true(!isMatch("a?c", "bdir/"));
    t.true(!isMatch("a?c", "Beware"));
    t.true(!isMatch("a?c", "c"));
    t.true(!isMatch("a?c", "ca"));
    t.true(!isMatch("a?c", "cb"));
    t.true(!isMatch("a?c", "d"));
    t.true(!isMatch("a?c", "dd"));
    t.true(!isMatch("a?c", "de"));
    t.true(!isMatch("a?c", "baz"));
    t.true(!isMatch("a?c", "bzz"));
    t.true(!isMatch("a?c", "BZZ"));
    t.true(!isMatch("a?c", "beware"));
    t.true(!isMatch("a?c", "BewAre"));

    t.true(isMatch("*/man*/bash.*", "man/man1/bash.1"));

    t.true(isMatch("[^a-c]*", "*"));
    t.true(isMatch("[^a-c]*", "**"));
    t.true(!isMatch("[^a-c]*", "a"));
    t.true(!isMatch("[^a-c]*", "a/*"));
    t.true(!isMatch("[^a-c]*", "abc"));
    t.true(!isMatch("[^a-c]*", "abd"));
    t.true(!isMatch("[^a-c]*", "abe"));
    t.true(!isMatch("[^a-c]*", "b"));
    t.true(!isMatch("[^a-c]*", "bb"));
    t.true(!isMatch("[^a-c]*", "bcd"));
    t.true(!isMatch("[^a-c]*", "bdir/"));
    t.true(isMatch("[^a-c]*", "Beware"));
    t.true(isMatch("[^a-c]*", "Beware"));
    t.true(!isMatch("[^a-c]*", "c"));
    t.true(!isMatch("[^a-c]*", "ca"));
    t.true(!isMatch("[^a-c]*", "cb"));
    t.true(isMatch("[^a-c]*", "d"));
    t.true(isMatch("[^a-c]*", "dd"));
    t.true(isMatch("[^a-c]*", "de"));
    t.true(!isMatch("[^a-c]*", "baz"));
    t.true(!isMatch("[^a-c]*", "bzz"));
    t.true(isMatch("[^a-c]*", "BZZ"));
    t.true(!isMatch("[^a-c]*", "beware"));
    t.true(isMatch("[^a-c]*", "BewAre"));
  });

  it("bash_wildmatch", (t) => {
    t.true(!isMatch("a[]-]b", "aab"));
    t.true(!isMatch("[ten]", "ten"));
    t.true(isMatch("]", "]"));
    // t.true ( isMatch ( "a[]-]b", "a-b" ) );
    // t.true ( isMatch ( "a[]-]b", "a]b" ) );
    // t.true ( isMatch ( "a[]]b", "a]b" ) );
    // t.true ( isMatch ( "a[\\]a\\-]b", "aab" ) );
    t.true(isMatch("t[a-g]n", "ten"));
    t.true(isMatch("t[^a-g]n", "ton"));
  });

  it("bash_slashmatch", (t) => {
    t.true(!isMatch("f[^eiu][^eiu][^eiu][^eiu][^eiu]r", "foo/bar"));
    t.true(isMatch("foo[/]bar", "foo/bar"));
    t.true(isMatch("f[^eiu][^eiu][^eiu][^eiu][^eiu]r", "foo-bar"));
  });

  it("bash_extra_stars", (t) => {
    t.true(!isMatch("a**c", "bbc"));
    t.true(isMatch("a**c", "abc"));
    t.true(!isMatch("a**c", "bbd"));

    t.true(!isMatch("a***c", "bbc"));
    t.true(isMatch("a***c", "abc"));
    t.true(!isMatch("a***c", "bbd"));

    t.true(!isMatch("a*****?c", "bbc"));
    t.true(isMatch("a*****?c", "abc"));
    t.true(!isMatch("a*****?c", "bbc"));

    t.true(isMatch("?*****??", "bbc"));
    t.true(isMatch("?*****??", "abc"));

    t.true(isMatch("*****??", "bbc"));
    t.true(isMatch("*****??", "abc"));

    t.true(isMatch("?*****?c", "bbc"));
    t.true(isMatch("?*****?c", "abc"));

    t.true(isMatch("?***?****c", "bbc"));
    t.true(isMatch("?***?****c", "abc"));
    t.true(!isMatch("?***?****c", "bbd"));

    t.true(isMatch("?***?****?", "bbc"));
    t.true(isMatch("?***?****?", "abc"));

    t.true(isMatch("?***?****", "bbc"));
    t.true(isMatch("?***?****", "abc"));

    t.true(isMatch("*******c", "bbc"));
    t.true(isMatch("*******c", "abc"));

    t.true(isMatch("*******?", "bbc"));
    t.true(isMatch("*******?", "abc"));

    t.true(isMatch("a*cd**?**??k", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??k", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??k***", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??***k", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??***k**", "abcdecdhjk"));
    t.true(isMatch("a****c**?**??*****", "abcdecdhjk"));
  });

  it("stars", (t) => {
    t.true(!isMatch("*.js", "a/b/c/z.js"));
    t.true(!isMatch("*.js", "a/b/z.js"));
    t.true(!isMatch("*.js", "a/z.js"));
    t.true(isMatch("*.js", "z.js"));

    t.true(isMatch("*/*", "a/.ab"));
    t.true(isMatch("*", ".ab"));

    t.true(isMatch("z*.js", "z.js"));
    t.true(isMatch("*/*", "a/z"));
    t.true(isMatch("*/z*.js", "a/z.js"));
    t.true(isMatch("a/z*.js", "a/z.js"));

    t.true(isMatch("*", "ab"));
    t.true(isMatch("*", "abc"));

    t.true(!isMatch("f*", "bar"));
    t.true(!isMatch("*r", "foo"));
    t.true(!isMatch("b*", "foo"));
    t.true(!isMatch("*", "foo/bar"));
    t.true(isMatch("*c", "abc"));
    t.true(isMatch("a*", "abc"));
    t.true(isMatch("a*c", "abc"));
    t.true(isMatch("*r", "bar"));
    t.true(isMatch("b*", "bar"));
    t.true(isMatch("f*", "foo"));

    t.true(isMatch("*abc*", "one abc two"));
    t.true(isMatch("a*b", "a         b"));

    t.true(!isMatch("*a*", "foo"));
    t.true(isMatch("*a*", "bar"));
    t.true(isMatch("*abc*", "oneabctwo"));
    t.true(!isMatch("*-bc-*", "a-b.c-d"));
    t.true(isMatch("*-*.*-*", "a-b.c-d"));
    t.true(isMatch("*-b*c-*", "a-b.c-d"));
    t.true(isMatch("*-b.c-*", "a-b.c-d"));
    t.true(isMatch("*.*", "a-b.c-d"));
    t.true(isMatch("*.*-*", "a-b.c-d"));
    t.true(isMatch("*.*-d", "a-b.c-d"));
    t.true(isMatch("*.c-*", "a-b.c-d"));
    t.true(isMatch("*b.*d", "a-b.c-d"));
    t.true(isMatch("a*.c*", "a-b.c-d"));
    t.true(isMatch("a-*.*-d", "a-b.c-d"));
    t.true(isMatch("*.*", "a.b"));
    t.true(isMatch("*.b", "a.b"));
    t.true(isMatch("a.*", "a.b"));
    t.true(isMatch("a.b", "a.b"));

    t.true(!isMatch("**-bc-**", "a-b.c-d"));
    t.true(isMatch("**-**.**-**", "a-b.c-d"));
    t.true(isMatch("**-b**c-**", "a-b.c-d"));
    t.true(isMatch("**-b.c-**", "a-b.c-d"));
    t.true(isMatch("**.**", "a-b.c-d"));
    t.true(isMatch("**.**-**", "a-b.c-d"));
    t.true(isMatch("**.**-d", "a-b.c-d"));
    t.true(isMatch("**.c-**", "a-b.c-d"));
    t.true(isMatch("**b.**d", "a-b.c-d"));
    t.true(isMatch("a**.c**", "a-b.c-d"));
    t.true(isMatch("a-**.**-d", "a-b.c-d"));
    t.true(isMatch("**.**", "a.b"));
    t.true(isMatch("**.b", "a.b"));
    t.true(isMatch("a.**", "a.b"));
    t.true(isMatch("a.b", "a.b"));

    t.true(isMatch("*/*", "/ab"));
    t.true(isMatch(".", "."));
    t.true(!isMatch("a/", "a/.b"));
    t.true(isMatch("/*", "/ab"));
    t.true(isMatch("/??", "/ab"));
    t.true(isMatch("/?b", "/ab"));
    t.true(isMatch("/*", "/cd"));
    t.true(isMatch("a", "a"));
    t.true(isMatch("a/.*", "a/.b"));
    t.true(isMatch("?/?", "a/b"));
    t.true(isMatch("a/**/j/**/z/*.md", "a/b/c/d/e/j/n/p/o/z/c.md"));
    t.true(isMatch("a/**/z/*.md", "a/b/c/d/e/z/c.md"));
    t.true(isMatch("a/b/c/*.md", "a/b/c/xyz.md"));
    t.true(isMatch("a/b/c/*.md", "a/b/c/xyz.md"));
    t.true(isMatch("a/*/z/.a", "a/b/z/.a"));
    t.true(!isMatch("bz", "a/b/z/.a"));
    t.true(isMatch("a/**/c/*.md", "a/bb.bb/aa/b.b/aa/c/xyz.md"));
    t.true(isMatch("a/**/c/*.md", "a/bb.bb/aa/bb/aa/c/xyz.md"));
    t.true(isMatch("a/*/c/*.md", "a/bb.bb/c/xyz.md"));
    t.true(isMatch("a/*/c/*.md", "a/bb/c/xyz.md"));
    t.true(isMatch("a/*/c/*.md", "a/bbbb/c/xyz.md"));
    t.true(isMatch("*", "aaa"));
    t.true(isMatch("*", "ab"));
    t.true(isMatch("ab", "ab"));

    t.true(!isMatch("*/*/*", "aaa"));
    t.true(!isMatch("*/*/*", "aaa/bb/aa/rr"));
    t.true(!isMatch("aaa*", "aaa/bba/ccc"));
    t.true(!isMatch("aaa**", "aaa/bba/ccc"));
    t.true(!isMatch("aaa/*", "aaa/bba/ccc"));
    t.true(!isMatch("aaa/*ccc", "aaa/bba/ccc"));
    t.true(!isMatch("aaa/*z", "aaa/bba/ccc"));
    t.true(!isMatch("*/*/*", "aaa/bbb"));
    t.true(!isMatch("*/*jk*/*i", "ab/zzz/ejkl/hi"));
    t.true(isMatch("*/*/*", "aaa/bba/ccc"));
    t.true(isMatch("aaa/**", "aaa/bba/ccc"));
    t.true(isMatch("aaa/*", "aaa/bbb"));
    t.true(isMatch("*/*z*/*/*i", "ab/zzz/ejkl/hi"));
    t.true(isMatch("*j*i", "abzzzejklhi"));

    t.true(isMatch("*", "a"));
    t.true(isMatch("*", "b"));
    t.true(!isMatch("*", "a/a"));
    t.true(!isMatch("*", "a/a/a"));
    t.true(!isMatch("*", "a/a/b"));
    t.true(!isMatch("*", "a/a/a/a"));
    t.true(!isMatch("*", "a/a/a/a/a"));

    t.true(!isMatch("*/*", "a"));
    t.true(isMatch("*/*", "a/a"));
    t.true(!isMatch("*/*", "a/a/a"));

    t.true(!isMatch("*/*/*", "a"));
    t.true(!isMatch("*/*/*", "a/a"));
    t.true(isMatch("*/*/*", "a/a/a"));
    t.true(!isMatch("*/*/*", "a/a/a/a"));

    t.true(!isMatch("*/*/*/*", "a"));
    t.true(!isMatch("*/*/*/*", "a/a"));
    t.true(!isMatch("*/*/*/*", "a/a/a"));
    t.true(isMatch("*/*/*/*", "a/a/a/a"));
    t.true(!isMatch("*/*/*/*", "a/a/a/a/a"));

    t.true(!isMatch("*/*/*/*/*", "a"));
    t.true(!isMatch("*/*/*/*/*", "a/a"));
    t.true(!isMatch("*/*/*/*/*", "a/a/a"));
    t.true(!isMatch("*/*/*/*/*", "a/a/b"));
    t.true(!isMatch("*/*/*/*/*", "a/a/a/a"));
    t.true(isMatch("*/*/*/*/*", "a/a/a/a/a"));
    t.true(!isMatch("*/*/*/*/*", "a/a/a/a/a/a"));

    t.true(!isMatch("a/*", "a"));
    t.true(isMatch("a/*", "a/a"));
    t.true(!isMatch("a/*", "a/a/a"));
    t.true(!isMatch("a/*", "a/a/a/a"));
    t.true(!isMatch("a/*", "a/a/a/a/a"));

    t.true(!isMatch("a/*/*", "a"));
    t.true(!isMatch("a/*/*", "a/a"));
    t.true(isMatch("a/*/*", "a/a/a"));
    t.true(!isMatch("a/*/*", "b/a/a"));
    t.true(!isMatch("a/*/*", "a/a/a/a"));
    t.true(!isMatch("a/*/*", "a/a/a/a/a"));

    t.true(!isMatch("a/*/*/*", "a"));
    t.true(!isMatch("a/*/*/*", "a/a"));
    t.true(!isMatch("a/*/*/*", "a/a/a"));
    t.true(isMatch("a/*/*/*", "a/a/a/a"));
    t.true(!isMatch("a/*/*/*", "a/a/a/a/a"));

    t.true(!isMatch("a/*/*/*/*", "a"));
    t.true(!isMatch("a/*/*/*/*", "a/a"));
    t.true(!isMatch("a/*/*/*/*", "a/a/a"));
    t.true(!isMatch("a/*/*/*/*", "a/a/b"));
    t.true(!isMatch("a/*/*/*/*", "a/a/a/a"));
    t.true(isMatch("a/*/*/*/*", "a/a/a/a/a"));

    t.true(!isMatch("a/*/a", "a"));
    t.true(!isMatch("a/*/a", "a/a"));
    t.true(isMatch("a/*/a", "a/a/a"));
    t.true(!isMatch("a/*/a", "a/a/b"));
    t.true(!isMatch("a/*/a", "a/a/a/a"));
    t.true(!isMatch("a/*/a", "a/a/a/a/a"));

    t.true(!isMatch("a/*/b", "a"));
    t.true(!isMatch("a/*/b", "a/a"));
    t.true(!isMatch("a/*/b", "a/a/a"));
    t.true(isMatch("a/*/b", "a/a/b"));
    t.true(!isMatch("a/*/b", "a/a/a/a"));
    t.true(!isMatch("a/*/b", "a/a/a/a/a"));

    t.true(!isMatch("*/**/a", "a"));
    t.true(!isMatch("*/**/a", "a/a/b"));
    t.true(isMatch("*/**/a", "a/a"));
    t.true(isMatch("*/**/a", "a/a/a"));
    t.true(isMatch("*/**/a", "a/a/a/a"));
    t.true(isMatch("*/**/a", "a/a/a/a/a"));

    t.true(!isMatch("*/", "a"));
    t.true(!isMatch("*/*", "a"));
    t.true(!isMatch("a/*", "a"));
    // t.true ( !isMatch ( "*/*", "a/" ) );
    // t.true ( !isMatch ( "a/*", "a/" ) );
    t.true(!isMatch("*", "a/a"));
    t.true(!isMatch("*/", "a/a"));
    t.true(!isMatch("*/", "a/x/y"));
    t.true(!isMatch("*/*", "a/x/y"));
    t.true(!isMatch("a/*", "a/x/y"));
    t.true(isMatch("*", "a/"));
    t.true(isMatch("*", "a"));
    t.true(isMatch("*/", "a/"));
    t.true(isMatch("*{,/}", "a/"));
    t.true(isMatch("*/*", "a/a"));
    t.true(isMatch("a/*", "a/a"));

    t.true(!isMatch("a/**/*.txt", "a.txt"));
    t.true(isMatch("a/**/*.txt", "a/x/y.txt"));
    t.true(!isMatch("a/**/*.txt", "a/x/y/z"));

    t.true(!isMatch("a/*.txt", "a.txt"));
    t.true(isMatch("a/*.txt", "a/b.txt"));
    t.true(!isMatch("a/*.txt", "a/x/y.txt"));
    t.true(!isMatch("a/*.txt", "a/x/y/z"));

    t.true(isMatch("a*.txt", "a.txt"));
    t.true(!isMatch("a*.txt", "a/b.txt"));
    t.true(!isMatch("a*.txt", "a/x/y.txt"));
    t.true(!isMatch("a*.txt", "a/x/y/z"));

    t.true(isMatch("*.txt", "a.txt"));
    t.true(!isMatch("*.txt", "a/b.txt"));
    t.true(!isMatch("*.txt", "a/x/y.txt"));
    t.true(!isMatch("*.txt", "a/x/y/z"));

    t.true(!isMatch("a*", "a/b"));
    t.true(!isMatch("a/**/b", "a/a/bb"));
    t.true(!isMatch("a/**/b", "a/bb"));

    t.true(!isMatch("*/**", "foo"));
    t.true(!isMatch("**/", "foo/bar"));
    t.true(!isMatch("**/*/", "foo/bar"));
    t.true(!isMatch("*/*/", "foo/bar"));

    t.true(isMatch("**/..", "/home/foo/.."));
    t.true(isMatch("**/a", "a"));
    t.true(isMatch("**", "a/a"));
    t.true(isMatch("a/**", "a/a"));
    t.true(isMatch("a/**", "a/"));
    t.true(isMatch("a/**", "a"));
    t.true(!isMatch("**/", "a/a"));
    t.true(isMatch("**/a/**", "a"));
    t.true(isMatch("a/**", "a"));
    t.true(!isMatch("**/", "a/a"));
    t.true(isMatch("*/**/a", "a/a"));
    t.true(isMatch("a/**", "a"));
    t.true(isMatch("*/**", "foo/"));
    t.true(isMatch("**/*", "foo/bar"));
    t.true(isMatch("*/*", "foo/bar"));
    t.true(isMatch("*/**", "foo/bar"));
    t.true(isMatch("**/", "foo/bar/"));
    t.true(isMatch("**/*", "foo/bar/"));
    t.true(isMatch("**/*/", "foo/bar/"));
    t.true(isMatch("*/**", "foo/bar/"));
    t.true(isMatch("*/*/", "foo/bar/"));

    t.true(!isMatch("*/foo", "bar/baz/foo"));
    t.true(!isMatch("**/bar/*", "deep/foo/bar"));
    t.true(!isMatch("*/bar/**", "deep/foo/bar/baz/x"));
    t.true(!isMatch("/*", "ef"));
    t.true(!isMatch("foo?bar", "foo/bar"));
    t.true(!isMatch("**/bar*", "foo/bar/baz"));
    t.true(!isMatch("**/bar**", "foo/bar/baz"));
    t.true(!isMatch("foo**bar", "foo/baz/bar"));
    t.true(!isMatch("foo*bar", "foo/baz/bar"));
    t.true(isMatch("foo/**", "foo"));
    t.true(isMatch("/*", "/ab"));
    t.true(isMatch("/*", "/cd"));
    t.true(isMatch("/*", "/ef"));
    t.true(isMatch("a/**/j/**/z/*.md", "a/b/j/c/z/x.md"));
    t.true(isMatch("a/**/j/**/z/*.md", "a/j/z/x.md"));

    t.true(isMatch("**/foo", "bar/baz/foo"));
    t.true(isMatch("**/bar/*", "deep/foo/bar/baz"));
    t.true(isMatch("**/bar/**", "deep/foo/bar/baz/"));
    t.true(isMatch("**/bar/*/*", "deep/foo/bar/baz/x"));
    t.true(isMatch("foo/**/**/bar", "foo/b/a/z/bar"));
    t.true(isMatch("foo/**/bar", "foo/b/a/z/bar"));
    t.true(isMatch("foo/**/**/bar", "foo/bar"));
    t.true(isMatch("foo/**/bar", "foo/bar"));
    t.true(isMatch("*/bar/**", "foo/bar/baz/x"));
    t.true(isMatch("foo/**/**/bar", "foo/baz/bar"));
    t.true(isMatch("foo/**/bar", "foo/baz/bar"));
    t.true(isMatch("**/foo", "XXX/foo"));
  });

  it("globstars", (t) => {
    t.true(isMatch("**/*.js", "a/b/c/d.js"));
    t.true(isMatch("**/*.js", "a/b/c.js"));
    t.true(isMatch("**/*.js", "a/b.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/c/d/e/f.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/c/d/e.js"));
    t.true(isMatch("a/b/c/**/*.js", "a/b/c/d.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/c/d.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/d.js"));
    t.true(!isMatch("a/b/**/*.js", "a/d.js"));
    t.true(!isMatch("a/b/**/*.js", "d.js"));

    t.true(!isMatch("**c", "a/b/c"));
    t.true(!isMatch("a/**c", "a/b/c"));
    t.true(!isMatch("a/**z", "a/b/c"));
    t.true(!isMatch("a/**b**/c", "a/b/c/b/c"));
    t.true(!isMatch("a/b/c**/*.js", "a/b/c/d/e.js"));
    t.true(isMatch("a/**/b/**/c", "a/b/c/b/c"));
    t.true(isMatch("a/**b**/c", "a/aba/c"));
    t.true(isMatch("a/**b**/c", "a/b/c"));
    t.true(isMatch("a/b/c**/*.js", "a/b/c/d.js"));

    t.true(!isMatch("a/**/*", "a"));
    t.true(!isMatch("a/**/**/*", "a"));
    t.true(!isMatch("a/**/**/**/*", "a"));
    t.true(isMatch("**/a", "a/"));
    // t.true ( !isMatch ( "a/**/*", "a/" ) );
    // t.true ( !isMatch ( "a/**/**/*", "a/" ) );
    // t.true ( !isMatch ( "a/**/**/**/*", "a/" ) );
    t.true(!isMatch("**/a", "a/b"));
    t.true(!isMatch("a/**/j/**/z/*.md", "a/b/c/j/e/z/c.txt"));
    t.true(!isMatch("a/**/b", "a/bb"));
    t.true(!isMatch("**/a", "a/c"));
    t.true(!isMatch("**/a", "a/b"));
    t.true(!isMatch("**/a", "a/x/y"));
    t.true(!isMatch("**/a", "a/b/c/d"));
    t.true(isMatch("**", "a"));
    t.true(isMatch("**/a", "a"));
    t.true(isMatch("a/**", "a"));
    t.true(isMatch("**", "a/"));
    t.true(isMatch("**/a/**", "a/"));
    t.true(isMatch("a/**", "a/"));
    t.true(isMatch("a/**/**", "a/"));
    t.true(isMatch("**/a", "a/a"));
    t.true(isMatch("**", "a/b"));
    t.true(isMatch("*/*", "a/b"));
    t.true(isMatch("a/**", "a/b"));
    t.true(isMatch("a/**/*", "a/b"));
    t.true(isMatch("a/**/**/*", "a/b"));
    t.true(isMatch("a/**/**/**/*", "a/b"));
    t.true(isMatch("a/**/b", "a/b"));
    t.true(isMatch("**", "a/b/c"));
    t.true(isMatch("**/*", "a/b/c"));
    t.true(isMatch("**/**", "a/b/c"));
    t.true(isMatch("*/**", "a/b/c"));
    t.true(isMatch("a/**", "a/b/c"));
    t.true(isMatch("a/**/*", "a/b/c"));
    t.true(isMatch("a/**/**/*", "a/b/c"));
    t.true(isMatch("a/**/**/**/*", "a/b/c"));
    t.true(isMatch("**", "a/b/c/d"));
    t.true(isMatch("a/**", "a/b/c/d"));
    t.true(isMatch("a/**/*", "a/b/c/d"));
    t.true(isMatch("a/**/**/*", "a/b/c/d"));
    t.true(isMatch("a/**/**/**/*", "a/b/c/d"));
    t.true(isMatch("a/b/**/c/**/*.*", "a/b/c/d.e"));
    t.true(isMatch("a/**/f/*.md", "a/b/c/d/e/f/g.md"));
    t.true(isMatch("a/**/f/**/k/*.md", "a/b/c/d/e/f/g/h/i/j/k/l.md"));
    t.true(isMatch("a/b/c/*.md", "a/b/c/def.md"));
    t.true(isMatch("a/*/c/*.md", "a/bb.bb/c/ddd.md"));
    t.true(isMatch("a/**/f/*.md", "a/bb.bb/cc/d.d/ee/f/ggg.md"));
    t.true(isMatch("a/**/f/*.md", "a/bb.bb/cc/dd/ee/f/ggg.md"));
    t.true(isMatch("a/*/c/*.md", "a/bb/c/ddd.md"));
    t.true(isMatch("a/*/c/*.md", "a/bbbb/c/ddd.md"));

    t.true(isMatch("foo/bar/**/one/**/*.*", "foo/bar/baz/one/image.png"));
    t.true(isMatch("foo/bar/**/one/**/*.*", "foo/bar/baz/one/two/image.png"));
    t.true(isMatch("foo/bar/**/one/**/*.*", "foo/bar/baz/one/two/three/image.png"));
    t.true(!isMatch("a/b/**/f", "a/b/c/d/"));
    t.true(isMatch("a/**", "a"));
    t.true(isMatch("**", "a"));
    t.true(isMatch("a{,/**}", "a"));
    t.true(isMatch("**", "a/"));
    t.true(isMatch("a/**", "a/"));
    t.true(isMatch("**", "a/b/c/d"));
    t.true(isMatch("**", "a/b/c/d/"));
    t.true(isMatch("**/**", "a/b/c/d/"));
    t.true(isMatch("**/b/**", "a/b/c/d/"));
    t.true(isMatch("a/b/**", "a/b/c/d/"));
    t.true(isMatch("a/b/**/", "a/b/c/d/"));
    t.true(isMatch("a/b/**/c/**/", "a/b/c/d/"));
    t.true(isMatch("a/b/**/c/**/d/", "a/b/c/d/"));
    t.true(isMatch("a/b/**/**/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/c/**/d/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/d/**/*.*", "a/b/c/d/e.f"));
    t.true(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/e.f"));
    t.true(isMatch("a/b/**/d/**/*.*", "a/b/c/d/g/g/e.f"));
    t.true(isMatch("a/b-*/**/z.js", "a/b-c/z.js"));
    t.true(isMatch("a/b-*/**/z.js", "a/b-c/d/e/z.js"));

    t.true(isMatch("*/*", "a/b"));
    t.true(isMatch("a/b/c/*.md", "a/b/c/xyz.md"));
    t.true(isMatch("a/*/c/*.md", "a/bb.bb/c/xyz.md"));
    t.true(isMatch("a/*/c/*.md", "a/bb/c/xyz.md"));
    t.true(isMatch("a/*/c/*.md", "a/bbbb/c/xyz.md"));

    t.true(isMatch("**/*", "a/b/c"));
    t.true(isMatch("**/**", "a/b/c"));
    t.true(isMatch("*/**", "a/b/c"));
    t.true(isMatch("a/**/j/**/z/*.md", "a/b/c/d/e/j/n/p/o/z/c.md"));
    t.true(isMatch("a/**/z/*.md", "a/b/c/d/e/z/c.md"));
    t.true(isMatch("a/**/c/*.md", "a/bb.bb/aa/b.b/aa/c/xyz.md"));
    t.true(isMatch("a/**/c/*.md", "a/bb.bb/aa/bb/aa/c/xyz.md"));
    t.true(!isMatch("a/**/j/**/z/*.md", "a/b/c/j/e/z/c.txt"));
    t.true(!isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/c/xyz.md"));
    t.true(!isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/d/xyz.md"));
    t.true(!isMatch("a/**/", "a/b"));
    t.true(isMatch("**/*", "a/b/.js/c.txt"));
    t.true(!isMatch("a/**/", "a/b/c/d"));
    t.true(!isMatch("a/**/", "a/bb"));
    t.true(!isMatch("a/**/", "a/cb"));
    t.true(isMatch("/**", "/a/b"));
    t.true(isMatch("**/*", "a.b"));
    t.true(isMatch("**/*", "a.js"));
    t.true(isMatch("**/*.js", "a.js"));
    t.true(isMatch("a/**/", "a/"));
    t.true(isMatch("**/*.js", "a/a.js"));
    t.true(isMatch("**/*.js", "a/a/b.js"));
    t.true(isMatch("a/**/b", "a/b"));
    t.true(isMatch("a/**b", "a/b"));
    t.true(isMatch("**/*.md", "a/b.md"));
    t.true(isMatch("**/*", "a/b/c.js"));
    t.true(isMatch("**/*", "a/b/c.txt"));
    t.true(isMatch("a/**/", "a/b/c/d/"));
    t.true(isMatch("**/*", "a/b/c/d/a.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/c/z.js"));
    t.true(isMatch("a/b/**/*.js", "a/b/z.js"));
    t.true(isMatch("**/*", "ab"));
    t.true(isMatch("**/*", "ab/c"));
    t.true(isMatch("**/*", "ab/c/d"));
    t.true(isMatch("**/*", "abc.js"));

    t.true(!isMatch("**/", "a"));
    t.true(!isMatch("**/a/*", "a"));
    t.true(!isMatch("**/a/*/*", "a"));
    t.true(!isMatch("*/a/**", "a"));
    t.true(!isMatch("a/**/*", "a"));
    t.true(!isMatch("a/**/**/*", "a"));
    t.true(!isMatch("**/", "a/b"));
    t.true(!isMatch("**/b/*", "a/b"));
    t.true(!isMatch("**/b/*/*", "a/b"));
    t.true(!isMatch("b/**", "a/b"));
    t.true(!isMatch("**/", "a/b/c"));
    t.true(!isMatch("**/**/b", "a/b/c"));
    t.true(!isMatch("**/b", "a/b/c"));
    t.true(!isMatch("**/b/*/*", "a/b/c"));
    t.true(!isMatch("b/**", "a/b/c"));
    t.true(!isMatch("**/", "a/b/c/d"));
    t.true(!isMatch("**/d/*", "a/b/c/d"));
    t.true(!isMatch("b/**", "a/b/c/d"));
    t.true(isMatch("**", "a"));
    t.true(isMatch("**/**", "a"));
    t.true(isMatch("**/**/*", "a"));
    t.true(isMatch("**/**/a", "a"));
    t.true(isMatch("**/a", "a"));
    t.true(isMatch("**/a/**", "a"));
    t.true(isMatch("a/**", "a"));
    t.true(isMatch("**", "a/b"));
    t.true(isMatch("**/**", "a/b"));
    t.true(isMatch("**/**/*", "a/b"));
    t.true(isMatch("**/**/b", "a/b"));
    t.true(isMatch("**/b", "a/b"));
    t.true(isMatch("**/b/**", "a/b"));
    t.true(isMatch("*/b/**", "a/b"));
    t.true(isMatch("a/**", "a/b"));
    t.true(isMatch("a/**/*", "a/b"));
    t.true(isMatch("a/**/**/*", "a/b"));
    t.true(isMatch("**", "a/b/c"));
    t.true(isMatch("**/**", "a/b/c"));
    t.true(isMatch("**/**/*", "a/b/c"));
    t.true(isMatch("**/b/*", "a/b/c"));
    t.true(isMatch("**/b/**", "a/b/c"));
    t.true(isMatch("*/b/**", "a/b/c"));
    t.true(isMatch("a/**", "a/b/c"));
    t.true(isMatch("a/**/*", "a/b/c"));
    t.true(isMatch("a/**/**/*", "a/b/c"));
    t.true(isMatch("**", "a/b/c/d"));
    t.true(isMatch("**/**", "a/b/c/d"));
    t.true(isMatch("**/**/*", "a/b/c/d"));
    t.true(isMatch("**/**/d", "a/b/c/d"));
    t.true(isMatch("**/b/**", "a/b/c/d"));
    t.true(isMatch("**/b/*/*", "a/b/c/d"));
    t.true(isMatch("**/d", "a/b/c/d"));
    t.true(isMatch("*/b/**", "a/b/c/d"));
    t.true(isMatch("a/**", "a/b/c/d"));
    t.true(isMatch("a/**/*", "a/b/c/d"));
    t.true(isMatch("a/**/**/*", "a/b/c/d"));
  });

  it("utf8", (t) => {
    t.true(isMatch("フ*/**/*", "フォルダ/aaa.js"));
    t.true(isMatch("フォ*/**/*", "フォルダ/aaa.js"));
    t.true(isMatch("フォル*/**/*", "フォルダ/aaa.js"));
    t.true(isMatch("フ*ル*/**/*", "フォルダ/aaa.js"));
    t.true(isMatch("フォルダ/**/*", "フォルダ/aaa.js"));
  });

  it("negation", (t) => {
    t.true(!isMatch("!*", "abc"));
    t.true(!isMatch("!abc", "abc"));
    t.true(!isMatch("*!.md", "bar.md"));
    t.true(!isMatch("foo!.md", "bar.md"));
    t.true(!isMatch("\\!*!*.md", "foo!.md"));
    t.true(!isMatch("\\!*!*.md", "foo!bar.md"));
    t.true(isMatch("*!*.md", "!foo!.md"));
    t.true(isMatch("\\!*!*.md", "!foo!.md"));
    t.true(isMatch("!*foo", "abc"));
    t.true(isMatch("!foo*", "abc"));
    t.true(isMatch("!xyz", "abc"));
    t.true(isMatch("*!*.*", "ba!r.js"));
    t.true(isMatch("*.md", "bar.md"));
    t.true(isMatch("*!*.*", "foo!.md"));
    t.true(isMatch("*!*.md", "foo!.md"));
    t.true(isMatch("*!.md", "foo!.md"));
    t.true(isMatch("*.md", "foo!.md"));
    t.true(isMatch("foo!.md", "foo!.md"));
    t.true(isMatch("*!*.md", "foo!bar.md"));
    t.true(isMatch("*b*.md", "foobar.md"));

    t.true(!isMatch("a!!b", "a"));
    t.true(!isMatch("a!!b", "aa"));
    t.true(!isMatch("a!!b", "a/b"));
    t.true(!isMatch("a!!b", "a!b"));
    t.true(isMatch("a!!b", "a!!b"));
    t.true(!isMatch("a!!b", "a/!!/b"));

    t.true(!isMatch("!a/b", "a/b"));
    t.true(isMatch("!a/b", "a"));
    t.true(isMatch("!a/b", "a.b"));
    t.true(isMatch("!a/b", "a/a"));
    t.true(isMatch("!a/b", "a/c"));
    t.true(isMatch("!a/b", "b/a"));
    t.true(isMatch("!a/b", "b/b"));
    t.true(isMatch("!a/b", "b/c"));

    t.true(!isMatch("!abc", "abc"));
    t.true(isMatch("!!abc", "abc"));
    t.true(!isMatch("!!!abc", "abc"));
    t.true(isMatch("!!!!abc", "abc"));
    t.true(!isMatch("!!!!!abc", "abc"));
    t.true(isMatch("!!!!!!abc", "abc"));
    t.true(!isMatch("!!!!!!!abc", "abc"));
    t.true(isMatch("!!!!!!!!abc", "abc"));

    // t.true ( !isMatch ( "!(*/*)", "a/a" ) );
    // t.true ( !isMatch ( "!(*/*)", "a/b" ) );
    // t.true ( !isMatch ( "!(*/*)", "a/c" ) );
    // t.true ( !isMatch ( "!(*/*)", "b/a" ) );
    // t.true ( !isMatch ( "!(*/*)", "b/b" ) );
    // t.true ( !isMatch ( "!(*/*)", "b/c" ) );
    // t.true ( !isMatch ( "!(*/b)", "a/b" ) );
    // t.true ( !isMatch ( "!(*/b)", "b/b" ) );
    // t.true ( !isMatch ( "!(a/b)", "a/b" ) );
    t.true(!isMatch("!*", "a"));
    t.true(!isMatch("!*", "a.b"));
    t.true(!isMatch("!*/*", "a/a"));
    t.true(!isMatch("!*/*", "a/b"));
    t.true(!isMatch("!*/*", "a/c"));
    t.true(!isMatch("!*/*", "b/a"));
    t.true(!isMatch("!*/*", "b/b"));
    t.true(!isMatch("!*/*", "b/c"));
    t.true(!isMatch("!*/b", "a/b"));
    t.true(!isMatch("!*/b", "b/b"));
    t.true(!isMatch("!*/c", "a/c"));
    t.true(!isMatch("!*/c", "a/c"));
    t.true(!isMatch("!*/c", "b/c"));
    t.true(!isMatch("!*/c", "b/c"));
    t.true(!isMatch("!*a*", "bar"));
    t.true(!isMatch("!*a*", "fab"));
    t.true(isMatch("!a/(*)", "a/a"));
    t.true(isMatch("!a/(*)", "a/b"));
    t.true(isMatch("!a/(*)", "a/c"));
    t.true(isMatch("!a/(b)", "a/b"));
    t.true(!isMatch("!a/*", "a/a"));
    t.true(!isMatch("!a/*", "a/b"));
    t.true(!isMatch("!a/*", "a/c"));
    t.true(!isMatch("!f*b", "fab"));
    t.true(isMatch("!(*/*)", "a"));
    t.true(isMatch("!(*/*)", "a.b"));
    t.true(isMatch("!(*/b)", "a"));
    t.true(isMatch("!(*/b)", "a.b"));
    t.true(isMatch("!(*/b)", "a/a"));
    t.true(isMatch("!(*/b)", "a/c"));
    t.true(isMatch("!(*/b)", "b/a"));
    t.true(isMatch("!(*/b)", "b/c"));
    t.true(isMatch("!(a/b)", "a"));
    t.true(isMatch("!(a/b)", "a.b"));
    t.true(isMatch("!(a/b)", "a/a"));
    t.true(isMatch("!(a/b)", "a/c"));
    t.true(isMatch("!(a/b)", "b/a"));
    t.true(isMatch("!(a/b)", "b/b"));
    t.true(isMatch("!(a/b)", "b/c"));
    t.true(isMatch("!*", "a/a"));
    t.true(isMatch("!*", "a/b"));
    t.true(isMatch("!*", "a/c"));
    t.true(isMatch("!*", "b/a"));
    t.true(isMatch("!*", "b/b"));
    t.true(isMatch("!*", "b/c"));
    t.true(isMatch("!*/*", "a"));
    t.true(isMatch("!*/*", "a.b"));
    t.true(isMatch("!*/b", "a"));
    t.true(isMatch("!*/b", "a.b"));
    t.true(isMatch("!*/b", "a/a"));
    t.true(isMatch("!*/b", "a/c"));
    t.true(isMatch("!*/b", "b/a"));
    t.true(isMatch("!*/b", "b/c"));
    t.true(isMatch("!*/c", "a"));
    t.true(isMatch("!*/c", "a.b"));
    t.true(isMatch("!*/c", "a/a"));
    t.true(isMatch("!*/c", "a/b"));
    t.true(isMatch("!*/c", "b/a"));
    t.true(isMatch("!*/c", "b/b"));
    t.true(isMatch("!*a*", "foo"));
    t.true(isMatch("!a/(*)", "a"));
    t.true(isMatch("!a/(*)", "a.b"));
    t.true(isMatch("!a/(*)", "b/a"));
    t.true(isMatch("!a/(*)", "b/b"));
    t.true(isMatch("!a/(*)", "b/c"));
    t.true(isMatch("!a/(b)", "a"));
    t.true(isMatch("!a/(b)", "a.b"));
    t.true(isMatch("!a/(b)", "a/a"));
    t.true(isMatch("!a/(b)", "a/c"));
    t.true(isMatch("!a/(b)", "b/a"));
    t.true(isMatch("!a/(b)", "b/b"));
    t.true(isMatch("!a/(b)", "b/c"));
    t.true(isMatch("!a/*", "a"));
    t.true(isMatch("!a/*", "a.b"));
    t.true(isMatch("!a/*", "b/a"));
    t.true(isMatch("!a/*", "b/b"));
    t.true(isMatch("!a/*", "b/c"));
    t.true(isMatch("!f*b", "bar"));
    t.true(isMatch("!f*b", "foo"));

    t.true(!isMatch("!.md", ".md"));
    t.true(isMatch("!**/*.md", "a.js"));
    t.true(!isMatch("!**/*.md", "b.md"));
    t.true(isMatch("!**/*.md", "c.txt"));
    t.true(isMatch("!*.md", "a.js"));
    t.true(!isMatch("!*.md", "b.md"));
    t.true(isMatch("!*.md", "c.txt"));
    t.true(!isMatch("!*.md", "abc.md"));
    t.true(isMatch("!*.md", "abc.txt"));
    t.true(!isMatch("!*.md", "foo.md"));
    t.true(isMatch("!.md", "foo.md"));

    t.true(isMatch("!*.md", "a.js"));
    t.true(isMatch("!*.md", "b.txt"));
    t.true(!isMatch("!*.md", "c.md"));
    t.true(!isMatch("!a/*/a.js", "a/a/a.js"));
    t.true(!isMatch("!a/*/a.js", "a/b/a.js"));
    t.true(!isMatch("!a/*/a.js", "a/c/a.js"));
    t.true(!isMatch("!a/*/*/a.js", "a/a/a/a.js"));
    t.true(isMatch("!a/*/*/a.js", "b/a/b/a.js"));
    t.true(isMatch("!a/*/*/a.js", "c/a/c/a.js"));
    t.true(!isMatch("!a/a*.txt", "a/a.txt"));
    t.true(isMatch("!a/a*.txt", "a/b.txt"));
    t.true(isMatch("!a/a*.txt", "a/c.txt"));
    t.true(!isMatch("!a.a*.txt", "a.a.txt"));
    t.true(isMatch("!a.a*.txt", "a.b.txt"));
    t.true(isMatch("!a.a*.txt", "a.c.txt"));
    t.true(!isMatch("!a/*.txt", "a/a.txt"));
    t.true(!isMatch("!a/*.txt", "a/b.txt"));
    t.true(!isMatch("!a/*.txt", "a/c.txt"));

    t.true(isMatch("!*.md", "a.js"));
    t.true(isMatch("!*.md", "b.txt"));
    t.true(!isMatch("!*.md", "c.md"));
    t.true(!isMatch("!**/a.js", "a/a/a.js"));
    t.true(!isMatch("!**/a.js", "a/b/a.js"));
    t.true(!isMatch("!**/a.js", "a/c/a.js"));
    t.true(isMatch("!**/a.js", "a/a/b.js"));
    t.true(!isMatch("!a/**/a.js", "a/a/a/a.js"));
    t.true(isMatch("!a/**/a.js", "b/a/b/a.js"));
    t.true(isMatch("!a/**/a.js", "c/a/c/a.js"));
    t.true(isMatch("!**/*.md", "a/b.js"));
    t.true(isMatch("!**/*.md", "a.js"));
    t.true(!isMatch("!**/*.md", "a/b.md"));
    t.true(!isMatch("!**/*.md", "a.md"));
    t.true(!isMatch("**/*.md", "a/b.js"));
    t.true(!isMatch("**/*.md", "a.js"));
    t.true(isMatch("**/*.md", "a/b.md"));
    t.true(isMatch("**/*.md", "a.md"));
    t.true(isMatch("!**/*.md", "a/b.js"));
    t.true(isMatch("!**/*.md", "a.js"));
    t.true(!isMatch("!**/*.md", "a/b.md"));
    t.true(!isMatch("!**/*.md", "a.md"));
    t.true(isMatch("!*.md", "a/b.js"));
    t.true(isMatch("!*.md", "a.js"));
    t.true(isMatch("!*.md", "a/b.md"));
    t.true(!isMatch("!*.md", "a.md"));
    t.true(isMatch("!**/*.md", "a.js"));
    t.true(!isMatch("!**/*.md", "b.md"));
    t.true(isMatch("!**/*.md", "c.txt"));
  });

  it("question_mark", (t) => {
    t.true(isMatch("?", "a"));
    t.true(!isMatch("?", "aa"));
    t.true(!isMatch("?", "ab"));
    t.true(!isMatch("?", "aaa"));
    t.true(!isMatch("?", "abcdefg"));

    t.true(!isMatch("??", "a"));
    t.true(isMatch("??", "aa"));
    t.true(isMatch("??", "ab"));
    t.true(!isMatch("??", "aaa"));
    t.true(!isMatch("??", "abcdefg"));

    t.true(!isMatch("???", "a"));
    t.true(!isMatch("???", "aa"));
    t.true(!isMatch("???", "ab"));
    t.true(isMatch("???", "aaa"));
    t.true(!isMatch("???", "abcdefg"));

    t.true(!isMatch("a?c", "aaa"));
    t.true(isMatch("a?c", "aac"));
    t.true(isMatch("a?c", "abc"));
    t.true(!isMatch("ab?", "a"));
    t.true(!isMatch("ab?", "aa"));
    t.true(!isMatch("ab?", "ab"));
    t.true(!isMatch("ab?", "ac"));
    t.true(!isMatch("ab?", "abcd"));
    t.true(!isMatch("ab?", "abbb"));
    t.true(isMatch("a?b", "acb"));

    t.true(!isMatch("a/?/c/?/e.md", "a/bb/c/dd/e.md"));
    t.true(isMatch("a/??/c/??/e.md", "a/bb/c/dd/e.md"));
    t.true(!isMatch("a/??/c.md", "a/bbb/c.md"));
    t.true(isMatch("a/?/c.md", "a/b/c.md"));
    t.true(isMatch("a/?/c/?/e.md", "a/b/c/d/e.md"));
    t.true(!isMatch("a/?/c/???/e.md", "a/b/c/d/e.md"));
    t.true(isMatch("a/?/c/???/e.md", "a/b/c/zzz/e.md"));
    t.true(!isMatch("a/?/c.md", "a/bb/c.md"));
    t.true(isMatch("a/??/c.md", "a/bb/c.md"));
    t.true(isMatch("a/???/c.md", "a/bbb/c.md"));
    t.true(isMatch("a/????/c.md", "a/bbbb/c.md"));
  });

  it("braces", (t) => {
    t.true(isMatch("{a,b,c}", "a"));
    t.true(isMatch("{a,b,c}", "b"));
    t.true(isMatch("{a,b,c}", "c"));
    t.true(!isMatch("{a,b,c}", "aa"));
    t.true(!isMatch("{a,b,c}", "bb"));
    t.true(!isMatch("{a,b,c}", "cc"));

    t.true(isMatch("a/{a,b}", "a/a"));
    t.true(isMatch("a/{a,b}", "a/b"));
    t.true(!isMatch("a/{a,b}", "a/c"));
    t.true(!isMatch("a/{a,b}", "b/b"));
    t.true(!isMatch("a/{a,b,c}", "b/b"));
    t.true(isMatch("a/{a,b,c}", "a/c"));
    t.true(isMatch("a{b,bc}.txt", "abc.txt"));

    t.true(isMatch("foo[{a,b}]baz", "foo{baz"));

    t.true(!isMatch("a{,b}.txt", "abc.txt"));
    t.true(!isMatch("a{a,b,}.txt", "abc.txt"));
    t.true(!isMatch("a{b,}.txt", "abc.txt"));
    t.true(isMatch("a{,b}.txt", "a.txt"));
    t.true(isMatch("a{b,}.txt", "a.txt"));
    t.true(isMatch("a{a,b,}.txt", "aa.txt"));
    t.true(isMatch("a{a,b,}.txt", "aa.txt"));
    t.true(isMatch("a{,b}.txt", "ab.txt"));
    t.true(isMatch("a{b,}.txt", "ab.txt"));

    t.true(isMatch("{a/,}a/**", "a"));
    t.true(isMatch("a{a,b/}*.txt", "aa.txt"));
    t.true(isMatch("a{a,b/}*.txt", "ab/.txt"));
    t.true(isMatch("a{a,b/}*.txt", "ab/a.txt"));
    t.true(isMatch("{a/,}a/**", "a/"));
    t.true(isMatch("{a/,}a/**", "a/a/"));
    t.true(isMatch("{a/,}a/**", "a/a"));
    t.true(isMatch("{a/,}a/**", "a/a/a"));
    t.true(isMatch("{a/,}a/**", "a/a/"));
    t.true(isMatch("{a/,}a/**", "a/a/a/"));
    t.true(isMatch("{a/,}b/**", "a/b/a/"));
    t.true(isMatch("{a/,}b/**", "b/a/"));
    t.true(isMatch("a{,/}*.txt", "a.txt"));
    t.true(isMatch("a{,/}*.txt", "ab.txt"));
    t.true(isMatch("a{,/}*.txt", "a/b.txt"));
    t.true(isMatch("a{,/}*.txt", "a/ab.txt"));

    t.true(isMatch("a{,.*{foo,db},\\(bar\\)}.txt", "a.txt"));
    t.true(!isMatch("a{,.*{foo,db},\\(bar\\)}.txt", "adb.txt"));
    t.true(isMatch("a{,.*{foo,db},\\(bar\\)}.txt", "a.db.txt"));

    t.true(isMatch("a{,*.{foo,db},\\(bar\\)}.txt", "a.txt"));
    t.true(!isMatch("a{,*.{foo,db},\\(bar\\)}.txt", "adb.txt"));
    t.true(isMatch("a{,*.{foo,db},\\(bar\\)}.txt", "a.db.txt"));

    t.true(isMatch("a{,.*{foo,db},\\(bar\\)}", "a"));
    t.true(!isMatch("a{,.*{foo,db},\\(bar\\)}", "adb"));
    t.true(isMatch("a{,.*{foo,db},\\(bar\\)}", "a.db"));

    t.true(isMatch("a{,*.{foo,db},\\(bar\\)}", "a"));
    t.true(!isMatch("a{,*.{foo,db},\\(bar\\)}", "adb"));
    t.true(isMatch("a{,*.{foo,db},\\(bar\\)}", "a.db"));

    t.true(!isMatch("{,.*{foo,db},\\(bar\\)}", "a"));
    t.true(!isMatch("{,.*{foo,db},\\(bar\\)}", "adb"));
    t.true(!isMatch("{,.*{foo,db},\\(bar\\)}", "a.db"));
    t.true(isMatch("{,.*{foo,db},\\(bar\\)}", ".db"));

    t.true(!isMatch("{,*.{foo,db},\\(bar\\)}", "a"));
    t.true(isMatch("{*,*.{foo,db},\\(bar\\)}", "a"));
    t.true(!isMatch("{,*.{foo,db},\\(bar\\)}", "adb"));
    t.true(isMatch("{,*.{foo,db},\\(bar\\)}", "a.db"));

    t.true(!isMatch("a/b/**/c{d,e}/**/`xyz.md", "a/b/c/xyz.md"));
    t.true(!isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/d/xyz.md"));
    t.true(isMatch("a/b/**/c{d,e}/**/xyz.md", "a/b/cd/xyz.md"));
    t.true(isMatch("a/b/**/{c,d,e}/**/xyz.md", "a/b/c/xyz.md"));
    t.true(isMatch("a/b/**/{c,d,e}/**/xyz.md", "a/b/d/xyz.md"));
    t.true(isMatch("a/b/**/{c,d,e}/**/xyz.md", "a/b/e/xyz.md"));

    t.true(isMatch("*{a,b}*", "xax"));
    t.true(isMatch("*{a,b}*", "xxax"));
    t.true(isMatch("*{a,b}*", "xbx"));

    t.true(isMatch("*{*a,b}", "xba"));
    t.true(isMatch("*{*a,b}", "xb"));

    t.true(!isMatch("*??", "a"));
    t.true(!isMatch("*???", "aa"));
    t.true(isMatch("*???", "aaa"));
    t.true(!isMatch("*****??", "a"));
    t.true(!isMatch("*****???", "aa"));
    t.true(isMatch("*****???", "aaa"));

    t.true(!isMatch("a*?c", "aaa"));
    t.true(isMatch("a*?c", "aac"));
    t.true(isMatch("a*?c", "abc"));

    t.true(isMatch("a**?c", "abc"));
    t.true(!isMatch("a**?c", "abb"));
    t.true(isMatch("a**?c", "acc"));
    t.true(isMatch("a*****?c", "abc"));

    t.true(isMatch("*****?", "a"));
    t.true(isMatch("*****?", "aa"));
    t.true(isMatch("*****?", "abc"));
    t.true(isMatch("*****?", "zzz"));
    t.true(isMatch("*****?", "bbb"));
    t.true(isMatch("*****?", "aaaa"));

    t.true(!isMatch("*****??", "a"));
    t.true(isMatch("*****??", "aa"));
    t.true(isMatch("*****??", "abc"));
    t.true(isMatch("*****??", "zzz"));
    t.true(isMatch("*****??", "bbb"));
    t.true(isMatch("*****??", "aaaa"));

    t.true(!isMatch("?*****??", "a"));
    t.true(!isMatch("?*****??", "aa"));
    t.true(isMatch("?*****??", "abc"));
    t.true(isMatch("?*****??", "zzz"));
    t.true(isMatch("?*****??", "bbb"));
    t.true(isMatch("?*****??", "aaaa"));

    t.true(isMatch("?*****?c", "abc"));
    t.true(!isMatch("?*****?c", "abb"));
    t.true(!isMatch("?*****?c", "zzz"));

    t.true(isMatch("?***?****c", "abc"));
    t.true(!isMatch("?***?****c", "bbb"));
    t.true(!isMatch("?***?****c", "zzz"));

    t.true(isMatch("?***?****?", "abc"));
    t.true(isMatch("?***?****?", "bbb"));
    t.true(isMatch("?***?****?", "zzz"));

    t.true(isMatch("?***?****", "abc"));
    t.true(isMatch("*******c", "abc"));
    t.true(isMatch("*******?", "abc"));
    t.true(isMatch("a*cd**?**??k", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??k", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??k***", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??***k", "abcdecdhjk"));
    t.true(isMatch("a**?**cd**?**??***k**", "abcdecdhjk"));
    t.true(isMatch("a****c**?**??*****", "abcdecdhjk"));

    t.true(!isMatch("a/?/c/?/*/e.md", "a/b/c/d/e.md"));
    t.true(isMatch("a/?/c/?/*/e.md", "a/b/c/d/e/e.md"));
    t.true(isMatch("a/?/c/?/*/e.md", "a/b/c/d/efghijk/e.md"));
    t.true(isMatch("a/?/**/e.md", "a/b/c/d/efghijk/e.md"));
    t.true(!isMatch("a/?/e.md", "a/bb/e.md"));
    t.true(isMatch("a/??/e.md", "a/bb/e.md"));
    t.true(!isMatch("a/?/**/e.md", "a/bb/e.md"));
    t.true(isMatch("a/?/**/e.md", "a/b/ccc/e.md"));
    t.true(isMatch("a/*/?/**/e.md", "a/b/c/d/efghijk/e.md"));
    t.true(isMatch("a/*/?/**/e.md", "a/b/c/d/efgh.ijk/e.md"));
    t.true(isMatch("a/*/?/**/e.md", "a/b.bb/c/d/efgh.ijk/e.md"));
    t.true(isMatch("a/*/?/**/e.md", "a/bbb/c/d/efgh.ijk/e.md"));

    t.true(isMatch("a/*/ab??.md", "a/bbb/abcd.md"));
    t.true(isMatch("a/bbb/ab??.md", "a/bbb/abcd.md"));
    t.true(isMatch("a/bbb/ab???md", "a/bbb/abcd.md"));
  });

  it("fuzz_tests", (t) => {
    const problem1 =
      "{*{??*{??**,Uz*zz}w**{*{**a,z***b*[!}w??*azzzzzzzz*!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!z[za,z&zz}w**z*z*}";
    t.true(!isMatch(problem1, problem1));

    const problem2 =
      "**** *{*{??*{??***\u{5} *{*{??*{??***\u{5},\0U\0}]*****\u{1},\0***\0,\0\0}w****,\0U\0}]*****\u{1},\0***\0,\0\0}w*****\u{1}***{}*.*\0\0*\0";
    t.true(!isMatch(problem2, problem2));
  });
});
