import { describe, expect, it } from "vitest";

import { normalizeAliases, filename, resolveAlias, reverseResolveAlias } from "../src/utils";

describe("alias", () => {
  const _aliases = {
    "@foo/bar": "@foo/bar/dist/index.mjs",
    "@foo/bar/utils": "@foo/bar/dist/utils.mjs",
    "@": "/root",
    bingpot: "@/bingpot/index.ts",
    test: "@bingpot/index.ts",
    "~": "/root/index.js",
    "~/": "/src",
    "~win": "C:/root/index.js",
    "~win/": "C:/src",
  };
  const aliases = normalizeAliases(_aliases);

  it("normalizeAliases", () => {
    expect(aliases).toMatchInlineSnapshot(`
      {
        "@": "/root",
        "@foo/bar": "@foo/bar/dist/index.mjs",
        "@foo/bar/utils": "@foo/bar/dist/utils.mjs",
        "bingpot": "/root/bingpot/index.ts",
        "test": "@bingpot/index.ts",
        "~": "/root/index.js",
        "~/": "/src",
        "~win": "C:/root/index.js",
        "~win/": "C:/src",
      }
    `);
  });

  it.each([
    ["@/", "/root", "/root/app"],
    ["@", "/root/", "/root/app"],
    ["@", "/", "/app"],
    ["@/", "/", "/app"],
    ["@/", "C:\\root\\", "C:/root/app"],
    ["@", "C:\\root\\", "C:/root/app"],
  ])("normalizes nested aliases through %s -> %s", (alias, target, expected) => {
    const aliases = { [alias]: target, app: "@/app" };

    expect(normalizeAliases(aliases).app).toBe(expected);
    expect(resolveAlias("app/main.ts", aliases)).toBe(`${expected}/main.ts`);
    expect(reverseResolveAlias(`${expected}/main.ts`, aliases)).toContain("app/main.ts");
    expect(aliases.app).toBe("@/app");
  });

  it("normalizes nested aliases with windows backslash separator", () => {
    const aliases = { "@": "/root", app: "@\\app" };
    expect(normalizeAliases(aliases).app).toBe("/root/app");
  });

  it("normalizes nested aliases containing relative dot segments", () => {
    const aliases = {
      entry: "mid/../file",
      mid: "base",
      base: "/root/dir",
    };
    expect(normalizeAliases(aliases).entry).toBe("/root/file");
    expect(resolveAlias("entry/main.ts", aliases)).toBe("/root/file/main.ts");
    expect(resolveAlias("entry", aliases)).toBe("/root/file");
    expect(reverseResolveAlias("/root/file/main.ts", aliases)).toContain("entry/main.ts");
  });

  it("normalizes relative target with dot segments while preserving relative prefix", () => {
    const aliases = {
      pkg: "./src/components/../utils",
      up: "./../utils",
    };
    expect(normalizeAliases(aliases)).toMatchObject({
      pkg: "./src/utils",
      up: "../utils",
    });
  });

  it("handles empty alias target during nested alias resolution", () => {
    const aliases = { "@": "", app: "@/app" };
    expect(normalizeAliases(aliases).app).toBe("/app");
  });

  describe("resolveAlias", () => {
    for (const [from, to] of Object.entries(aliases)) {
      it(from, () => {
        expect(resolveAlias(from, aliases)).toBe(to);
      });
    }
    it("respects path separators", () => {
      const aliases = {
        "~": "/root",
        "~assets": "/root/some/dir",
      };
      expect(resolveAlias("~assets/smth.jpg", aliases)).toMatchInlineSnapshot(
        '"/root/some/dir/smth.jpg"',
      );
    });
    it("unchanged", () => {
      expect(resolveAlias("foo/bar.js", aliases)).toBe("foo/bar.js");
      expect(resolveAlias("./bar.js", aliases)).toBe("./bar.js");
    });
    it("respect ending with /", () => {
      expect(resolveAlias("~/foo/bar", aliases)).toBe("/src/foo/bar");
      expect(resolveAlias("~win/foo/bar", aliases)).toBe("C:/src/foo/bar");
    });
  });

  describe("reverseResolveAlias", () => {
    const overrides = {
      "/root/bingpot/index.ts": ["@/bingpot/index.ts", "bingpot"],
      "/root/index.js": ["@/index.js", "~"],
    };
    for (const [to, from] of Object.entries(aliases)) {
      const expected = overrides[from as keyof typeof overrides] || [to];
      it(`reverseResolveAlias("${from}")`, () => {
        expect(reverseResolveAlias(from, aliases)).toMatchObject(expected);
      });
    }

    it("respects path separators", () => {
      const aliases = {
        "~": "/root",
        "~assets": "/root/some/assets",
      };
      expect(reverseResolveAlias("/root/some/assets/smth.jpg", aliases)).toMatchObject([
        "~/some/assets/smth.jpg",
        "~assets/smth.jpg",
      ]);
    });

    it("no match", () => {
      expect(reverseResolveAlias("foo/bar.js", aliases)).toMatchObject([]);
      expect(reverseResolveAlias("./bar.js", aliases)).toMatchObject([]);
    });

    it("respect ending with /", () => {
      expect(reverseResolveAlias("/src/foo/bar", aliases)).toMatchObject(["~/foo/bar"]);
      expect(reverseResolveAlias("C:/src/foo/bar", aliases)).toMatchObject(["~win/foo/bar"]);
    });
  });
});

describe("filename", () => {
  const files = {
    // POSIX
    "test.html": "test",
    "/temp/myfile.html": "myfile",
    "./myfile.html": "myfile",
    "/Users/john.doe/foo/myFile.js": "myFile",
    "/Users/john.doe/foo/myFile": "myFile",
    "./.hidden/myFile.ts": "myFile",
    "./.hidden/myFile": "myFile",
    "/temp/.gitignore": ".gitignore",
    "./foo.bar.baz.js": "foo.bar.baz",

    // Windows
    "C:\\temp\\": undefined,
    "C:\\temp\\myfile.html": "myfile",
    "\\temp\\myfile.html": "myfile",
    ".\\myfile.html": "myfile",
    ".\\john.doe\\myfile.js": "myfile",
    ".\\john.doe\\myfile": "myfile",
    ".\\.hidden\\myfile.js": "myfile",
    ".\\.hidden\\myfile": "myfile",
    "C:\\temp\\.gitignore": ".gitignore",
    "C:\\temp\\foo.bar.baz.js": "foo.bar.baz",
  };
  for (const file in files) {
    it(file, () => {
      expect(filename(file)).toEqual(files[file as keyof typeof files]);
    });
  }
});
