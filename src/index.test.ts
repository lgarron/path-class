import { expect, test } from "bun:test";
import { Path } from ".";

test("constructor", async () => {
  expect(new Path("foo").toString()).toEqual("foo");
  expect(new Path("./relative").toString()).toEqual("relative");
  expect(new Path("./relative/nested").toString()).toEqual("relative/nested");
  expect(new Path("/absolute").toString()).toEqual("/absolute");
  expect(new Path("/absolute/nested").toString()).toEqual("/absolute/nested");
  expect(new Path("trailing/slash/").toString()).toEqual("trailing/slash/");
});

test("normalize", async () => {
  expect(new Path("foo//bar").toString()).toEqual("foo/bar");
  expect(new Path("foo////bar").toString()).toEqual("foo/bar");
  expect(new Path("foo/bar/").toString()).toEqual("foo/bar/");
  expect(new Path("foo/bar//").toString()).toEqual("foo/bar/");
  expect(new Path("//absolute////bar").toString()).toEqual("/absolute/bar");
});

test("join", async () => {
  expect(new Path("foo").join("bar").toString()).toEqual("foo/bar");
  expect(new Path("foo/bar").join("bath", "kitchen/sink").toString()).toEqual(
    "foo/bar/bath/kitchen/sink",
  );
});

test("traverse", async () => {
  expect(new Path("foo/bar").join("..").toString()).toEqual("foo");
  expect(new Path("foo/bar").join(".").toString()).toEqual("foo/bar");
  expect(new Path("foo/bar").join("../baz").toString()).toEqual("foo/baz");
  expect(new Path("/absolute/path").join("../..").toString()).toEqual("/");
  expect(new Path("/absolute/path").join("../../..").toString()).toEqual("/");
  expect(new Path("/").join("..").toString()).toEqual("/");
});

test(".extendBasename(…)", async () => {
  expect(
    new Path("file.mp4").extendBasename(".hevc.qv65.mov").toString(),
  ).toEqual("file.mp4.hevc.qv65.mov");
  // Trailing dots should not be removed.
  expect(
    new Path("file.mp4.").extendBasename(".hevc.qv65.mov").toString(),
  ).toEqual("file.mp4..hevc.qv65.mov");
});

test(".parent()", async () => {
  expect(new Path("/").parent.toString()).toEqual("/");
  expect(new Path("dir").parent.toString()).toEqual(".");
  expect(new Path("dir/").parent.toString()).toEqual(".");
  // Trailing dots should not be removed
});

test("homedir", async () => {
  expect(Path.homedir.toString()).toEqual("/mock/home/dir");
});

test("XDG", async () => {
  expect(Path.xdg.cache.toString()).toEqual("/mock/home/dir/.cache");
  expect(Path.xdg.config.toString()).toEqual("/xdg/config");
  expect(Path.xdg.data.toString()).toEqual("/mock/home/dir/.local/share");
  expect(Path.xdg.state.toString()).toEqual("/mock/home/dir/.local/state");
});
