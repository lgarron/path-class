import { default as assert } from "node:assert";
import { exit } from "node:process";
import { Path } from "path-class";

const EXPECTED_NUM_FILES = 4;

const root = Path.resolve("../src/sync", import.meta.url);
// TODO: Can we do something like `git ls-tree -r --name-only HEAD src/sync` that also works with `jj`? Should we filter by extension? Should we hardcode to `.ts`?
const paths = (await root.readDir()).filter((path) => path !== ".DS_Store");

assert.equal(paths.length, EXPECTED_NUM_FILES);

let exitCode = 0;

for (const pathString of paths) {
  const path = root.join(pathString);
  const text = await path.readText();
  const lines = text.split("\n");
  for (const [lineIndex, line] of lines.entries()) {
    const expectError = line.endsWith("// lint-sync-code-expect-error");
    let foundError = false;
    function fileLinePath() {
      return `${path}:${lineIndex + 1}`;
    }
    for (const keyword of ["async", "await", "Promise"]) {
      // We don't check for word boundaries — false positives are okay.
      const columnIndex = line.indexOf(keyword);
      if (columnIndex === -1) {
        continue;
      }

      if (text.includes(keyword)) {
        foundError = true;
        if (!expectError) {
          console.error(
            `Sync code contains keyword \`${keyword}\`: ${fileLinePath()}:${columnIndex + 1}-${columnIndex + 1 + keyword.length}`,
          );
          exitCode = 1;
        }
      }
    }
    if (expectError && !foundError) {
      console.error(`Expected error but did not find one: ${fileLinePath()}`);
      exitCode = 1;
    }
  }
}

exit(exitCode);
