import { dirname, resolve } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import { defineBuildConfig } from "unbuild";
import { build, type BuildOptions, transform } from "esbuild";

export default defineBuildConfig({
  hooks: {
    async "build:before"(ctx) {
      ctx.options.alias["zeptomatch"] = await buildZeptomatch();
    },
  },
});

async function buildZeptomatch() {
  let bundle = await build(<BuildOptions>{
    format: "iife",
    globalName: "__lib__",
    bundle: true,
    write: false,
    stdin: {
      resolveDir: process.cwd(),
      contents: /* js */ `export { default } from "zeptomatch";`,
    },
  }).then((r) => r.outputFiles![0].text);

  bundle = (await transform(bundle, { minify: true })).code!;

  bundle = /* js */ `
let _lazyMatch = () => { ${bundle}; return __lib__.default || __lib__; };
let _match;
export default (path, pattern) => {
  if (!_match) {
    _match = _lazyMatch();
    _lazyMatch = null;
  }
  return _match(path, pattern);
};
  `;

  const outFile = resolve("tmp/node_modules/zeptomatch/zeptomatch.min.mjs");
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, bundle);
  return outFile;
}
