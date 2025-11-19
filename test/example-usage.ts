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
