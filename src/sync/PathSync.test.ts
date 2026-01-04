import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./PathSync";
import { execSync } from "node:child_process";
import { constants } from "node:fs/promises";
import { PathSync } from "./PathSync";

test.concurrent("PathSync.resolve(…)", () => {
  expect(PathSync.resolve("foo/lish", new PathSync("/bar/baz")).path).toEqual(
    "/bar/foo/lish",
  );
  expect(PathSync.resolve("foo/lish", new PathSync("/bar/baz/")).path).toEqual(
    "/bar/baz/foo/lish",
  );
  expect(
    () => PathSync.resolve("foo/lish", new PathSync("bar/baz")).path,
  ).toThrow(/must be an absolute path/);
  expect(PathSync.resolve("foo/lish", import.meta.url).path).toEqual(
    new PathSync(import.meta.url).parent.join("foo/lish").path,
  );
  expect(PathSync.resolve("foo", "file:///hello/world").path).toEqual(
    "/hello/foo",
  );
  expect(PathSync.resolve("foo", "file:///hello/world/").path).toEqual(
    "/hello/world/foo",
  );
});

test.concurrent(".resolve(…)", () => {
  expect(new PathSync("/bar/baz").resolve("foo/lish").path).toEqual(
    "/bar/foo/lish",
  );
  expect(new PathSync("/bar/baz/").resolve("foo/lish").path).toEqual(
    "/bar/baz/foo/lish",
  );
  expect(() => new PathSync("bar/baz").resolve("foo/lish").path).toThrow(
    /must be an absolute path/,
  );
  expect(new PathSync("/bar/baz").resolve("foo/lish")).toBeInstanceOf(PathSync);
});

test.concurrent(".existsAsFileSync()", () => {
  using filePath = PathSync.tempFilePathSync({ basename: "file.txt" });
  expect(filePath.existsSync()).toBe(false);
  expect(filePath.existsSync({ mustBe: "file" })).toBe(false);
  expect(filePath.existsSync({ mustBe: "directory" })).toBe(false);
  expect(filePath.existsAsFileSync()).toBe(false);
  expect(() => filePath.join("./").existsAsFileSync()).toThrow(
    "Path ends with a slash, which cannot be treated as a file.",
  );
  filePath.writeSync("test");
  expect(filePath.existsSync()).toBe(true);
  expect(filePath.existsSync({ mustBe: "file" })).toBe(true);
  expect(() => filePath.existsSync({ mustBe: "directory" })).toThrow(
    /PathSync exists but is not a directory/,
  );
  expect(filePath.existsAsFileSync()).toBe(true);
});

test.concurrent(".existsAsDir()", () => {
  using tempDir = PathSync.makeTempDirSync();
  expect(tempDir.existsSync()).toBe(true);
  expect(() => tempDir.existsSync({ mustBe: "file" })).toThrow(
    /PathSync exists but is not a file/,
  );
  expect(tempDir.existsSync({ mustBe: "directory" })).toBe(true);
  expect(tempDir.existsAsDirSync()).toBe(true);
  tempDir.rm_rfSync();
  expect(tempDir.existsSync()).toBe(false);
  expect(tempDir.existsSync({ mustBe: "file" })).toBe(false);
  expect(tempDir.existsSync({ mustBe: "directory" })).toBe(false);
  expect(tempDir.existsAsDirSync()).toBe(false);
});

test.concurrent(".mkdirSync(…) (un-nested)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const dir = tempDir.join("mkdir-test");
  expect(dir.existsSync()).toBe(false);
  dir.mkdirSync();
  expect(dir.existsSync()).toBe(true);
});

test.concurrent(".mkdirSync(…) (nested)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const dir = tempDir.join("mkdir-test/nested");
  expect(dir.existsSync()).toBe(false);
  expect(() => dir.mkdirSync({ recursive: false })).toThrow("no such file");
  dir.mkdirSync();
  expect(dir.existsSync()).toBe(true);
});

test.concurrent(".cpSync(…)", () => {
  using parentDir = PathSync.makeTempDirSync();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");
  const file3 = parentDir.join("nonexistent/dirs/file3.txt");

  file1.writeSync("hello world");
  expect(file1.existsSync()).toBe(true);
  expect(file2.existsSync()).toBe(false);

  file1.cpSync(file2);
  expect(file1.existsSync()).toBe(true);
  expect(file2.existsSync()).toBe(true);

  expect(() =>
    file2.renameSync(file3, { createIntermediateDirs: false }),
  ).toThrow(/^ENOENT/);
  expect(file2.existsSync()).toBe(true);
  expect(file3.existsSync()).toBe(false);

  expect(file2.cpSync(file3).path).toEqual(file3.path);
  expect(file2.existsSync()).toBe(true);
  expect(file3.existsSync()).toBe(true);
});

test.concurrent(".renameSync(…)", () => {
  using parentDir = PathSync.makeTempDirSync();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");
  const file3 = parentDir.join("nonexistent/dirs/file3.txt");

  file1.writeSync("hello world");
  expect(file1.existsSync()).toBe(true);
  expect(file2.existsSync()).toBe(false);

  file1.renameSync(file2);
  expect(file1.existsSync()).toBe(false);
  expect(file2.existsSync()).toBe(true);

  expect(() =>
    file2.renameSync(file3, { createIntermediateDirs: false }),
  ).toThrow(/^ENOENT/);
  expect(file2.existsSync()).toBe(true);
  expect(file3.existsSync()).toBe(false);

  expect(file2.renameSync(file3).path).toEqual(file3.path);
  expect(file2.existsSync()).toBe(false);
  expect(file3.existsSync()).toBe(true);
});

test.concurrent(".makeTempDirSync(…)", () => {
  let disposablePathSyncString: string;
  {
    using tempDir = PathSync.makeTempDirSync();
    disposablePathSyncString = tempDir.path;
    expect(tempDir.path).toContain("/js-temp-");
    expect(tempDir.basename.path).toStartWith("js-temp-");
    expect(tempDir.existsAsDirSync()).toBe(true);
  }
  expect(new PathSync(disposablePathSyncString).existsAsDirSync()).toBe(false);

  let disposablePathSyncString2: string;
  {
    using tempDir2 = PathSync.makeTempDirSync("foo");
    disposablePathSyncString2 = tempDir2.path;
    expect(tempDir2.path).not.toContain("/js-temp-");
    expect(tempDir2.basename.path).toStartWith("foo");
  }
  expect(new PathSync(disposablePathSyncString2).existsAsDirSync()).toBe(false);
});

test.concurrent(".rmSync(…) (file)", () => {
  using file = PathSync.tempFilePathSync({ basename: "file.txt" });
  file.writeSync("");
  expect(file.existsAsFileSync()).toBe(true);
  file.rmSync();
  expect(file.existsAsFileSync()).toBe(false);
  expect(file.parent.existsAsDirSync()).toBe(true);
  expect(() => file.rmSync()).toThrowError(/ENOENT/);
});

test.concurrent(".rmSync(…) (folder)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const file = tempDir.join("file.txt");
  file.writeSync("");
  expect(tempDir.existsAsDirSync()).toBe(true);
  expect(() => tempDir.rmSync()).toThrowError(/EACCES|EFAULT/);
  file.rmSync();
  tempDir.rmSync({ recursive: true });
  expect(tempDir.existsAsDirSync()).toBe(false);
  expect(() => tempDir.rmSync()).toThrowError(/ENOENT/);
});

test.concurrent(".rmDirSync(…) (folder)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const file = tempDir.join("file.txt");
  file.writeSync("");
  expect(tempDir.existsAsDirSync()).toBe(true);
  expect(() => tempDir.rmDirSync()).toThrowError(/ENOTEMPTY/);
  file.rmSync();
  tempDir.rmDirSync();
  expect(tempDir.existsAsDirSync()).toBe(false);
  expect(() => tempDir.rmDirSync()).toThrowError(/ENOENT/);
});

test.concurrent(".rm_rfSync(…) (file)", () => {
  using file = PathSync.tempFilePathSync({ basename: "file.txt" });
  file.writeSync("");
  expect(file.existsAsFileSync()).toBe(true);
  file.rm_rfSync();
  expect(file.existsAsFileSync()).toBe(false);
  expect(file.parent.existsAsDirSync()).toBe(true);
  file.rm_rfSync();
  expect(file.existsAsFileSync()).toBe(false);
});

test.concurrent(".rm_rfSync(…) (folder)", () => {
  using tempDir = PathSync.makeTempDirSync();
  tempDir.join("file.txt").writeSync("");
  expect(tempDir.path).toContain("/js-temp-");
  expect(tempDir.existsSync()).toBe(true);
  tempDir.rm_rfSync();
  expect(tempDir.existsSync()).toBe(false);
  tempDir.rm_rfSync();
  expect(tempDir.existsSync()).toBe(false);
});

test.concurrent(".readTextSync()", () => {
  using file = PathSync.tempFilePathSync({ basename: "file.txt" });
  file.writeSync("hi");
  file.writeSync("bye");

  expect(file.readTextSync()).toBe("bye");
  expect(readFileSync(file.path, "utf-8")).toBe("bye");
});

test.concurrent(".readJSONSync()", () => {
  using file = PathSync.tempFilePathSync({ basename: "file.json" });
  file.writeSync(JSON.stringify({ foo: "bar" }));

  expect(file.readJSONSync()).toEqual<Record<string, string>>({ foo: "bar" });
  expect(file.readJSONSync<Record<string, string>>()).toEqual({ foo: "bar" });
  expect(JSON.parse(readFileSync(file.path, "utf-8"))).toEqual<
    Record<string, string>
  >({ foo: "bar" });
});

test.concurrent(".readJSONSync(…) with fallback", () => {
  using tempDir = PathSync.makeTempDirSync();
  const file = tempDir.join("file.json");
  const json: { foo?: number } = file.readJSONSync({ fallback: { foo: 4 } });
  expect(json).toEqual({ foo: 4 });

  const file2 = tempDir.join("file2.json");
  file2.writeJSONSync({ foo: 6 });
  const json2: { foo?: number } = file2.readJSONSync({
    fallback: { foo: 4 },
  });
  expect(json2).toEqual({ foo: 6 });

  expect(() => tempDir.readJSONSync({ fallback: { foo: 4 } })).toThrowError(
    /^EISDIR/,
  );
});

test.concurrent(".writeSync(…)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const file = tempDir.join("file.json");
  expect(file.writeSync("foo")).toBe(file);

  expect(readFileSync(join(tempDir.path, "./file.json"), "utf-8")).toEqual(
    "foo",
  );

  const file2 = tempDir.join("nested/file2.json");
  expect(file2.writeSync("bar")).toBe(file2);
  expect(
    readFileSync(join(tempDir.path, "./nested/file2.json"), "utf-8"),
  ).toEqual("bar");
});

test.concurrent(".writeJSONSync(…)", () => {
  using file = PathSync.tempFilePathSync({ basename: "file.json" });
  expect(file.writeJSONSync({ foo: "bar" })).toBe(file);

  expect(file.readJSONSync()).toEqual<Record<string, string>>({ foo: "bar" });
});

test.concurrent(".appendFileSync(…)", () => {
  using file = PathSync.tempFilePathSync({ basename: "file.txt" });
  file.appendFileSync("test\n");
  expect(file.readTextSync()).toEqual("test\n");
  file.appendFileSync("more\n");
  expect(file.readTextSync()).toEqual("test\nmore\n");
});

test.concurrent(".readDirSync(…)", () => {
  using dir = PathSync.makeTempDirSync();
  dir.join("file.txt").writeSync("hello");
  dir.join("dir/file.json").writeSync("hello");

  const contentsAsStrings = dir.readDirSync();
  expect(new Set(contentsAsStrings)).toEqual(new Set(["file.txt", "dir"]));

  const contentsAsEntries = dir.readDirSync({ withFileTypes: true });
  expect(new Set(contentsAsEntries.map((entry) => entry.name))).toEqual(
    new Set(["file.txt", "dir"]),
  );
});

test.concurrent(".symlinkSync(…)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  source.symlinkSync(target);
  expect(target.existsAsFileSync()).toBe(false);
  expect(() => target.readText()).toThrow(/ENOENT/);
  source.writeSync("hello");
  expect(target.existsAsFileSync()).toBe(true);
  expect(target.readTextSync()).toEqual("hello");
});

test.concurrent(".realpathSync(…)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const source = tempDir.join("foo.txt");
  source.writeSync("hello world!");
  const target = tempDir.join("bar.txt");
  source.symlinkSync(target);
  expect(source.realpathSync().path).toEqual(target.realpathSync().path);
});

test.concurrent(".statSync(…)", () => {
  using file = PathSync.tempFilePathSync({ basename: "foo.txt" });
  file.writeSync("hello");

  expect(file.statSync()?.size).toEqual(5);
  expect(file.statSync()?.size).toBeTypeOf("number");
  expect(file.statSync({ bigint: true })?.size).toBeTypeOf("bigint");
});

test.concurrent(".lstatSync(…)", () => {
  using tempDir = PathSync.makeTempDirSync();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  source.symlinkSync(target);
  source.writeSync("hello");

  expect(source.lstatSync()?.isSymbolicLink()).toBe(false);
  expect(target.lstatSync()?.isSymbolicLink()).toBe(true);

  expect(target.readTextSync()).toEqual("hello");
});

// Note: this test uses `execSync(…)` because it runs the binary and returns
// expected error messages correctly. Further, it helps keep this entire test
// file sync (which we have some basic checks for in `lint-sync-code.ts` that
// don't seem like a great idea to work around).
test.concurrent(".chmodSync(…)", () => {
  using binPath = PathSync.tempFilePathSync({ basename: "bin.bash" });
  expect(() => execSync(binPath.path, { stdio: ["ignore"] })).toThrow(
    /No such file or directory/,
  );
  binPath.writeSync(`#!/usr/bin/env -S bun run --

console.log("hi");`);
  expect(() => execSync(binPath.path, { stdio: ["ignore"] })).toThrow(
    /Permission denied/,
  );
  binPath.chmodSync(0o755);
  expect(execSync(binPath.path, { encoding: "utf-8" })).toEqual("hi\n");
});

// Note: this test uses `execSync(…)` because it runs the binary and returns
// expected error messages correctly. Further, it helps keep this entire test
// file sync (which we have some basic checks for in `lint-sync-code.ts` that
// don't seem like a great idea to work around).
test.concurrent(".chmodXSync(…)", () => {
  using binPath = PathSync.tempFilePathSync({ basename: "bin.bash" });
  expect(() => execSync(binPath.path, { stdio: ["ignore"] })).toThrow(
    /No such file or directory/,
  );
  binPath.writeSync(`#!/usr/bin/env -S bun run --

console.log("hi");`);
  // TODO: Should not be `ENOENT`? Probably `EACCES`.
  expect(() => execSync(binPath.path, { stdio: ["ignore"] })).toThrow(
    /Permission denied/,
  );
  expect(binPath.statSync().mode & constants.S_IWUSR).toBeTruthy();
  binPath.chmodSync(0o444);
  expect(binPath.statSync().mode & constants.S_IWUSR).toBeFalsy();
  expect(binPath.statSync().mode & constants.S_IXUSR).toBeFalsy();
  binPath.chmodXSync();
  expect(execSync(binPath.path, { encoding: "utf-8" })).toEqual("hi\n");
  expect(binPath.statSync().mode & constants.S_IWUSR).toBeFalsy();
  expect(binPath.statSync().mode & constants.S_IXUSR).toBeTruthy();
});
