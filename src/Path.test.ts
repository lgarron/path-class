import { expect, jest, spyOn, test } from "bun:test";
import { execSync } from "node:child_process";
import { constants, readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import { chdir } from "node:process";
import { Path, ResolutionPrefix } from "./Path";

test.concurrent("constructor", async () => {
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
  expect(new Path("..").path).toEqual("..");
  expect(new Path("../").path).toEqual("../");
  expect(new Path(new URL("file:///root/")).path).toEqual("/root/");
  expect(new Path(new Path("foo")).path).toEqual("foo");
});

test.concurrent(".fromString(…)", async () => {
  expect(Path.fromString("bare").path).toEqual("bare");
  // biome-ignore lint/suspicious/noExplicitAny: We're purposely passing an invalid type.
  expect(() => Path.fromString(new URL("file:///test") as any)).toThrow(
    "Invalid argument to `Path.fromString(…)` — expected a string.",
  );
});

test.concurrent(".resolutionPrefix", async () => {
  expect(new Path("bare").resolutionPrefix).toEqual(ResolutionPrefix.Bare);
  expect(new Path("bare/").resolutionPrefix).toEqual(ResolutionPrefix.Bare);
  expect(new Path("bare/path").resolutionPrefix).toEqual(ResolutionPrefix.Bare);
  expect(new Path("bare/path/").resolutionPrefix).toEqual(
    ResolutionPrefix.Bare,
  );
  expect(new Path("./relative").resolutionPrefix).toEqual(
    ResolutionPrefix.Relative,
  );
  expect(new Path("./relative/").resolutionPrefix).toEqual(
    ResolutionPrefix.Relative,
  );
  expect(new Path("./relative/nested").resolutionPrefix).toEqual(
    ResolutionPrefix.Relative,
  );
  expect(new Path("./relative/nested/").resolutionPrefix).toEqual(
    ResolutionPrefix.Relative,
  );
  expect(new Path("/absolute").resolutionPrefix).toEqual(
    ResolutionPrefix.Absolute,
  );
  expect(new Path("/absolute/").resolutionPrefix).toEqual(
    ResolutionPrefix.Absolute,
  );
  expect(new Path("/absolute/nested").resolutionPrefix).toEqual(
    ResolutionPrefix.Absolute,
  );
  expect(new Path("/absolute/nested/").resolutionPrefix).toEqual(
    ResolutionPrefix.Absolute,
  );
  expect(new Path("./down/../again").resolutionPrefix).toEqual(
    ResolutionPrefix.Relative,
  );
  expect(new Path("down/../again").resolutionPrefix).toEqual(
    ResolutionPrefix.Bare,
  );
  expect(new Path("down/..").resolutionPrefix).toEqual(
    ResolutionPrefix.Relative,
  );
  expect(new Path("..").resolutionPrefix).toEqual(ResolutionPrefix.Relative);
  expect(new Path("../").resolutionPrefix).toEqual(ResolutionPrefix.Relative);
});

test.concurrent("Path.resolve(…)", async () => {
  expect(Path.resolve("foo/lish", new Path("/bar/baz")).path).toEqual(
    "/bar/foo/lish",
  );
  expect(Path.resolve("foo/lish", new Path("/bar/baz/")).path).toEqual(
    "/bar/baz/foo/lish",
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

test.concurrent(".resolve(…)", async () => {
  expect(new Path("/bar/baz").resolve("foo/lish").path).toEqual(
    "/bar/foo/lish",
  );
  expect(new Path("/bar/baz/").resolve("foo/lish").path).toEqual(
    "/bar/baz/foo/lish",
  );
  expect(() => new Path("bar/baz").resolve("foo/lish").path).toThrow(
    /must be an absolute path/,
  );
});

test.concurrent(".isAbsolutePath()", async () => {
  expect(new Path("/foo/bar").isAbsolutePath()).toBe(true);
  expect(new Path("foo/bar").isAbsolutePath()).toBe(false);
  expect(new Path(import.meta.url).isAbsolutePath()).toBe(true);
});

test.concurrent(".toFileURL()", async () => {
  expect(new Path("/foo/bar").toFileURL().toString()).toEqual(
    "file:///foo/bar",
  );
  expect(new Path("/foo/bar").toFileURL()).toEqual(new URL("file:///foo/bar"));
  expect(() => new Path("foo/bar").toFileURL()).toThrow(
    /Tried to convert to file URL when the path is not absolute\./,
  );
});

test.concurrent(".hasTrailingSlash()", async () => {
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

test.concurrent(".toggleTrailingSlash(…)", async () => {
  expect(new Path("/foo/bar").toggleTrailingSlash().path).toBe("/foo/bar/");
  expect(new Path("/foo/bar/").toggleTrailingSlash().path).toBe("/foo/bar");
  expect(new Path("/").toggleTrailingSlash().path).toBe("/");
  expect(new Path("./").toggleTrailingSlash().path).toBe(".");
  expect(new Path(".").toggleTrailingSlash().path).toBe("./");
  expect(new Path("../").toggleTrailingSlash().path).toBe("..");
  expect(new Path("..").toggleTrailingSlash().path).toBe("../");
});

test.concurrent(".blue", async () => {
  expect(Path.fromString("bare").path).toEqual("bare");
  expect(`Home dir: ${Path.homedir.blue}`).toEqual(
    "Home dir: \u001b[1m\u001b[34m/mock/home/dir\u001b[39m\u001b[22m",
  );
});

test.concurrent("normalize", async () => {
  expect(new Path("foo//bar").path).toEqual("foo/bar");
  expect(new Path("foo////bar").path).toEqual("foo/bar");
  expect(new Path("foo/bar/").path).toEqual("foo/bar/");
  expect(new Path("foo/bar//").path).toEqual("foo/bar/");
  expect(new Path("//absolute////bar").path).toEqual("/absolute/bar");
});

test.concurrent(".join(…)", async () => {
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

test.concurrent("asRelative()", async () => {
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

test.concurrent("asAbsolute()", async () => {
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

test.concurrent("asBare(…)", async () => {
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

test.concurrent("traverse", async () => {
  expect(new Path("foo/bar").join("..").path).toEqual("foo");
  expect(new Path("foo/bar").join(".").path).toEqual("foo/bar");
  expect(new Path("foo/bar").join("../baz").path).toEqual("foo/baz");
  expect(new Path("/absolute/path").join("../..").path).toEqual("/");
  expect(new Path("/absolute/path").join("../../..").path).toEqual("/");
  expect(new Path("/").join("..").path).toEqual("/");
});

test.concurrent(".extendBasename(…)", async () => {
  expect(new Path("file.mp4").extendBasename(".hevc.qv65.mov").path).toEqual(
    "file.mp4.hevc.qv65.mov",
  );
  // Trailing dots should not be removed.
  expect(new Path("file.mp4.").extendBasename(".hevc.qv65.mov").path).toEqual(
    "file.mp4..hevc.qv65.mov",
  );
});

test.concurrent(".parent", async () => {
  expect(new Path("/").parent.path).toEqual("/");
  expect(new Path("dir").parent.path).toEqual(".");
  expect(new Path("dir/").parent.path).toEqual(".");
});

test.concurrent(".dirname", async () => {
  expect(new Path("/").dirname.path).toEqual("/");
  expect(new Path("dir").dirname.path).toEqual(".");
  expect(new Path("dir/").dirname.path).toEqual(".");
});

test.concurrent(".basename", async () => {
  expect(new Path("/").basename.path).toEqual("."); // TODO?
  expect(new Path("dir").basename.path).toEqual("dir");
  expect(new Path("dir/").basename.path).toEqual("dir");
  expect(Path.xdg.config.join("foo/bar.json").basename.path).toEqual(
    "bar.json",
  );
});

test.concurrent(".extension", async () => {
  expect(new Path("foo.txt").extension).toEqual(".txt");
  expect(new Path("foo.").extension).toEqual(".");
  expect(new Path("foo").extension).toEqual("");
  expect(() => new Path("dir/").extension).toThrow();
  expect(() => new Path("/").extension).toThrow();
});

test.concurrent(".extname", async () => {
  expect(new Path("foo.txt").extname).toEqual(".txt");
  expect(new Path("foo.").extname).toEqual(".");
  expect(new Path("foo").extname).toEqual("");
  expect(() => new Path("dir/").extname).toThrow();
  expect(() => new Path("/").extname).toThrow();
});

test.concurrent(".existsAsFile()", async () => {
  await using file = await Path.tempFilePath({ basename: "file.txt" });
  expect(await file.exists()).toBe(false);
  expect(await file.exists({ mustBe: "file" })).toBe(false);
  expect(await file.exists({ mustBe: "directory" })).toBe(false);
  expect(await file.existsAsFile()).toBe(false);
  expect(() => file.join("./").existsAsFile()).toThrow(
    "Path ends with a slash, which cannot be treated as a file.",
  );
  await file.write("test");
  expect(await file.exists()).toBe(true);
  expect(await file.exists({ mustBe: "file" })).toBe(true);
  expect(() => file.exists({ mustBe: "directory" })).toThrow(
    /Path exists but is not a directory/,
  );
  expect(await file.existsAsFile()).toBe(true);
});

test.concurrent(".existsAsDir()", async () => {
  await using tempDir = await Path.makeTempDir();
  expect(await tempDir.exists()).toBe(true);
  expect(() => tempDir.exists({ mustBe: "file" })).toThrow(
    /Path exists but is not a file/,
  );
  expect(await tempDir.exists({ mustBe: "directory" })).toBe(true);
  expect(await tempDir.existsAsDir()).toBe(true);
  await tempDir.rm_rf();
  expect(await tempDir.exists()).toBe(false);
  expect(await tempDir.exists({ mustBe: "file" })).toBe(false);
  expect(await tempDir.exists({ mustBe: "directory" })).toBe(false);
  expect(await tempDir.existsAsDir()).toBe(false);
});

test.concurrent(".mkdir(…) (un-nested)", async () => {
  await using tempDir = await Path.makeTempDir();
  const dir = tempDir.join("mkdir-test");
  expect(await dir.exists()).toBe(false);
  await dir.mkdir();
  expect(await dir.exists()).toBe(true);
});

test.concurrent(".mkdir(…) (nested)", async () => {
  await using tempDir = await Path.makeTempDir();
  const dir = tempDir.join("mkdir-test/nested");
  expect(await dir.exists()).toBe(false);
  expect(() => dir.mkdir({ recursive: false })).toThrow("no such file");
  await dir.mkdir();
  expect(await dir.exists()).toBe(true);
});

test.concurrent(".cp(…)", async () => {
  await using parentDir = await Path.makeTempDir();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");
  const file3 = parentDir.join("nonexistent/dirs/file3.txt");

  await file1.write("hello world");
  expect(await file1.exists()).toBe(true);
  expect(await file2.exists()).toBe(false);

  await file1.cp(file2);
  expect(await file1.exists()).toBe(true);
  expect(await file2.exists()).toBe(true);

  expect(() => file2.rename(file3, { createIntermediateDirs: false })).toThrow(
    /^ENOENT/,
  );
  expect(await file2.exists()).toBe(true);
  expect(await file3.exists()).toBe(false);

  expect((await file2.cp(file3)).path).toEqual(file3.path);
  expect(await file2.exists()).toBe(true);
  expect(await file3.exists()).toBe(true);
});

test.concurrent(".rename(…)", async () => {
  await using parentDir = await Path.makeTempDir();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");
  const file3 = parentDir.join("nonexistent/dirs/file3.txt");

  await file1.write("hello world");
  expect(await file1.exists()).toBe(true);
  expect(await file2.exists()).toBe(false);

  await file1.rename(file2);
  expect(await file1.exists()).toBe(false);
  expect(await file2.exists()).toBe(true);

  expect(() => file2.rename(file3, { createIntermediateDirs: false })).toThrow(
    /^ENOENT/,
  );
  expect(await file2.exists()).toBe(true);
  expect(await file3.exists()).toBe(false);

  expect((await file2.rename(file3)).path).toEqual(file3.path);
  expect(await file2.exists()).toBe(false);
  expect(await file3.exists()).toBe(true);
});

test.concurrent(".makeTempDir(…)", async () => {
  let asyncDisposablePathString: string;
  {
    await using tempDir = await Path.makeTempDir();
    asyncDisposablePathString = tempDir.path;
    expect(tempDir.path).toContain("/js-temp-");
    expect(tempDir.basename.path).toStartWith("js-temp-");
    expect(await tempDir.existsAsDir()).toBe(true);
  }
  expect(await new Path(asyncDisposablePathString).existsAsDir()).toBe(false);

  let asyncDisposablePathString2: string;
  {
    await using tempDir2 = await Path.makeTempDir("foo");
    asyncDisposablePathString2 = tempDir2.path;
    expect(tempDir2.path).not.toContain("/js-temp-");
    expect(tempDir2.basename.path).toStartWith("foo");
  }
  expect(await new Path(asyncDisposablePathString2).existsAsDir()).toBe(false);
});

test.concurrent(".rm(…) (file)", async () => {
  await using filePath = await Path.tempFilePath({ basename: "file.txt" });
  await filePath.write("");
  expect(await filePath.existsAsFile()).toBe(true);
  await filePath.rm();
  expect(await filePath.existsAsFile()).toBe(false);
  expect(await filePath.parent.existsAsDir()).toBe(true);
  expect(async () => filePath.rm()).toThrow(/^ENOENT/);
});

test.concurrent(".rm(…) (folder)", async () => {
  await using tempDir = await Path.makeTempDir();
  const file = tempDir.join("file.txt");
  await file.write("");
  expect(await tempDir.existsAsDir()).toBe(true);
  expect(async () => tempDir.rm()).toThrow(/^(EACCES|EFAULT)/);
  await file.rm();
  await tempDir.rm({ recursive: true });
  expect(await tempDir.existsAsDir()).toBe(false);
  expect(async () => tempDir.rm()).toThrow(/^ENOENT/);
});

test.concurrent(".rmDir(…)", async () => {
  await using tempDir = await Path.makeTempDir();
  const file = tempDir.join("file.txt");
  await file.write("");
  expect(await tempDir.existsAsDir()).toBe(true);
  expect(async () => tempDir.rmDir()).toThrow(/^ENOTEMPTY/);
  await file.rm();
  await tempDir.rmDir();
  expect(await tempDir.existsAsDir()).toBe(false);
  expect(async () => tempDir.rmDir()).toThrow(/^ENOENT/);
});

test.concurrent(".rm_rf(…) (file)", async () => {
  await using file = await Path.tempFilePath({ basename: "file.txt" });
  await file.write("");
  expect(await file.existsAsFile()).toBe(true);
  await file.rm_rf();
  expect(await file.existsAsFile()).toBe(false);
  expect(await file.parent.existsAsDir()).toBe(true);
  await file.rm_rf();
  expect(await file.existsAsFile()).toBe(false);
});

test.concurrent(".rm_rf(…) (folder)", async () => {
  await using tempDir = await Path.makeTempDir();
  await tempDir.join("file.txt").write("");
  expect(tempDir.path).toContain("/js-temp-");
  expect(await tempDir.exists()).toBe(true);
  await tempDir.rm_rf();
  expect(await tempDir.exists()).toBe(false);
  await tempDir.rm_rf();
  expect(await tempDir.exists()).toBe(false);
});

test.concurrent(".readText()", async () => {
  await using file = await Path.tempFilePath({ basename: "file.txt" });
  await file.write("hi");
  await file.write("bye");

  expect(await file.readText()).toBe("bye");
  expect(await readFile(file.path, "utf-8")).toBe("bye");
});

test.concurrent(".readLines()", async () => {
  await using file = await Path.tempFilePath({ basename: "file.txt" });
  await file.write("hi\nbye\n");

  expect(await Array.fromAsync(file.readLines())).toEqual(["hi", "bye"]);
});

test.concurrent(".readJSON()", async () => {
  await using file = await Path.tempFilePath({ basename: "file.json" });
  await file.write(JSON.stringify({ foo: "bar" }));

  expect(await file.readJSON()).toEqual<Record<string, string>>({ foo: "bar" });
  expect(await file.readJSON<Record<string, string>>()).toEqual({ foo: "bar" });
  expect(await JSON.parse(await readFile(file.path, "utf-8"))).toEqual<
    Record<string, string>
  >({ foo: "bar" });
});

test.concurrent(".readJSON(…) with fallback", async () => {
  await using tempDir = await Path.makeTempDir();
  const file = tempDir.join("file.json");
  const json: { foo?: number } = await file.readJSON({ fallback: { foo: 4 } });
  expect(json).toEqual({ foo: 4 });

  const file2 = tempDir.join("file2.json");
  await file2.writeJSON({ foo: 6 });
  const json2: { foo?: number } = await file2.readJSON({
    fallback: { foo: 4 },
  });
  expect(json2).toEqual({ foo: 6 });

  expect(() => tempDir.readJSON({ fallback: { foo: 4 } })).toThrow(/^EISDIR/);
});

test.concurrent(".write(…)", async () => {
  await using tempDir = await Path.makeTempDir();
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

test.concurrent(".writeJSON(…)", async () => {
  await using file = await Path.tempFilePath({ basename: "file.json" });
  expect(await file.writeJSON({ foo: "bar" })).toBe(file);

  expect(await file.readJSON()).toEqual<Record<string, string>>({ foo: "bar" });
});

test.concurrent(".appendFile(…)", async () => {
  await using file = await Path.tempFilePath({ basename: "file.txt" });
  await file.appendFile("test\n");
  expect(await file.readText()).toEqual("test\n");
  await file.appendFile("more\n");
  expect(await file.readText()).toEqual("test\nmore\n");
});

test.concurrent(".readDir(…)", async () => {
  await using dir = await Path.makeTempDir();
  await dir.join("file.txt").write("hello");
  await dir.join("dir/file.json").write("hello");

  const contentsAsStrings = await dir.readDir();
  expect(new Set(contentsAsStrings)).toEqual(new Set(["file.txt", "dir"]));

  const contentsAsEntries = await dir.readDir({ withFileTypes: true });
  expect(new Set(contentsAsEntries.map((entry) => entry.name))).toEqual(
    new Set(["file.txt", "dir"]),
  );
});

test.concurrent(".symlink(…)", async () => {
  await using tempDir = await Path.makeTempDir();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  await source.symlink(target);
  expect(await target.existsAsFile()).toBe(false);
  expect(() => target.readText()).toThrow(/^ENOENT/);
  await source.write("hello");
  expect(await target.existsAsFile()).toBe(true);
  expect(await target.readText()).toEqual("hello");
});

test.concurrent(".realpath(…)", async () => {
  await using tempDir = await Path.makeTempDir();
  const source = tempDir.join("foo.txt");
  await source.write("hello world!");
  const target = tempDir.join("bar.txt");
  await source.symlink(target);
  expect((await source.realpath()).path).toEqual(
    (await target.realpath()).path,
  );
});

test.concurrent(".stat(…)", async () => {
  await using file = await Path.tempFilePath({ basename: "foo.txt" });
  await file.write("hello");

  expect((await file.stat()).size).toEqual(5);
  expect((await file.stat()).size).toBeTypeOf("number");
  expect((await file.stat({ bigint: true })).size).toBeTypeOf("bigint");
});

test.concurrent(".lstat(…)", async () => {
  await using tempDir = await Path.makeTempDir();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  await source.symlink(target);
  await source.write("hello");

  expect((await source.lstat()).isSymbolicLink()).toBe(false);
  expect((await target.lstat()).isSymbolicLink()).toBe(true);

  expect(await target.readText()).toEqual("hello");
});

test.concurrent(".chmod(…)", async () => {
  await using binPath = await Path.tempFilePath({
    basename: "bin.bash",
  });
  expect(() => execSync(binPath.path)).toThrow(/No such file or directory/);
  await binPath.write(`#!/usr/bin/env -S bun run --

  console.log("hi");`);
  expect(() => execSync(binPath.path)).toThrow(/Permission denied/);
  await binPath.chmod(0o755);
  expect(execSync(binPath.path, { encoding: "utf-8" })).toEqual("hi\n");
});

test.concurrent(".chmodX(…)", async () => {
  await using binPath = await Path.tempFilePath({
    basename: "bin.bash",
  });
  expect(() => execSync(binPath.path)).toThrow(/No such file or directory/);
  await binPath.write(`#!/usr/bin/env -S bun run --

  console.log("hi");`);
  expect(() => execSync(binPath.path)).toThrow(/Permission denied/);
  expect((await binPath.stat()).mode & constants.S_IWUSR).toBeTruthy();
  await binPath.chmod(0o444);
  expect((await binPath.stat()).mode & constants.S_IWUSR).toBeFalsy();
  expect((await binPath.stat()).mode & constants.S_IXUSR).toBeFalsy();
  await binPath.chmodX();
  expect(execSync(binPath.path, { encoding: "utf-8" })).toEqual("hi\n");
  expect((await binPath.stat()).mode & constants.S_IWUSR).toBeFalsy();
  expect((await binPath.stat()).mode & constants.S_IXUSR).toBeTruthy();
});

test.concurrent(".homedir", async () => {
  expect(Path.homedir.path).toEqual("/mock/home/dir");
});

// This is serial because it can break binary execution tests elsewhere.
test.serial(".cwd", async () => {
  const originalCwd = Path.cwd;
  expect(Path.cwd.basename.path).toEqual("path-class");
  await using tempDir = await Path.makeTempDir();
  chdir(tempDir.path);
  expect(await realpath(Path.cwd.path)).toEqual(await realpath(tempDir.path));
  chdir(originalCwd.path);
});

test.concurrent(".xdg", async () => {
  expect(Path.xdg.cache.path).toEqual("/mock/home/dir/.cache");
  expect(Path.xdg.config.path).toEqual("/xdg/config");
  expect(Path.xdg.data.path).toEqual("/mock/home/dir/.local/share");
  expect(Path.xdg.state.path).toEqual("/mock/home/dir/.local/state");
  expect(Path.xdg.runtime).toBeUndefined();
  expect(Path.xdg.runtimeWithStateFallback.path).toEqual(
    "/mock/home/dir/.local/state",
  );
});

test.concurrent(".debugPrint(…)", async () => {
  const spy = spyOn(console, "log");
  Path.homedir.debugPrint("Here is a test log of the mock home directory:");
  expect(spy.mock.calls).toEqual([
    ["Here is a test log of the mock home directory:"],
    ["/mock/home/dir"],
  ]);
  jest.restoreAllMocks();
});
