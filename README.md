# `path-class`

A semantic `Path` class for `node` and `bun`. Inspired by `bun`'s [`file(…)`](https://bun.com/docs/runtime/file-io) API, but `node`-compatible.

## Usage examples

````ts usage
import { PrintableShellCommand } from "printable-shell-command";
import { Path } from "path-class";

// Traverse files
console.log(new Path("foo/bar").parent.join("baz.txt").path);

// Functions on files
console.log(await new Path("./src").readDir());

// Read text
const knownHosts = await Path.homedir.join(".ssh/known_hosts").readText();
console.log(knownHosts);

// Resolve paths
const distDir = Path.resolve("../dist", import.meta.url);
console.log(`Building to: ${distDir}`);

// Get XDG dirs, read JSON with fallback, write JSON
const info = Path.xdg.data.join("my-tool/info.json");
const config: { counter?: number } = await info.readJSON({ fallback: {} });
config.counter = (config.counter ?? 0) + 1;
await info.writeJSON(config);

{
  // Extensive example: create temp dirs and files, fetch into path, chaining,
  // spawn subprocess, read JSON, and clean up.
  //
  // In this case the GitHub API supports direct file download, and you could
  // unzip in memory. However, the steps are a good illustration of diverse tasks
  // in a typical script.
  await using tempDir = await Path.makeTempDir();
  const zipFile = await tempDir.join("file.zip").write(fetch("https://github.com/lgarron/path-class/archive/refs/tags/v0.7.2.zip"));
  await new PrintableShellCommand("unzip", [zipFile]).shellOut({ cwd: tempDir });
  const packageJSON = await tempDir.join("path-class-0.7.2/package.json").readJSON();
  console.log(packageJSON.exports);
  // `tempDir` will be deleted from disk here, due to `await using` above.
}
````

## Differences from `node` functions

This implementation differs from similar functions in `node` in a few ways:

- Function names are more clear where possible.
- Writing to a file creates intermediate directories by default.
- `.mkdir(…)` creates intermediate directories by default.
- `.rm_rf(…)` is provided as an explicit function as a convenience.
- Async `.exists(…)` is implemented. Go knock yourself out with race conditions.
- `.exists(…)` has options/variants to ensure the existing path is a dir/file.
- Supported in packages like [`printable-shell-command`](https://github.com/lgarron/printable-shell-command) and [`lockfile-mutex`](https://github.com/lgarron/lockfile-mutex).

Also note:

- `Path` sometimes uses a the presence of a trailing slash `/` to disallow file-specific operations on directory paths.
- `Path` preserves relative resolution prefixes like `.` and `..`. For example, `new Path("./@biomejs/biome")` is *not* the same as `new Path("@biomejs/biome")`.
