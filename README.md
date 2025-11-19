# `path-class`

A semantic `Path` class for `node` and `bun`. Inspired by `bun`'s [`file(…)`](https://bun.com/docs/runtime/file-io) API, but `node`-compatible.

## Usage examples

````ts cli-help
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

// Get XDG dirs, read JSON
const configPath = Path.xdg.config.join("my-tool/config.json");
const config: { foo?: number } = (await configPath.existsAsFile())
  ? await configPath.readJSON()
  : {};
console.log(config);

// Create temp dirs and files
const tempDir = await Path.makeTempDir();
await tempDir.join("file.txt").write("temporary data");
tempDir.rm_rf();
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
