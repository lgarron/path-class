import { expect, test } from "bun:test";
import { Path } from "./Path";
import { stringifyIfPath } from "./stringifyfIfPath";

test.concurrent(".stringifyIfPath(…)", async () => {
  expect(stringifyIfPath(Path.homedir)).toBe("/mock/home/dir");
  expect(stringifyIfPath("/mock/home/dir")).toBe("/mock/home/dir");
  expect(stringifyIfPath(4)).toBe(4);
});
