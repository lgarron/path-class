import {
  appendFileSync,
  chmodSync,
  cpSync,
  lstatSync,
  mkdirSync,
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
import { mustNotHaveTrailingSlash, Path } from "../Path";
import "./static";
import { constants } from "node:fs/promises";
import type {
  lstatSyncType,
  readDirSyncType,
  readFileSyncType,
  statSyncType,
} from "./modifiedNodeTypes";

// Note that (non-static) functions in this file are defined using `function(…)
// { … }` rather than arrow functions, specifically because we want `this` to
// operate on the `Path` instance.

declare module "../Path" {
  interface Path {
    existsSync(constraints?: { mustBe: "file" | "directory" }): boolean;
    existsAsFileSync(): boolean;
    existsAsDirSync(): boolean;

    mkdirSync(options?: Parameters<typeof mkdirSync>[1]): Path;
    cpSync(
      destination: string | URL | Path,
      options?: Parameters<typeof cpSync>[2],
    ): Path;
    renameSync(destination: string | URL | Path): void;

    rmSync(options?: Parameters<typeof rmSync>[1]): void;
    rmDirSync(options?: Parameters<typeof rmdirSync>[1]): void;
    rm_rfSync(options?: Parameters<typeof rmSync>[1]): void;

    readSync: typeof readFileSyncType;
    readTextSync(): string;
    readJSONSync<T>(options?: { fallback?: T }): T;

    appendFileSync(
      data: Parameters<typeof appendFileSync>[1],
      options?: Parameters<typeof appendFileSync>[2],
    ): Path;

    writeSync(
      data: Parameters<typeof writeFileSync>[1],
      options?: Parameters<typeof writeFileSync>[2] | undefined,
    ): Path;
    writeJSONSync<T>(
      data: T,
      replacer?: Parameters<typeof JSON.stringify>[1],
      space?: Parameters<typeof JSON.stringify>[2],
    ): Path;

    readDirSync: typeof readDirSyncType;

    /** Returns the destination path. */
    symlinkSync(
      target: string | URL | Path,
      type?: Parameters<typeof symlinkSync>[2],
    ): Path;
    realpathSync(): Path;

    statSync: typeof statSyncType;
    lstatSync: typeof lstatSyncType;
    chmodSync(mode: Parameters<typeof chmodSync>[1]): Path;
    chmodXSync(): Path;
  }
}

// TODO: find a neat way to dedup with the async version? // lint-sync-code-expect-error
Path.prototype.existsSync = function (constraints?: {
  mustBe: "file" | "directory";
}): boolean {
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
      throw new Error(`Path exists but is not a file: ${this.path}`);
    }
    case "directory": {
      if (stats.isDirectory()) {
        return true;
      }
      throw new Error(`Path exists but is not a directory: ${this.path}`);
    }
    default: {
      throw new Error("Invalid path type constraint");
    }
  }
};

Path.prototype.existsAsFileSync = function (): boolean {
  return this.existsSync({ mustBe: "file" });
};

Path.prototype.existsAsDirSync = function (): boolean {
  return this.existsSync({ mustBe: "directory" });
};

Path.prototype.mkdirSync = function (
  options?: Parameters<typeof mkdirSync>[1],
): Path {
  const optionsObject = (() => {
    if (typeof options === "string" || typeof options === "number") {
      return { mode: options };
    }
    return options ?? {};
  })();
  mkdirSync(this.path, { recursive: true, ...optionsObject });
  return this;
};

Path.prototype.cpSync = function (
  destination: string | URL | Path,
  options?: Parameters<typeof cpSync>[2],
): Path {
  cpSync(this.path, new Path(destination).path, options);
  return new Path(destination);
};

Path.prototype.renameSync = function (destination: string | URL | Path): void {
  renameSync(this.path, new Path(destination).path);
};

Path.prototype.rmSync = function (
  options?: Parameters<typeof rmSync>[1],
): void {
  rmSync(this.path, options);
};

Path.prototype.rmDirSync = function (): void {
  rmdirSync(this.path);
};

Path.prototype.rm_rfSync = function (
  options?: Parameters<typeof rmSync>[1],
): void {
  this.rmSync({ recursive: true, force: true, ...(options ?? {}) });
};

Path.prototype.readSync = function () {
  /** @ts-expect-error ts(2683) */
  return readFileSync(this.path);
} as typeof readFileSyncType;

Path.prototype.readTextSync = function (): string {
  return readFileSync(this.path, "utf-8");
};

Path.prototype.readJSONSync = function <T>(options?: { fallback?: T }): T {
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
};

Path.prototype.appendFileSync = function (
  data: Parameters<typeof appendFileSync>[1],
  options?: Parameters<typeof appendFileSync>[2],
): Path {
  appendFileSync(this.path, data, options);
  return this;
};

Path.prototype.writeSync = function (
  data: Parameters<typeof writeFileSync>[1],
  options?: Parameters<typeof writeFileSync>[2],
): Path {
  this.parent.mkdirSync();
  writeFileSync(this.path, data, options);
  return this;
};

Path.prototype.writeJSONSync = function <T>(
  data: T,
  replacer: Parameters<typeof JSON.stringify>[1] = null,
  space: Parameters<typeof JSON.stringify>[2] = "  ",
): Path {
  this.parent.mkdirSync();
  this.writeSync(JSON.stringify(data, replacer, space));
  return this;
};

/** @ts-expect-error ts(2322): Wrangle types */
Path.prototype.readDirSync = function (options) {
  // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
  return readdirSync(this.path, options as any);
};

Path.prototype.symlinkSync = function (
  target: string | URL | Path,
  type?: Parameters<typeof symlinkSync>[2],
): Path {
  const targetPath = new Path(target);
  symlinkSync(
    this.path,
    targetPath.path,
    type as Exclude<Parameters<typeof symlinkSync>[2], undefined>, // 🤷
  );
  return targetPath;
};

Path.prototype.realpathSync = function (): Path {
  return new Path(realpathSync(this.path));
};

/** @ts-expect-error ts(2322): Wrangle types */
Path.prototype.statSync = function (
  options?: Parameters<typeof statSync>[1],
): ReturnType<typeof statSync> {
  return statSync(this.path, options);
};

/** @ts-expect-error ts(2322): Wrangle types */
Path.prototype.lstatSync = function (
  options?: Parameters<typeof lstatSync>[1],
): ReturnType<typeof lstatSync> {
  return lstatSync(this.path, options);
};

Path.prototype.chmodSync = function (
  mode: Parameters<typeof chmodSync>[1],
): Path {
  chmodSync(this.path, mode);
  return this;
};

Path.prototype.chmodXSync = function (): Path {
  const { mode } = this.statSync();
  this.chmodSync(
    mode |
      constants.S_IRWXU |
      constants.S_IXUSR |
      constants.S_IXGRP |
      constants.S_IXOTH,
  );
  return this;
};
