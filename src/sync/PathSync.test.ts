import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import "./PathSync";
import { constants } from "node:fs/promises";
import { PrintableShellCommand } from "printable-shell-command";
import { PathSync } from "./PathSync";

test(".existsAsFileSync()", () => {
  const filePath = PathSync.makeTempDirSync().join("file.txt");
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

test(".existsAsDir()", () => {
  const filePath = PathSync.makeTempDirSync();
  expect(filePath.existsSync()).toBe(true);
  expect(() => filePath.existsSync({ mustBe: "file" })).toThrow(
    /PathSync exists but is not a file/,
  );
  expect(filePath.existsSync({ mustBe: "directory" })).toBe(true);
  expect(filePath.existsAsDirSync()).toBe(true);
  filePath.rm_rfSync();
  expect(filePath.existsSync()).toBe(false);
  expect(filePath.existsSync({ mustBe: "file" })).toBe(false);
  expect(filePath.existsSync({ mustBe: "directory" })).toBe(false);
  expect(filePath.existsAsDirSync()).toBe(false);
});

test(".mkdirSync(…) (un-nested)", () => {
  const dir = PathSync.makeTempDirSync().join("mkdir-test");
  expect(dir.existsSync()).toBe(false);
  dir.mkdirSync();
  expect(dir.existsSync()).toBe(true);
});

test(".mkdirSync(…) (nested)", () => {
  const dir = PathSync.makeTempDirSync().join("mkdir-test/nested");
  expect(dir.existsSync()).toBe(false);
  expect(() => dir.mkdirSync({ recursive: false })).toThrow("no such file");
  dir.mkdirSync();
  expect(dir.existsSync()).toBe(true);
});

test(".cpSync(…)", () => {
  const parentDir = PathSync.makeTempDirSync();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");

  file1.writeSync("hello world");
  expect(file1.existsSync()).toBe(true);
  expect(file2.existsSync()).toBe(false);

  file1.cpSync(file2);
  expect(file1.existsSync()).toBe(true);
  expect(file2.existsSync()).toBe(true);
});

test(".renameSync(…)", () => {
  const parentDir = PathSync.makeTempDirSync();
  const file1 = parentDir.join("file1.txt");
  const file2 = parentDir.join("file2.txt");

  file1.writeSync("hello world");
  expect(file1.existsSync()).toBe(true);
  expect(file2.existsSync()).toBe(false);

  file1.renameSync(file2);
  expect(file1.existsSync()).toBe(false);
  expect(file2.existsSync()).toBe(true);
});

test(".makeTempDirSync(…)", () => {
  const tempDir = PathSync.makeTempDirSync();
  expect(tempDir.path).toContain("/js-temp-");
  expect(tempDir.basename.path).toStartWith("js-temp-");
  expect(tempDir.existsAsDirSync()).toBe(true);

  const tempDir2 = PathSync.makeTempDirSync("foo");
  expect(tempDir2.path).not.toContain("/js-temp-");
  expect(tempDir2.basename.path).toStartWith("foo");
});

test(".rmSync(…) (file)", () => {
  const file = PathSync.makeTempDirSync().join("file.txt");
  file.writeSync("");
  expect(file.existsAsFileSync()).toBe(true);
  file.rmSync();
  expect(file.existsAsFileSync()).toBe(false);
  expect(file.parent.existsAsDirSync()).toBe(true);
  expect(() => file.rmSync()).toThrowError(/ENOENT/);
});

test(".rmSync(…) (folder)", () => {
  const tempDir = PathSync.makeTempDirSync();
  const file = tempDir.join("file.txt");
  file.writeSync("");
  expect(tempDir.existsAsDirSync()).toBe(true);
  expect(() => tempDir.rmSync()).toThrowError(/EACCES|EFAULT/);
  file.rmSync();
  tempDir.rmSync({ recursive: true });
  expect(tempDir.existsAsDirSync()).toBe(false);
  expect(() => tempDir.rmSync()).toThrowError(/ENOENT/);
});

test(".rmDirSync(…) (folder)", () => {
  const tempDir = PathSync.makeTempDirSync();
  const file = tempDir.join("file.txt");
  file.writeSync("");
  expect(tempDir.existsAsDirSync()).toBe(true);
  expect(() => tempDir.rmDirSync()).toThrowError(/ENOTEMPTY/);
  file.rmSync();
  tempDir.rmDirSync();
  expect(tempDir.existsAsDirSync()).toBe(false);
  expect(() => tempDir.rmDirSync()).toThrowError(/ENOENT/);
});

test(".rm_rfSync(…) (file)", () => {
  const file = PathSync.makeTempDirSync().join("file.txt");
  file.writeSync("");
  expect(file.existsAsFileSync()).toBe(true);
  file.rm_rfSync();
  expect(file.existsAsFileSync()).toBe(false);
  expect(file.parent.existsAsDirSync()).toBe(true);
  file.rm_rfSync();
  expect(file.existsAsFileSync()).toBe(false);
});

test(".rm_rfSync(…) (folder)", () => {
  const tempDir = PathSync.makeTempDirSync();
  tempDir.join("file.txt").writeSync("");
  expect(tempDir.path).toContain("/js-temp-");
  expect(tempDir.existsSync()).toBe(true);
  tempDir.rm_rfSync();
  expect(tempDir.existsSync()).toBe(false);
  tempDir.rm_rfSync();
  expect(tempDir.existsSync()).toBe(false);
});

test(".readTextSync()", () => {
  const file = PathSync.makeTempDirSync().join("file.txt");
  file.writeSync("hi");
  file.writeSync("bye");

  expect(file.readTextSync()).toBe("bye");
  expect(readFileSync(file.path, "utf-8")).toBe("bye");
});

test(".readJSONSync()", () => {
  const file = PathSync.makeTempDirSync().join("file.json");
  file.writeSync(JSON.stringify({ foo: "bar" }));

  expect(file.readJSONSync()).toEqual<Record<string, string>>({ foo: "bar" });
  expect(file.readJSONSync<Record<string, string>>()).toEqual({ foo: "bar" });
  expect(JSON.parse(readFileSync(file.path, "utf-8"))).toEqual<
    Record<string, string>
  >({ foo: "bar" });
});

test(".readJSONSync(…) with fallback", () => {
  const tempDir = PathSync.makeTempDirSync();
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

test(".writeSync(…)", () => {
  const tempDir = PathSync.makeTempDirSync();
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

test(".writeJSONSync(…)", () => {
  const file = PathSync.makeTempDirSync().join("file.json");
  expect(file.writeJSONSync({ foo: "bar" })).toBe(file);

  expect(file.readJSONSync()).toEqual<Record<string, string>>({ foo: "bar" });
});

test(".appendFileSync(…)", () => {
  const file = PathSync.makeTempDirSync().join("file.txt");
  file.appendFileSync("test\n");
  expect(file.readTextSync()).toEqual("test\n");
  file.appendFileSync("more\n");
  expect(file.readTextSync()).toEqual("test\nmore\n");
});

test(".readDirSync(…)", () => {
  const dir = PathSync.makeTempDirSync();
  dir.join("file.txt").writeSync("hello");
  dir.join("dir/file.json").writeSync("hello");

  const contentsAsStrings = dir.readDirSync();
  expect(new Set(contentsAsStrings)).toEqual(new Set(["file.txt", "dir"]));

  const contentsAsEntries = dir.readDirSync({ withFileTypes: true });
  expect(new Set(contentsAsEntries.map((entry) => entry.name))).toEqual(
    new Set(["file.txt", "dir"]),
  );
});

test(".symlinkSync(…)", () => {
  const tempDir = PathSync.makeTempDirSync();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  source.symlinkSync(target);
  expect(target.existsAsFileSync()).toBe(false);
  expect(() => target.readText()).toThrow(/ENOENT/);
  source.writeSync("hello");
  expect(target.existsAsFileSync()).toBe(true);
  expect(target.readTextSync()).toEqual("hello");
});

test(".realpathSync(…)", () => {
  const tempDir = PathSync.makeTempDirSync();
  const source = tempDir.join("foo.txt");
  source.writeSync("hello world!");
  const target = tempDir.join("bar.txt");
  source.symlinkSync(target);
  expect(source.realpathSync().path).toEqual(target.realpathSync().path);
});

test(".statSync(…)", () => {
  const file = PathSync.makeTempDirSync().join("foo.txt");
  file.writeSync("hello");

  expect(file.statSync()?.size).toEqual(5);
  expect(file.statSync()?.size).toBeTypeOf("number");
  expect(file.statSync({ bigint: true })?.size).toBeTypeOf("bigint");
});

test(".lstatSync(…)", () => {
  const tempDir = PathSync.makeTempDirSync();
  const source = tempDir.join("foo.txt");
  const target = tempDir.join("bar.txt");
  source.symlinkSync(target);
  source.writeSync("hello");

  expect(source.lstatSync()?.isSymbolicLink()).toBe(false);
  expect(target.lstatSync()?.isSymbolicLink()).toBe(true);

  expect(target.readTextSync()).toEqual("hello");
});

test(".chmodSync(…)", () => {
  const binPath = PathSync.makeTempDirSync().join("nonexistent.bin");
  expect(() => new PrintableShellCommand(binPath, []).text()).toThrow(
    /ENOENT|Premature close/,
  );
  binPath.writeSync(`#!/usr/bin/env bash

echo hi`);
  // TODO: why doesn't this work here instead (but works in `printable-shell-comand`)?
  //    binPath.writeSync(`#!/usr/bin/env -S bun run --

  // console.log("hi");`);
  expect(() => new PrintableShellCommand(binPath, []).text()).toThrow(
    /EACCES|Premature close/,
  );
  binPath.chmodSync(0o755);
  expect(() => new PrintableShellCommand(binPath, []).text()).not.toThrow();
});

test(".chmodXSync(…)", () => {
  const binPath = PathSync.makeTempDirSync().join("nonexistent.bin");
  expect(() => new PrintableShellCommand(binPath, []).text()).toThrow(
    /ENOENT|Premature close/,
  );
  binPath.writeSync(`#!/usr/bin/env bash

echo hi`);
  // TODO: why doesn't this work here instead (but works in `printable-shell-comand`)?
  //    binPath.writeSync(`#!/usr/bin/env -S bun run --

  // console.log("hi");`);
  expect(() => new PrintableShellCommand(binPath, []).text()).toThrow(
    /EACCES|Premature close/,
  );
  expect(binPath.statSync().mode & constants.S_IWUSR).toBeTruthy();
  binPath.chmodSync(0o444);
  expect(binPath.statSync().mode & constants.S_IWUSR).toBeFalsy();
  expect(binPath.statSync().mode & constants.S_IXUSR).toBeFalsy();
  binPath.chmodXSync();
  expect(() => new PrintableShellCommand(binPath, []).text()).not.toThrow();
  expect(binPath.statSync().mode & constants.S_IWUSR).toBeFalsy();
  expect(binPath.statSync().mode & constants.S_IXUSR).toBeTruthy();
});
