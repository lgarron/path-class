import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Path } from "../Path";
import "./index";

test(".existsAsFileSync()", () => {
  const filePath = Path.makeTempDirSync().join("file.txt");
  expect(filePath.existsSync()).toBe(false);
  expect(filePath.existsSync({ mustBe: "file" })).toBe(false);
  expect(filePath.existsSync({ mustBe: "directory" })).toBe(false);
  expect(filePath.existsAsFileSync()).toBe(false);
  filePath.writeSync("test");
  expect(filePath.existsSync()).toBe(true);
  expect(filePath.existsSync({ mustBe: "file" })).toBe(true);
  expect(() => filePath.existsSync({ mustBe: "directory" })).toThrow(
    /Path exists but is not a directory/,
  );
  expect(filePath.existsAsFileSync()).toBe(true);
});

test(".existsAsDir()", () => {
  const filePath = Path.makeTempDirSync();
  expect(filePath.existsSync()).toBe(true);
  expect(() => filePath.existsSync({ mustBe: "file" })).toThrow(
    /Path exists but is not a file/,
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
  const dir = Path.makeTempDirSync().join("mkdir-test");
  expect(dir.existsSync()).toBe(false);
  dir.mkdirSync();
  expect(dir.existsSync()).toBe(true);
});

test(".mkdirSync(…) (nested)", () => {
  const dir = Path.makeTempDirSync().join("mkdir-test/nested");
  expect(dir.existsSync()).toBe(false);
  expect(() => dir.mkdirSync({ recursive: false })).toThrow("no such file");
  dir.mkdirSync();
  expect(dir.existsSync()).toBe(true);
});

test(".cpSync(…)", () => {
  const parentDir = Path.makeTempDirSync();
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
  const parentDir = Path.makeTempDirSync();
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
  const tempDir = Path.makeTempDirSync();
  expect(tempDir.path).toContain("/js-temp-");
  expect(tempDir.basename.path).toStartWith("js-temp-");
  expect(tempDir.existsAsDirSync()).toBe(true);

  const tempDir2 = Path.makeTempDirSync("foo");
  expect(tempDir2.path).not.toContain("/js-temp-");
  expect(tempDir2.basename.path).toStartWith("foo");
});

test(".rmSync(…) (file)", () => {
  const file = Path.makeTempDirSync().join("file.txt");
  file.writeSync("");
  expect(file.existsAsFileSync()).toBe(true);
  file.rmSync();
  expect(file.existsAsFileSync()).toBe(false);
  expect(file.parent.existsAsDirSync()).toBe(true);
  expect(() => file.rmSync()).toThrowError(/ENOENT/);
});

test(".rmSync(…) (folder)", () => {
  const tempDir = Path.makeTempDirSync();
  const file = tempDir.join("file.txt");
  file.writeSync("");
  expect(tempDir.existsAsDirSync()).toBe(true);
  expect(() => tempDir.rmSync()).toThrowError(/EACCES|EFAULT/);
  file.rmSync();
  tempDir.rmSync({ recursive: true });
  expect(tempDir.existsAsDirSync()).toBe(false);
  expect(() => tempDir.rmSync()).toThrowError(/ENOENT/);
});

test(".rm_rfSync(…) (file)", () => {
  const file = Path.makeTempDirSync().join("file.txt");
  file.writeSync("");
  expect(file.existsAsFileSync()).toBe(true);
  file.rm_rfSync();
  expect(file.existsAsFileSync()).toBe(false);
  expect(file.parent.existsAsDirSync()).toBe(true);
  file.rm_rfSync();
  expect(file.existsAsFileSync()).toBe(false);
});

test(".rm_rfSync(…) (folder)", () => {
  const tempDir = Path.makeTempDirSync();
  tempDir.join("file.txt").writeSync("");
  expect(tempDir.path).toContain("/js-temp-");
  expect(tempDir.existsSync()).toBe(true);
  tempDir.rm_rfSync();
  expect(tempDir.existsSync()).toBe(false);
  tempDir.rm_rfSync();
  expect(tempDir.existsSync()).toBe(false);
});

test(".readTextSync()", () => {
  const file = Path.makeTempDirSync().join("file.txt");
  file.writeSync("hi");
  file.writeSync("bye");

  expect(file.readTextSync()).toBe("bye");
  expect(readFileSync(file.path, "utf-8")).toBe("bye");
});

test(".readJSONWync()", () => {
  const file = Path.makeTempDirSync().join("file.json");
  file.writeSync(JSON.stringify({ foo: "bar" }));

  expect(file.readJSONSync()).toEqual<Record<string, string>>({ foo: "bar" });
  expect(file.readJSONSync<Record<string, string>>()).toEqual({ foo: "bar" });
  expect(JSON.parse(readFileSync(file.path, "utf-8"))).toEqual<
    Record<string, string>
  >({ foo: "bar" });
});

test(".writeSync(…)", () => {
  const tempDir = Path.makeTempDirSync();
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
  const file = Path.makeTempDirSync().join("file.json");
  expect(file.writeJSONSync({ foo: "bar" })).toBe(file);

  expect(file.readJSONSync()).toEqual<Record<string, string>>({ foo: "bar" });
});

test(".readDirSync(…)", () => {
  const dir = Path.makeTempDirSync();
  dir.join("file.txt").writeSync("hello");
  dir.join("dir/file.json").writeSync("hello");

  const contentsAsStrings = dir.readDirSync();
  expect(new Set(contentsAsStrings)).toEqual(new Set(["file.txt", "dir"]));

  const contentsAsEntries = dir.readDirSync({ withFileTypes: true });
  expect(new Set(contentsAsEntries.map((entry) => entry.name))).toEqual(
    new Set(["file.txt", "dir"]),
  );
});
