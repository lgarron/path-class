import { afterAll, mock } from "bun:test";
import assert from "node:assert";
import { mkdtemp, rmdir } from "node:fs/promises";
import nodeOS, { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "node:process";
import { ErgonomicDate } from "ergonomic-date";

const MOCK_TEMP_DIR_ENV_VAR = "MOCK_TEMP_DIR";

const mockTempDir = await (async () => {
  if (MOCK_TEMP_DIR_ENV_VAR in env) {
    const tempDir = env[MOCK_TEMP_DIR_ENV_VAR];
    assert(tempDir);
    console.log(
      `Using the specificed mock temp dir from the \`${MOCK_TEMP_DIR_ENV_VAR}\` env var: ${tempDir}`,
    );
    return tempDir;
  } else {
    const mockTempDir = await mkdtemp(
      join(
        tmpdir(),
        `path-class-mock-temp-dir-${new ErgonomicDate().multipurposeTimestamp}-`,
      ),
    );
    console.log(
      `Using a mock temp dir inside the main temp dir: ${mockTempDir}`,
    );

    afterAll(async () => {
      // If this fails, one of the tests hasn't cleaned up after itself properly.
      await rmdir(mockTempDir);
    });
    return mockTempDir;
  }
})();

const nodeOSMocked = {
  ...nodeOS,
  homedir: () => "/mock/home/dir",
  tmpdir: () => mockTempDir,
};

// biome-ignore lint/suspicious/noExplicitAny: This isn't worth wrangling types for.
(nodeOSMocked as any).default = nodeOSMocked; // Needed because `xdg-basedir` imports the default.

mock.module("node:os", () => {
  return nodeOSMocked;
});

mock.module("os", () => {
  return nodeOSMocked;
});

process.env = { XDG_CONFIG_HOME: "/xdg/config" };
