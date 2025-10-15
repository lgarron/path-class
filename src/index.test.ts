import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Path } from ".";

test("constructor", async () => {
  expect(new Path("foo").path).toEqual("foo");
  expect(new Path("./relative").path).toEqual("relative");
  expect(new Path("./relative/nested").path).toEqual("relative/nested");
  expect(new Path("/absolute").path).toEqual("/absolute");
  expect(new Path("/absolute/nested").path).toEqual("/absolute/nested");
  expect(new Path("trailing/slash/").path).toEqual("trailing/slash/");
});

test("normalize", async () => {
  expect(new Path("foo//bar").path).toEqual("foo/bar");
  expect(new Path("foo////bar").path).toEqual("foo/bar");
  expect(new Path("foo/bar/").path).toEqual("foo/bar/");
  expect(new Path("foo/bar//").path).toEqual("foo/bar/");
  expect(new Path("//absolute////bar").path).toEqual("/absolute/bar");
});

test("join", async () => {
  expect(new Path("foo").join("bar").path).toEqual("foo/bar");
  expect(new Path("foo/bar").join("bath", "kitchen/sink").path).toEqual(
    "foo/bar/bath/kitchen/sink",
  );
});

test("traverse", async () => {
  expect(new Path("foo/bar").join("..").path).toEqual("foo");
  expect(new Path("foo/bar").join(".").path).toEqual("foo/bar");
  expect(new Path("foo/bar").join("../baz").path).toEqual("foo/baz");
  expect(new Path("/absolute/path").join("../..").path).toEqual("/");
  expect(new Path("/absolute/path").join("../../..").path).toEqual("/");
  expect(new Path("/").join("..").path).toEqual("/");
});

test(".extendBasename(…)", async () => {
  expect(new Path("file.mp4").extendBasename(".hevc.qv65.mov").path).toEqual(
    "file.mp4.hevc.qv65.mov",
  );
  // Trailing dots should not be removed.
  expect(new Path("file.mp4.").extendBasename(".hevc.qv65.mov").path).toEqual(
    "file.mp4..hevc.qv65.mov",
  );
});

test(".parent", async () => {
  expect(new Path("/").parent.path).toEqual("/");
  expect(new Path("dir").parent.path).toEqual(".");
  expect(new Path("dir/").parent.path).toEqual(".");
});

test(".dirname", async () => {
  expect(new Path("/").dirname.path).toEqual("/");
  expect(new Path("dir").dirname.path).toEqual(".");
  expect(new Path("dir/").dirname.path).toEqual(".");
});

test(".basename", async () => {
  expect(new Path("/").basename.path).toEqual("."); // TODO?
  expect(new Path("dir").basename.path).toEqual("dir");
  expect(new Path("dir/").basename.path).toEqual("dir");
  expect(Path.xdg.config.join("foo/bar.json").basename.path).toEqual(
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

test(".rename()", async () => {
  const parentDir = await Path.makeTempDir();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");

  await file1.write("hello world");
  expect(await file1.exists()).toBe(true);
  expect(await file2.exists()).toBe(false);

  await file1.rename(file2);
  expect(await file1.exists()).toBe(false);
  expect(await file2.exists()).toBe(true);
});

test(".makeTempDir(…)", async () => {
  const tempDir = await Path.makeTempDir();
  expect(tempDir.path).toContain("/js-temp-");
  expect(tempDir.basename.path).toStartWith("js-temp-");
  expect(await tempDir.existsAsDir()).toBe(true);

  const tempDir2 = await Path.makeTempDir("foo");
  expect(tempDir2.path).not.toContain("/js-temp-");
  expect(tempDir2.basename.path).toStartWith("foo");
});

test("trash", async () => {
  const tempDir = await Path.makeTempDir();
  expect(await tempDir.exists()).toBe(true);
  await tempDir.trash();
  expect(await tempDir.exists()).toBe(false);
});

test("rm (file)", async () => {
  const file = (await Path.makeTempDir()).join("file.txt");
  await file.write("");
  expect(await file.existsAsFile()).toBe(true);
  await file.rm();
  expect(await file.existsAsFile()).toBe(false);
  expect(await file.parent.existsAsDir()).toBe(true);
  expect(async () => file.rm()).toThrowError(/ENOENT/);
});

test("rm (folder)", async () => {
  const tempDir = await Path.makeTempDir();
  const file = tempDir.join("file.txt");
  await file.write("");
  expect(await tempDir.existsAsDir()).toBe(true);
  expect(async () => tempDir.rm()).toThrowError(/EACCES|EFAULT/);
  await file.rm();
  await tempDir.rm({ recursive: true });
  expect(await tempDir.existsAsDir()).toBe(false);
  expect(async () => tempDir.rm()).toThrowError(/ENOENT/);
});

test("rm_rf (file)", async () => {
  const file = (await Path.makeTempDir()).join("file.txt");
  await file.write("");
  expect(await file.existsAsFile()).toBe(true);
  await file.rm_rf();
  expect(await file.existsAsFile()).toBe(false);
  expect(await file.parent.existsAsDir()).toBe(true);
  await file.rm_rf();
  expect(await file.existsAsFile()).toBe(false);
});

test("rm_rf (folder)", async () => {
  const tempDir = await Path.makeTempDir();
  await tempDir.join("file.txt").write("");
  expect(tempDir.path).toContain("/js-temp-");
  expect(await tempDir.exists()).toBe(true);
  await tempDir.rm_rf();
  expect(await tempDir.exists()).toBe(false);
  await tempDir.rm_rf();
  expect(await tempDir.exists()).toBe(false);
});

test(".fileText()", async () => {
  const file = (await Path.makeTempDir()).join("file.txt");
  await file.write("hi");
  await file.write("bye");

  expect(await file.fileText()).toBe("bye");
  expect(await readFile(file.path, "utf-8")).toBe("bye");
});

test(".fileJSON()", async () => {
  const file = (await Path.makeTempDir()).join("file.json");
  await file.write(JSON.stringify({ foo: "bar" }));

  expect(await file.fileJSON()).toEqual<Record<string, string>>({ foo: "bar" });
  expect(await file.fileJSON<Record<string, string>>()).toEqual({ foo: "bar" });
  expect(await JSON.parse(await readFile(file.path, "utf-8"))).toEqual<
    Record<string, string>
  >({ foo: "bar" });
});

test(".write(…)", async () => {
  const tempDir = await Path.makeTempDir();
  const file = tempDir.join("file.json");
  await file.write("foo");

  expect(await readFile(join(tempDir.path, "./file.json"), "utf-8")).toEqual(
    "foo",
  );

  const file2 = tempDir.join("nested/file2.json");
  await file2.write("bar");
  expect(
    await readFile(join(tempDir.path, "./nested/file2.json"), "utf-8"),
  ).toEqual("bar");
});

test(".writeJSON(…)", async () => {
  const file = (await Path.makeTempDir()).join("file.json");
  await file.writeJSON({ foo: "bar" });

  expect(await file.fileJSON()).toEqual<Record<string, string>>({ foo: "bar" });
});

test(".readDir(…)", async () => {
  const dir = await Path.makeTempDir();
  await dir.join("file.txt").write("hello");
  await dir.join("dir/file.json").write("hello");

  const contentsAsStrings = await dir.readDir();
  expect(new Set(contentsAsStrings)).toEqual(new Set(["file.txt", "dir"]));

  // const contentsAsEntries = await dir.readDir({ withFileTypes: true });
});

test("homedir", async () => {
  expect(Path.homedir.path).toEqual("/mock/home/dir");
});

test("XDG", async () => {
  expect(Path.xdg.cache.path).toEqual("/mock/home/dir/.cache");
  expect(Path.xdg.config.path).toEqual("/xdg/config");
  expect(Path.xdg.data.path).toEqual("/mock/home/dir/.local/share");
  expect(Path.xdg.state.path).toEqual("/mock/home/dir/.local/state");
});
