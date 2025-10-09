import { mock } from "bun:test";
import nodeOS from "node:os";

const nodeOSMocked = {
  ...nodeOS,
  homedir: () => "/mock/home/dir",
};
// biome-ignore lint/suspicious/noExplicitAny: This isn't worth wrangling types for.
(nodeOSMocked as any).default = nodeOSMocked;

mock.module("node:os", () => {
  return nodeOSMocked;
});

mock.module("os", () => {
  return nodeOSMocked;
});

process.env = { XDG_CONFIG_HOME: "/xdg/config" };
