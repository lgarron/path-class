import { es2022Lib } from "@cubing/dev-config/esbuild/es2022";
import { build } from "esbuild";

await build({
  ...es2022Lib(),
  entryPoints: ["./src/index.ts"],
  outdir: "./dist/lib/path-class/",
});
