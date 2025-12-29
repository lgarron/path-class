import { mock } from "bun:test";
import { mkdtemp } from "node:fs/promises";
import nodeOS, { tmpdir } from "node:os";
import { join } from "node:path";
import { env } from "node:process";
import { ErgonomicDate } from "ergonomic-date";

const mockTempDir = await (async () => {
  const { MOCK_TEMP_DIR } = env;
  if (MOCK_TEMP_DIR) {
    console.log(`Using the specificed mock temp dir: ${MOCK_TEMP_DIR}`);
    return MOCK_TEMP_DIR;
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
