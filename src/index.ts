import {
  cp,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { default as trash } from "trash";
import { xdgCache, xdgConfig, xdgData, xdgState } from "xdg-basedir";
import type { readDirType } from "./readDir";

export class Path {
  // @ts-expect-error ts(2564): False positive. https://github.com/microsoft/TypeScript/issues/32194
  #path: string;
  constructor(path: string | URL | Path) {
    if (path instanceof Path) {
      this.#setNormalizedPath(path.#path);
      return;
    }
    if (path instanceof URL) {
      this.#setNormalizedPath(fileURLToPath(path));
      return;
    }
    if (typeof path === "string") {
      this.#setNormalizedPath(path);
      return;
    }
    throw new Error("Invalid path");
  }

  #setNormalizedPath(path: string): void {
    this.#path = join(path);
  }

  toString(): string {
    return this.#path;
  }

  /// Constructs a new path by appending the given path segments.
  // TODO: accept `Path` inputs?
  join(...segments: string[]): Path {
    return new Path(join(this.#path, ...segments));
  }

  extendBasename(suffix: string): Path {
    const joinedSuffix = join(suffix);
    if (joinedSuffix !== basename(joinedSuffix)) {
      throw new Error("Invalid suffix to extend file name.");
    }
    // TODO: join basename and dirname instead?
    return new Path(this.#path + joinedSuffix);
  }

  get parent(): Path {
    return new Path(dirname(this.#path));
  }

  // Normally I'd stick with `node`'s name, but I think `.dirname` is a
  // particularly poor name. So we support `.dirname` for discovery but mark it
  // as deprecated, even if it will never be removed.
  /** @deprecated Alias for `.parent`. */
  get dirname(): Path {
    return this.parent;
  }

  get basename(): Path {
    return new Path(basename(this.#path));
  }

  get extension(): string {
    this.#mustNotHaveTrailingSlash();
    return extname(this.#path);
  }

  // Normally I'd stick with `node`'s name, but I think `.extname` is a
  // particularly poor name. So we support `.extname` for discovery but mark it
  // as deprecated, even if it will never be removed.
  /** @deprecated Alias for `.extension`. */
  get extname(): string {
    return this.extension;
  }

  #mustNotHaveTrailingSlash(): void {
    if (this.#path.endsWith("/")) {
      throw new Error(
        "Path ends with a slash, which cannot be treated as a file.",
      );
    }
  }

  async exists(constraints?: {
    mustBe: "file" | "directory";
  }): Promise<boolean> {
    let stats: Awaited<ReturnType<typeof stat>>;
    try {
      stats = await stat(this.#path);
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
        this.#mustNotHaveTrailingSlash();
        if (stats.isFile()) {
          return true;
        }
        throw new Error(`Path exists but is not a file: ${this.#path}`);
      }
      case "directory": {
        if (stats.isDirectory()) {
          return true;
        }
        throw new Error(`Path exists but is not a directory: ${this.#path}`);
      }
      default: {
        throw new Error("Invalid path type constraint");
      }
    }
  }

  async existsAsFile(): Promise<boolean> {
    return this.exists({ mustBe: "file" });
  }

  async existsAsDir(): Promise<boolean> {
    return this.exists({ mustBe: "directory" });
  }

  // I don't think `mkdir` is a great name, but it does match the
  // well-established canonical commandline name. So in this case we keep the
  // awkward abbreviation.
  /** Defaults to `recursive: true`. */
  async mkdir(options?: Parameters<typeof mkdir>[1]): Promise<Path> {
    const optionsObject = (() => {
      if (typeof options === "string" || typeof options === "number") {
        return { mode: options };
      }
      return options ?? {};
    })();
    await mkdir(this.#path, { recursive: true, ...optionsObject });
    return this;
  }

  // TODO: check idempotency semantics when the destination exists and is a folder.
  /** Returns the destination path. */
  async cp(
    destination: string | URL | Path,
    options?: Parameters<typeof cp>[2],
  ): Promise<Path> {
    await cp(this.#path, new Path(destination).#path, options);
    return new Path(destination);
  }

  // TODO: check idempotency semantics when the destination exists and is a folder.
  async rename(destination: string | URL | Path): Promise<void> {
    await rename(this.#path, new Path(destination).#path);
  }

  /** Create a temporary dir inside the global temp dir for the current user. */
  static async makeTempDir(prefix?: string): Promise<Path> {
    return new Path(
      await mkdtemp(new Path(tmpdir()).join(prefix ?? "js-temp-").toString()),
    );
  }

  async trash(): Promise<void> {
    await trash(this.#path, { glob: false });
  }

  async rm(options?: Parameters<typeof rm>[1]): Promise<void> {
    await rm(this.#path, options);
  }

  /**
   * Equivalent to:
   *
   *     .rm({ recursive: true, force: true, ...(options ?? {}) })
   *
   */
  async rm_rf(options?: Parameters<typeof rm>[1]): Promise<void> {
    await this.rm({ recursive: true, force: true, ...(options ?? {}) });
  }

  async fileText(): Promise<string> {
    return readFile(this.#path, "utf-8");
  }

  async fileJSON<T>(): Promise<T> {
    return JSON.parse(await this.fileText());
  }

  /** Creates intermediate directories if they do not exist.
   *
   * Returns the original `Path` (for chaining).
   */
  async write(
    data: Parameters<typeof writeFile>[1],
    options?: Parameters<typeof writeFile>[2],
  ): Promise<Path> {
    await this.parent.mkdir();
    await writeFile(this.#path, data, options);
    return this;
  }

  /**
   * If only `data` is provided, this is equivalent to:
   *
   *     .write(JSON.stringify(data, null, "  "));
   *
   * `replacer` and `space` can also be specified, making this equivalent to:
   *
   *     .write(JSON.stringify(data, replacer, space));
   *
   * Returns the original `Path` (for chaining).
   */
  async writeJSON<T>(
    data: T,
    replacer: Parameters<typeof JSON.stringify>[1] = null,
    space: Parameters<typeof JSON.stringify>[2] = "  ",
  ): Promise<Path> {
    await this.write(JSON.stringify(data, replacer, space));
    return this;
  }

  // Normally we'd add a `@deprecated` alias named `.readdir`, but that would
  // differ only by capitalization of a single non-leading character. This can
  // be a bit confusing, especially when autocompleting. So for this function in
  // particular we don't include an alias.
  readDir: typeof readDirType = (options) =>
    // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
    readdir(this.#path, options as any) as any;

  static get homedir(): Path {
    return new Path(homedir());
  }

  static xdg = {
    cache: new Path(xdgCache ?? Path.homedir.join(".cache")),
    config: new Path(xdgConfig ?? Path.homedir.join(".config")),
    data: new Path(xdgData ?? Path.homedir.join(".local/share")),
    state: new Path(xdgState ?? Path.homedir.join(".local/state")),
  };
}
