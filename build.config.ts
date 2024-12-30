import { resolve } from "node:path";
import { defineBuildConfig } from "unbuild";
import { build } from "esbuild";

export default defineBuildConfig({
  rollup: {
    inlineDependencies: true,
  },
  hooks: {
    async "build:before"(ctx) {
      await build({
        format: "esm",
        bundle: true,
        minify: true,
        outfile: resolve("minimalist.min.mjs"),
        stdin: {
          resolveDir: process.cwd(),
          contents: `export { minimatch } from "minimatch";`,
        },
      });

      ctx.options.alias["minimatch"] = resolve("minimalist.min.mjs");
    },
  },
});
