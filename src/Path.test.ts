import { expect, spyOn, test } from "bun:test";
import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import { chdir } from "node:process";
import { Path, stringifyIfPath } from "./Path";

test("constructor", async () => {
  expect(new Path("bare").path).toEqual("bare");
  expect(new Path("bare/").path).toEqual("bare/");
  expect(new Path("bare/path").path).toEqual("bare/path");
  expect(new Path("bare/path/").path).toEqual("bare/path/");
  expect(new Path("./relative").path).toEqual("./relative");
  expect(new Path("./relative/").path).toEqual("./relative/");
  expect(new Path("./relative/nested").path).toEqual("./relative/nested");
  expect(new Path("./relative/nested/").path).toEqual("./relative/nested/");
  expect(new Path("/absolute").path).toEqual("/absolute");
  expect(new Path("/absolute/").path).toEqual("/absolute/");
  expect(new Path("/absolute/nested").path).toEqual("/absolute/nested");
  expect(new Path("/absolute/nested/").path).toEqual("/absolute/nested/");
  expect(new Path("./down/../again").path).toEqual("./again");
  expect(new Path("down/../again").path).toEqual("again");
  expect(new Path("down/..").path).toEqual(".");
});

test("Path.resolve(…)", async () => {
  expect(Path.resolve("foo/lish", new Path("/bar/baz")).path).toEqual(
    "/bar/foo/lish",
  );
  expect(() => Path.resolve("foo/lish", new Path("bar/baz")).path).toThrow(
    /must be an absolute path/,
  );
  expect(Path.resolve("foo/lish", import.meta.url).path).toEqual(
    new Path(import.meta.url).parent.join("foo/lish").path,
  );
  expect(Path.resolve("foo", "file:///hello/world").path).toEqual("/hello/foo");
  expect(Path.resolve("foo", "file:///hello/world/").path).toEqual(
    "/hello/world/foo",
  );
});

test(".isAbsolutePath()", async () => {
  expect(new Path("/foo/bar").isAbsolutePath()).toBe(true);
  expect(new Path("foo/bar").isAbsolutePath()).toBe(false);
  expect(new Path(import.meta.url).isAbsolutePath()).toBe(true);
});

test(".toFileURL()", async () => {
  expect(new Path("/foo/bar").toFileURL().toString()).toEqual(
    "file:///foo/bar",
  );
  expect(new Path("/foo/bar").toFileURL()).toEqual(new URL("file:///foo/bar"));
  expect(() => new Path("foo/bar").toFileURL()).toThrow(
    /Tried to convert to file URL when the path is not absolute\./,
  );
});

test(".hasTrailingSlash()", async () => {
  expect(new Path("/foo/bar").hasTrailingSlash()).toBe(false);
  expect(new Path("/foo/bar/").hasTrailingSlash()).toBe(true);
  expect(new Path("foo/bar").hasTrailingSlash()).toBe(false);
  expect(new Path("foo/bar/").hasTrailingSlash()).toBe(true);
  expect(new Path(import.meta.url).hasTrailingSlash()).toBe(false);
  expect(new Path(import.meta.url).join("foo/").hasTrailingSlash()).toBe(true);
  expect(new Path(import.meta.url).join("bar/.").hasTrailingSlash()).toBe(
    false,
  );
  expect(new Path(import.meta.url).join(".").hasTrailingSlash()).toBe(false);
});

test(".toggleTrailingSlash(…)", async () => {
  expect(new Path("/foo/bar").toggleTrailingSlash().path).toBe("/foo/bar/");
  expect(new Path("/foo/bar/").toggleTrailingSlash().path).toBe("/foo/bar");
  expect(new Path("/").toggleTrailingSlash().path).toBe("/");
  expect(new Path("./").toggleTrailingSlash().path).toBe(".");
  expect(new Path(".").toggleTrailingSlash().path).toBe("./");
  expect(new Path("../").toggleTrailingSlash().path).toBe("..");
  expect(new Path("..").toggleTrailingSlash().path).toBe("../");
});

test("normalize", async () => {
  expect(new Path("foo//bar").path).toEqual("foo/bar");
  expect(new Path("foo////bar").path).toEqual("foo/bar");
  expect(new Path("foo/bar/").path).toEqual("foo/bar/");
  expect(new Path("foo/bar//").path).toEqual("foo/bar/");
  expect(new Path("//absolute////bar").path).toEqual("/absolute/bar");
});

test(".join(…)", async () => {
  expect(new Path("foo").join("bar").path).toEqual("foo/bar");
  expect(new Path("foo/bar").join("bath", "kitchen/sink").path).toEqual(
    "foo/bar/bath/kitchen/sink",
  );
  expect(new Path("foo").join(new Path("bar")).path).toEqual("foo/bar");
  expect(
    new Path("foo/bar").join("bath", new Path("kitchen/sink")).path,
  ).toEqual("foo/bar/bath/kitchen/sink");
  expect(() => new Path("foo").join(new Path("/bar")).path).toThrow(
    "Arguments to `.join(…)` cannot be absolute. Use `.asRelative()` to convert them first if needed.",
  );
});

test("asRelative()", async () => {
  // From doc comment
  expect(new Path("bare").asRelative().path).toEqual("./bare");
  expect(new Path("./relative").asRelative().path).toEqual("./relative");
  expect(new Path("../up-first").asRelative().path).toEqual("../up-first");
  expect(new Path("/absolute").asRelative().path).toEqual("./absolute");
  // Other
  expect(new Path("./bar/../foo").asRelative().path).toEqual("./foo");
  expect(new Path("./bar/../../").asRelative().path).toEqual("../");
  expect(new Path("././").asRelative().path).toEqual("./");
  expect(new Path("..").asRelative().path).toEqual("..");
  expect(new Path("../").asRelative().path).toEqual("../");
  expect(new Path("/abs/").asRelative().path).toEqual("./abs/");
  expect(new Path("bare/").asRelative().path).toEqual("./bare/");
  expect(new Path("./rel/").asRelative().path).toEqual("./rel/");
  expect(new Path("../up/").asRelative().path).toEqual("../up/");
});

test("asAbsolute()", async () => {
  // From doc comment
  expect(new Path("bare").asAbsolute().path).toEqual("/bare");
  expect(new Path("./relative").asAbsolute().path).toEqual("/relative");
  expect(new Path("../up-first").asAbsolute().path).toEqual("/up-first");
  expect(new Path("/absolute").asAbsolute().path).toEqual("/absolute");
  // Other
  expect(new Path("/abs/").asAbsolute().path).toEqual("/abs/");
  expect(new Path("bare/").asAbsolute().path).toEqual("/bare/");
  expect(new Path("../up/").asAbsolute().path).toEqual("/up/");
});

test("asBare(…)", async () => {
  const ERROR_1 =
    'Converting path to a bare path resulted in a `..` traversal prefix. Pass `"strip"` or `"keep"` as the `parentTraversalHandling` option to avoid an error.';
  const ERROR_2 = "Output does not start with a named component.";
  // From doc comment (default)
  expect(new Path("bare").asBare().path).toEqual("bare");
  expect(new Path("./relative").asBare().path).toEqual("relative");
  expect(new Path(".").asBare().path).toEqual(".");
  expect(new Path("down-first/..").asBare().path).toEqual(".");
  expect(() => new Path("../up-first").asBare().path).toThrow(ERROR_1);
  expect(() => new Path("..").asBare().path).toThrow(ERROR_1);
  expect(new Path("/absolute").asBare().path).toEqual("absolute");
  // From doc comment (strip)
  expect(
    new Path("../up-first").asBare({ parentTraversalPrefixHandling: "strip" })
      .path,
  ).toEqual("up-first");
  expect(
    new Path("..").asBare({ parentTraversalPrefixHandling: "strip" }).path,
  ).toEqual(".");
  // From doc comment (keep)
  expect(
    new Path("../up-first").asBare({ parentTraversalPrefixHandling: "keep" })
      .path,
  ).toEqual("../up-first");
  expect(
    new Path("..").asBare({ parentTraversalPrefixHandling: "keep" }).path,
  ).toEqual("..");
  // Other
  expect(new Path(".").asBare().asBare().path).toEqual(".");
  expect(new Path("./").asBare().asBare().path).toEqual("./");
  expect(new Path("/abs/").asBare().asBare().path).toEqual("abs/");
  expect(new Path("bare/").asBare().asBare().path).toEqual("bare/");
  expect(() => new Path("../up/").asBare().path).toThrow(ERROR_1);
  expect(() => new Path("./down/down/../../..").asBare().path).toThrow(ERROR_1);
  expect(() => new Path("..").asBare().path).toThrow(ERROR_1);
  expect(() => new Path("../../up/").asBare().path).toThrow(ERROR_1);
  // parentTraversalPrefixHandling
  expect(
    new Path("../../up/").asBare({ parentTraversalPrefixHandling: "strip" })
      .path,
  ).toEqual("up/");
  expect(
    new Path("../../up/").asBare({ parentTraversalPrefixHandling: "keep" })
      .path,
  ).toEqual("../../up/");
  expect(
    new Path("../..").asBare({ parentTraversalPrefixHandling: "strip" }).path,
  ).toEqual(".");
  expect(
    new Path("../../").asBare({ parentTraversalPrefixHandling: "strip" }).path,
  ).toEqual(".");
  // requireNamedComponentPrefix
  expect(
    () =>
      new Path(".").asBare({
        requireNamedComponentPrefix: true,
      }).path,
  ).toThrow(ERROR_2);
  expect(
    () =>
      new Path("../../").asBare({
        parentTraversalPrefixHandling: "strip",
        requireNamedComponentPrefix: true,
      }).path,
  ).toThrow(ERROR_2);
  expect(
    () =>
      new Path("./").asBare({
        parentTraversalPrefixHandling: "strip",
        requireNamedComponentPrefix: true,
      }).path,
  ).toThrow(ERROR_2);
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
  await filePath.rm_rf();
  expect(await filePath.exists()).toBe(false);
  expect(await filePath.exists({ mustBe: "file" })).toBe(false);
  expect(await filePath.exists({ mustBe: "directory" })).toBe(false);
  expect(await filePath.existsAsDir()).toBe(false);
});

test(".mkdir(…) (un-nested)", async () => {
  const dir = (await Path.makeTempDir()).join("mkdir-test");
  expect(await dir.exists()).toBe(false);
  await dir.mkdir();
  expect(await dir.exists()).toBe(true);
});

test(".mkdir(…) (nested)", async () => {
  const dir = (await Path.makeTempDir()).join("mkdir-test/nested");
  expect(await dir.exists()).toBe(false);
  expect(() => dir.mkdir({ recursive: false })).toThrow("no such file");
  await dir.mkdir();
  expect(await dir.exists()).toBe(true);
});

test(".cp(…)", async () => {
  const parentDir = await Path.makeTempDir();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");

  await file1.write("hello world");
  expect(await file1.exists()).toBe(true);
  expect(await file2.exists()).toBe(false);

  await file1.cp(file2);
  expect(await file1.exists()).toBe(true);
  expect(await file2.exists()).toBe(true);
});

test(".rename(…)", async () => {
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

test(".rm(…) (file)", async () => {
  const file = (await Path.makeTempDir()).join("file.txt");
  await file.write("");
  expect(await file.existsAsFile()).toBe(true);
  await file.rm();
  expect(await file.existsAsFile()).toBe(false);
  expect(await file.parent.existsAsDir()).toBe(true);
  expect(async () => file.rm()).toThrowError(/ENOENT/);
});

test(".rm(…) (folder)", async () => {
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

test(".rm_rf(…) (file)", async () => {
  const file = (await Path.makeTempDir()).join("file.txt");
  await file.write("");
  expect(await file.existsAsFile()).toBe(true);
  await file.rm_rf();
  expect(await file.existsAsFile()).toBe(false);
  expect(await file.parent.existsAsDir()).toBe(true);
  await file.rm_rf();
  expect(await file.existsAsFile()).toBe(false);
});

test(".rm_rf(…) (folder)", async () => {
  const tempDir = await Path.makeTempDir();
  await tempDir.join("file.txt").write("");
  expect(tempDir.path).toContain("/js-temp-");
  expect(await tempDir.exists()).toBe(true);
  await tempDir.rm_rf();
  expect(await tempDir.exists()).toBe(false);
  await tempDir.rm_rf();
  expect(await tempDir.exists()).toBe(false);
});

test(".readText()", async () => {
  const file = (await Path.makeTempDir()).join("file.txt");
  await file.write("hi");
  await file.write("bye");

  expect(await file.readText()).toBe("bye");
  expect(await readFile(file.path, "utf-8")).toBe("bye");
});

test(".readJSON()", async () => {
  const file = (await Path.makeTempDir()).join("file.json");
  await file.write(JSON.stringify({ foo: "bar" }));

  expect(await file.readJSON()).toEqual<Record<string, string>>({ foo: "bar" });
  expect(await file.readJSON<Record<string, string>>()).toEqual({ foo: "bar" });
  expect(await JSON.parse(await readFile(file.path, "utf-8"))).toEqual<
    Record<string, string>
  >({ foo: "bar" });
});

test(".readJSON(…) with fallback", async () => {
  const tempDir = await Path.makeTempDir();
  const file = tempDir.join("file.json");
  const json: { foo?: number } = await file.readJSON({ fallback: { foo: 4 } });
  expect(json).toEqual({ foo: 4 });

  const file2 = tempDir.join("file2.json");
  await file2.writeJSON({ foo: 6 });
  const json2: { foo?: number } = await file2.readJSON({
    fallback: { foo: 4 },
  });
  expect(json2).toEqual({ foo: 6 });

  expect(() => tempDir.readJSON({ fallback: { foo: 4 } })).toThrowError(
    /^EISDIR/,
  );
});

test(".write(…)", async () => {
  const tempDir = await Path.makeTempDir();
  const file = tempDir.join("file.json");
  expect(await file.write("foo")).toBe(file);

  expect(await readFile(join(tempDir.path, "./file.json"), "utf-8")).toEqual(
    "foo",
  );

  const file2 = tempDir.join("nested/file2.json");
  expect(await file2.write("bar")).toBe(file2);
  expect(
    await readFile(join(tempDir.path, "./nested/file2.json"), "utf-8"),
  ).toEqual("bar");
});

test(".writeJSON(…)", async () => {
  const file = (await Path.makeTempDir()).join("file.json");
  expect(await file.writeJSON({ foo: "bar" })).toBe(file);

  expect(await file.readJSON()).toEqual<Record<string, string>>({ foo: "bar" });
});

test(".appendFile(…)", async () => {
  const file = (await Path.makeTempDir()).join("file.txt");
  await file.appendFile("test\n");
  expect(await file.readText()).toEqual("test\n");
  await file.appendFile("more\n");
  expect(await file.readText()).toEqual("test\nmore\n");
});

test(".readDir(…)", async () => {
  const dir = await Path.makeTempDir();
  await dir.join("file.txt").write("hello");
  await dir.join("dir/file.json").write("hello");

  const contentsAsStrings = await dir.readDir();
  expect(new Set(contentsAsStrings)).toEqual(new Set(["file.txt", "dir"]));

  const contentsAsEntries = await dir.readDir({ withFileTypes: true });
  expect(new Set(contentsAsEntries.map((entry) => entry.name))).toEqual(
    new Set(["file.txt", "dir"]),
  );
});

test(".symlink(…)", async () => {
  const tempDir = await Path.makeTempDir();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  await source.symlink(target);
  expect(await target.existsAsFile()).toBe(false);
  expect(() => target.readText()).toThrow(/ENOENT/);
  await source.write("hello");
  expect(await target.existsAsFile()).toBe(true);
  expect(await target.readText()).toEqual("hello");
});

test(".realpath(…)", async () => {
  const tempDir = await Path.makeTempDir();
  const source = tempDir.join("foo.txt");
  await source.write("hello world!");
  const target = tempDir.join("bar.txt");
  await source.symlink(target);
  expect((await source.realpath()).path).toEqual(
    (await target.realpath()).path,
  );
});

test(".stat(…)", async () => {
  const file = (await Path.makeTempDir()).join("foo.txt");
  await file.write("hello");

  expect((await file.stat()).size).toEqual(5);
  expect((await file.stat()).size).toBeTypeOf("number");
  expect((await file.stat({ bigint: true })).size).toBeTypeOf("bigint");
});

test(".lstat(…)", async () => {
  const tempDir = await Path.makeTempDir();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  await source.symlink(target);
  await source.write("hello");

  expect((await source.lstat()).isSymbolicLink()).toBe(false);
  expect((await target.lstat()).isSymbolicLink()).toBe(true);

  expect(await target.readText()).toEqual("hello");
});

test(".homedir", async () => {
  expect(Path.homedir.path).toEqual("/mock/home/dir");
});

test(".cwd", async () => {
  expect(Path.cwd.basename.path).toEqual("path-class");
  const tempDir = await Path.makeTempDir();
  chdir(tempDir.path);
  expect(await realpath(Path.cwd.path)).toEqual(await realpath(tempDir.path));
});

test(".xdg", async () => {
  expect(Path.xdg.cache.path).toEqual("/mock/home/dir/.cache");
  expect(Path.xdg.config.path).toEqual("/xdg/config");
  expect(Path.xdg.data.path).toEqual("/mock/home/dir/.local/share");
  expect(Path.xdg.state.path).toEqual("/mock/home/dir/.local/state");
  expect(Path.xdg.runtime).toBeUndefined();
  expect(Path.xdg.runtimeWithStateFallback.path).toEqual(
    "/mock/home/dir/.local/state",
  );
});

const spy = spyOn(console, "log");

test(".debugPrint(…)", async () => {
  Path.homedir.debugPrint("Here is a test log of the mock home directory:");
  expect(spy.mock.calls).toEqual([
    ["Here is a test log of the mock home directory:"],
    ["/mock/home/dir"],
  ]);
});

test(".stringifyIfPath(…)", async () => {
  expect(stringifyIfPath(Path.homedir)).toBe("/mock/home/dir");
  expect(stringifyIfPath("/mock/home/dir")).toBe("/mock/home/dir");
  expect(stringifyIfPath(4)).toBe(4);
});
