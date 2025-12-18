
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

// Extensive example: create temp dirs and files, fetch into path, chaining,
// spawn subprocess, read JSON, and clean up.
//
// In this case the GitHub API supports direct file download, and you could
// unzip in memory. However, the steps are a good illustration of diverse tasks
// in a typical script.
const tempDir = await Path.makeTempDir();
const zipFile = await tempDir.join("file.zip").write(fetch("https://github.com/lgarron/path-class/archive/refs/tags/v0.7.2.zip"));
await new PrintableShellCommand("unzip", [zipFile]).shellOut({ cwd: tempDir });
const packageJSON = await tempDir.join("path-class-0.7.2/package.json").readJSON();
console.log(packageJSON.exports);
await tempDir.rm_rf();
