import { resolve } from "node:path";
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
    format: "esm",
    bundle: true,
    minify: !true,
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

  const outFile = resolve("tmp/minimatch.min.mjs");
  await mkdir("tmp", { recursive: true });
  await writeFile(outFile, bundle);
  return outFile;
}
