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

test(".parent", async () => {
  expect(new Path("/").parent.toString()).toEqual("/");
  expect(new Path("dir").parent.toString()).toEqual(".");
  expect(new Path("dir/").parent.toString()).toEqual(".");
});

test(".dirname", async () => {
  expect(new Path("/").dirname.toString()).toEqual("/");
  expect(new Path("dir").dirname.toString()).toEqual(".");
  expect(new Path("dir/").dirname.toString()).toEqual(".");
});

test(".basename", async () => {
  expect(new Path("/").basename.toString()).toEqual("."); // TODO?
  expect(new Path("dir").basename.toString()).toEqual("dir");
  expect(new Path("dir/").basename.toString()).toEqual("dir");
  expect(Path.xdg.config.join("foo/bar.json").basename.toString()).toEqual(
    "bar.json",
  );
});

test(".extension", async () => {
  expect(new Path("foo.txt").extension).toEqual(".txt");
  expect(new Path("foo.").extension).toEqual(".");
  expect(new Path("foo").extension).toEqual("");
  expect(() => new Path("dir/").extension).toThrow();
  expect(() => new Path("/").extension).toThrow();
});

test(".extname", async () => {
  expect(new Path("foo.txt").extname).toEqual(".txt");
  expect(new Path("foo.").extname).toEqual(".");
  expect(new Path("foo").extname).toEqual("");
  expect(() => new Path("dir/").extname).toThrow();
  expect(() => new Path("/").extname).toThrow();
});

test(".existsAsFile()", async () => {
  const filePath = (await Path.makeTempDir()).join("file.txt");
  expect(await filePath.exists()).toBe(false);
  expect(await filePath.exists({ mustBe: "file" })).toBe(false);
  expect(await filePath.exists({ mustBe: "directory" })).toBe(false);
  expect(await filePath.existsAsFile()).toBe(false);
  await filePath.write("test");
  expect(await filePath.exists()).toBe(true);
  expect(await filePath.exists({ mustBe: "file" })).toBe(true);
  expect(() => filePath.exists({ mustBe: "directory" })).toThrow(
    /Path exists but is not a directory/,
  );
  expect(await filePath.existsAsFile()).toBe(true);
});

test(".existsAsDir()", async () => {
  const filePath = await Path.makeTempDir();
  expect(await filePath.exists()).toBe(true);
  expect(() => filePath.exists({ mustBe: "file" })).toThrow(
    /Path exists but is not a file/,
  );
  expect(await filePath.exists({ mustBe: "directory" })).toBe(true);
  expect(await filePath.existsAsDir()).toBe(true);
  await filePath.trash();
  expect(await filePath.exists()).toBe(false);
  expect(await filePath.exists({ mustBe: "file" })).toBe(false);
  expect(await filePath.exists({ mustBe: "directory" })).toBe(false);
  expect(await filePath.existsAsDir()).toBe(false);
});

test("mkdir (un-nested)", async () => {
  const dir = (await Path.makeTempDir()).join("mkdir-test");
  expect(await dir.exists()).toBe(false);
  await dir.mkdir();
  expect(await dir.exists()).toBe(true);
});

test("mkdir (nested)", async () => {
  const dir = (await Path.makeTempDir()).join("mkdir-test/nested");
  expect(await dir.exists()).toBe(false);
  expect(() => dir.mkdir({ recursive: false })).toThrow("no such file");
  await dir.mkdir();
  expect(await dir.exists()).toBe(true);
});

test("trash", async () => {
  const tempDir = await Path.makeTempDir();
  expect(tempDir.toString()).toContain("/js-temp-");
  expect(await tempDir.exists()).toBe(true);
  await tempDir.trash();
  expect(await tempDir.exists()).toBe(false);
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
