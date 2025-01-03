import { dirname, resolve } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { defineBuildConfig } from "unbuild";
import { build, type BuildOptions, transform } from "esbuild";

export default defineBuildConfig({
  hooks: {
    async "build:before"(ctx) {
      ctx.options.alias["minimatch"] = await buildMinimatch();
    },
  },
});

async function buildMinimatch() {
  let bundle = await build(<BuildOptions>{
    format: "iife",
    globalName: "__lib__",
    bundle: true,
    write: false,
    stdin: {
      resolveDir: process.cwd(),
      contents: /* js */ `export { minimatch } from "minimatch";`,
    },
  }).then((r) => r.outputFiles![0].text);

  bundle = bundle
    .replace("options.debug", "false")
    .replace(/ this\.debug\(/gm, " // this.debug(");

  bundle = (await transform(bundle, { minify: true })).code!;

  bundle = /* js */ `
let _lazyMinimatch = () => { ${bundle}; return __lib__; };
let _minimatch;
export const minimatch = (path, pattern, opts) => {
  if (!_minimatch) {
    _minimatch = _lazyMinimatch();
    _lazyMinimatch = null;
  }
  return _minimatch.minimatch(path, pattern, opts);
};
  `;

  const outFile = resolve("tmp/node_modules/minimatch/minimatch.min.mjs");
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, bundle);
  return outFile;
}
