// Ported from the Node.js core test `test/parallel/test-path-glob.js`:
//   https://github.com/nodejs/node/blob/main/test/parallel/test-path-glob.js
//
// Node's `path.matchesGlob()` delegates to a vendored copy of `minimatch`
// (`internal/fs/glob` -> `internal/deps/minimatch`). pathe ships its own matcher
// and normalizes every path to posix, so backslash-separated win32 globs that
// rely on minimatch treating `\` as a path separator diverge: pathe treats a
// backslash in the *pattern* as an escape, so `foo\[bcr]ar` becomes a literal
// `[bcr]` rather than a character class. Those cases are marked `it.todo`.
//
// The two win32 cases that Node expects to *not* match (`false`) happen to also
// not match under pathe, so they are ported as-is.
import { describe, it, expect } from "vitest";

import { matchesGlob } from "../src/index";

// [path, glob, expected, todo?] — `todo` flags cases where pathe's posix-only
// matcher diverges from Node's minimatch result.
type Case = [path: string, glob: string, expected: boolean, todo?: boolean];

const globs: Record<"win32" | "posix", Case[]> = {
  win32: [
    ["foo\\bar\\baz", "foo\\[bcr]ar\\baz", true, true], // 'bar' or 'car'
    ["foo\\bar\\baz", "foo\\[!bcr]ar\\baz", false], // anything except 'bar'/'car'
    ["foo\\bar\\baz", "foo\\[bc-r]ar\\baz", true, true], // 'bar'/'car' via range
    ["foo\\bar\\baz", "foo\\*\\!bar\\*\\baz", false], // 'foo'..'baz' but not 'bar'
    ["foo\\bar1\\baz", "foo\\bar[0-9]\\baz", true, true], // 'bar' + digit
    ["foo\\bar5\\baz", "foo\\bar[0-9]\\baz", true, true], // 'bar' + digit
    ["foo\\barx\\baz", "foo\\bar[a-z]\\baz", true, true], // 'bar' + lowercase
    ["foo\\bar\\baz\\boo", "foo\\[bc-r]ar\\baz\\*", true, true], // 'bar'/'car'
    ["foo\\bar\\baz", "foo/**", true], // anything under 'foo'
    ["foo\\bar\\baz", "*", false], // no match
  ],
  posix: [
    ["foo/bar/baz", "foo/[bcr]ar/baz", true], // 'bar' or 'car'
    ["foo/bar/baz", "foo/[!bcr]ar/baz", false], // anything except 'bar'/'car'
    ["foo/bar/baz", "foo/[bc-r]ar/baz", true], // 'bar'/'car' via range
    ["foo/bar/baz", "foo/*/!bar/*/baz", false], // 'foo'..'baz' but not 'bar'
    ["foo/bar1/baz", "foo/bar[0-9]/baz", true], // 'bar' + digit
    ["foo/bar5/baz", "foo/bar[0-9]/baz", true], // 'bar' + digit
    ["foo/barx/baz", "foo/bar[a-z]/baz", true], // 'bar' + lowercase
    ["foo/bar/baz/boo", "foo/[bc-r]ar/baz/*", true], // 'bar'/'car'
    ["foo/bar/baz", "foo/**", true], // anything under 'foo'
    ["foo/bar/baz", "*", false], // no match
  ],
};

for (const [platform, cases] of Object.entries(globs)) {
  describe(`node:path matchesGlob (${platform})`, () => {
    for (const [path, glob, expected, todo] of cases) {
      const title = `${JSON.stringify(path)} ${expected ? "matches" : "does not match"} ${JSON.stringify(glob)}`;
      if (todo) {
        // Diverges from Node/minimatch — see file header.
        it.todo(title);
      } else {
        it(title, () => {
          expect(matchesGlob(path, glob)).toBe(expected);
        });
      }
    }
  });
}

describe("node:path matchesGlob (non-string input)", () => {
  // Node throws a TypeError whose message matches /must be of type string/.
  // pathe also throws a TypeError, but with a different message, so the exact
  // assertion is marked todo.
  it.todo("throws for a non-string path");
  it.todo("throws for a non-string pattern");

  // What pathe actually does today: still throws (just not the Node message).
  it("throws (some error) for a non-string path", () => {
    // @ts-expect-error intentionally passing a non-string
    expect(() => matchesGlob(123, "foo/bar/baz")).toThrow();
  });
  it("throws (some error) for a non-string pattern", () => {
    // @ts-expect-error intentionally passing a non-string
    expect(() => matchesGlob("foo/bar/baz", 123)).toThrow();
  });
});
