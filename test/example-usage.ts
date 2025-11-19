import { spawn } from "node:child_process";
import { Readable } from "node:stream";
import { Path } from "../src";

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
const config: { counter: number } = await info.readJSON({
  fallback: { counter: 0 },
});
config.counter++;
await info.writeJSON(config);

// Create temp dirs and files
const tempDir = await Path.makeTempDir();
await tempDir.join("file.txt").write("temporary data");
tempDir.rm_rf();
