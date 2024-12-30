import { resolve } from "node:path";
import { defineBuildConfig } from "unbuild";
import { build, type BuildOptions } from "esbuild";

export default defineBuildConfig({
  hooks: {
    async "build:before"(ctx) {
      await build(<BuildOptions>{
        format: "esm",
        bundle: true,
        minify: true,
        outfile: resolve("tmp/minimatch.min.mjs"),
        stdin: {
          resolveDir: process.cwd(),
          contents: `export { minimatch } from "minimatch";`,
        },
      });
      ctx.options.alias["minimatch"] = resolve("tmp/minimatch.min.mjs");
    },
  },
});
