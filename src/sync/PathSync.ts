import {
  appendFileSync,
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { constants } from "node:fs/promises";
import { tmpdir } from "node:os";
import { mustNotHaveTrailingSlash, Path } from "../Path";
import type {
  lstatSyncType,
  readDirSyncType,
  readFileSyncType,
  statSyncType,
} from "./modifiedNodeTypes";

export class PathSync extends Path {
  static override fromString(s: string): PathSync {
    return new PathSync(s);
  }

  static override resolve(...args: Parameters<typeof Path.resolve>): PathSync {
    return new PathSync(Path.resolve(...args));
  }

  override toggleTrailingSlash(
    ...args: Parameters<Path["toggleTrailingSlash"]>
  ): PathSync {
    return new PathSync(super.toggleTrailingSlash(...args));
  }

  override join(...args: Parameters<Path["join"]>): PathSync {
    return new PathSync(super.join(...args));
  }

  override asRelative(...args: Parameters<Path["asRelative"]>): PathSync {
    return new PathSync(super.asRelative(...args));
  }

  override asAbsolute(...args: Parameters<Path["asAbsolute"]>): PathSync {
    return new PathSync(super.asAbsolute(...args));
  }

  override asBare(...args: Parameters<Path["asBare"]>): PathSync {
    return new PathSync(super.asBare(...args));
  }

  override extendBasename(
    ...args: Parameters<Path["extendBasename"]>
  ): PathSync {
    return new PathSync(super.extendBasename(...args));
  }

  override get parent(): PathSync {
    return new PathSync(super.parent);
  }

  override get dirname(): PathSync {
    return new PathSync(super.dirname);
  }

  override get basename(): PathSync {
    return new PathSync(super.basename);
  }

  static override get homedir(): PathSync {
    return new PathSync(Path.homedir);
  }

  static override get cwd(): PathSync {
    return new PathSync(Path.cwd);
  }

  override debugPrint(...args: Parameters<Path["debugPrint"]>): PathSync {
    return new PathSync(super.debugPrint(...args));
  }

  // TODO: find a neat way to dedup with the async version? // lint-sync-code-expect-error
  existsSync(constraints?: { mustBe: "file" | "directory" }): boolean {
    if (constraints?.mustBe === "file") {
      mustNotHaveTrailingSlash(this);
    }
    let stats: ReturnType<typeof statSync>;
    try {
      stats = statSync(this.path);
      // biome-ignore lint/suspicious/noExplicitAny: TypeScript limitation
    } catch (e: any) {
      if (e.code === "ENOENT") {
        return false;
      }
      throw e;
    }
    if (!constraints?.mustBe) {
      return true;
    }
    switch (constraints?.mustBe) {
      case "file": {
        if (stats.isFile()) {
          return true;
        }
        throw new Error(`PathSync exists but is not a file: ${this.path}`);
      }
      case "directory": {
        if (stats.isDirectory()) {
          return true;
        }
        throw new Error(`PathSync exists but is not a directory: ${this.path}`);
      }
      default: {
        throw new Error("Invalid path type constraint");
      }
    }
  }

  existsAsFileSync(): boolean {
    return this.existsSync({ mustBe: "file" });
  }

  existsAsDirSync(): boolean {
    return this.existsSync({ mustBe: "directory" });
  }

  mkdirSync(options?: Parameters<typeof mkdirSync>[1]): PathSync {
    const optionsObject = (() => {
      if (typeof options === "string" || typeof options === "number") {
        return { mode: options };
      }
      return options ?? {};
    })();
    mkdirSync(this.path, { recursive: true, ...optionsObject });
    return this;
  }

  cpSync(
    destination: string | URL | Path,
    options?: Parameters<typeof cpSync>[2],
  ): PathSync {
    cpSync(this.path, new Path(destination).path, options);
    return new PathSync(destination);
  }

  renameSync(destination: string | URL | Path): void {
    renameSync(this.path, new Path(destination).path);
  }

  static makeTempDirSync(prefix?: string): PathSync {
    return new PathSync(
      mkdtempSync(new Path(tmpdir()).join(prefix ?? "js-temp-").toString()),
    );
  }

  rmSync(options?: Parameters<typeof rmSync>[1]): void {
    rmSync(this.path, options);
  }

  rmDirSync(): void {
    rmdirSync(this.path);
  }

  rm_rfSync(options?: Parameters<typeof rmSync>[1]): void {
    this.rmSync({ recursive: true, force: true, ...(options ?? {}) });
  }

  readSync: typeof readFileSyncType = (options) =>
    // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
    readFileSync(this.path, options) as any;

  readTextSync(): string {
    return readFileSync(this.path, "utf-8");
  }

  readJSONSync<T>(options?: { fallback?: T }): T {
    try {
      return JSON.parse(this.readTextSync());
    } catch (e) {
      if (
        (e as { code?: string }).code === "ENOENT" &&
        options &&
        "fallback" in options
      ) {
        return options.fallback as T;
      }
      throw e;
    }
  }

  appendFileSync(
    data: Parameters<typeof appendFileSync>[1],
    options?: Parameters<typeof appendFileSync>[2],
  ): PathSync {
    appendFileSync(this.path, data, options);
    return this;
  }

  writeSync(
    data: Parameters<typeof writeFileSync>[1],
    options?: Parameters<typeof writeFileSync>[2],
  ): PathSync {
    this.parent.mkdirSync();
    writeFileSync(this.path, data, options);
    return this;
  }

  writeJSONSync<T>(
    data: T,
    replacer: Parameters<typeof JSON.stringify>[1] = null,
    space: Parameters<typeof JSON.stringify>[2] = "  ",
  ): PathSync {
    this.parent.mkdirSync();
    this.writeSync(JSON.stringify(data, replacer, space));
    return this;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Type wrangling.
  readDirSync: typeof readDirSyncType = (options: any) =>
    // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
    readdirSync(this.path, options) as any;

  symlinkSync(
    target: string | URL | Path,
    type?: Parameters<typeof symlinkSync>[2],
  ): PathSync {
    const targetPath = new PathSync(target);
    symlinkSync(
      this.path,
      targetPath.path,
      type as Exclude<Parameters<typeof symlinkSync>[2], undefined>, // 🤷
    );
    return targetPath;
  }

  realpathSync(): PathSync {
    return new PathSync(realpathSync(this.path));
  }

  statSync: typeof statSyncType = (options) =>
    // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
    statSync(this.path, options) as any;

  lstatSync: typeof lstatSyncType = (options) =>
    // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
    lstatSync(this.path, options) as any;

  chmodSync(mode: Parameters<typeof chmodSync>[1]): PathSync {
    chmodSync(this.path, mode);
    return this;
  }

  chmodXSync(): PathSync {
    const { mode } = this.statSync();
    this.chmodSync(
      mode | constants.S_IXUSR | constants.S_IXGRP | constants.S_IXOTH,
    );
    return this;
  }
}
