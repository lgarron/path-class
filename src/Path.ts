import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  xdgCache,
  xdgConfig,
  xdgData,
  xdgRuntime,
  xdgState,
} from "xdg-basedir";
import type {
  lstatType,
  readDirType,
  readFileType,
  statType,
} from "./modifiedNodeTypes";

// Note that (non-static) functions in this file are defined using `function(…)
// { … }` rather than arrow functions, specifically because we want `this` to
// operate on the `Path` instance.

type WritableData = Parameters<typeof writeFile>[1] | ReadableStream | Response;
async function wrangleWritableData(
  data: WritableData | Promise<WritableData>,
): Promise<Parameters<typeof writeFile>[1]> {
  data = await data;
  if (data instanceof Response) {
    data = data.body ? Readable.fromWeb(data.body) : new Uint8Array(0);
  }
  if (data instanceof ReadableStream) {
    data = Readable.fromWeb(data);
  }
  return data;
}

export enum ResolutionPrefix {
  Absolute = "absolute",
  Relative = "relative",
  Bare = "bare",
}

function resolutionPrefix(pathString: string): ResolutionPrefix {
  if (pathString.startsWith("/")) {
    return ResolutionPrefix.Absolute;
  } else if (pathString.startsWith("./")) {
    return ResolutionPrefix.Relative;
  } else if (pathString === ".") {
    return ResolutionPrefix.Relative;
  }
  return ResolutionPrefix.Bare;
}

export class Path {
  // @ts-expect-error ts(2564): False positive. https://github.com/microsoft/TypeScript/issues/32194
  #path: string;
  /**
   * If `path` is a string starting with `file:///`, it will be parsed as a file URL.
   */
  constructor(path: string | URL | Path) {
    const s = Path.#pathlikeToString(path);
    this.#setNormalizedPath(s);
  }

  get resolutionPrefix(): ResolutionPrefix {
    return resolutionPrefix(this.#path);
  }

  /**
   * Similar to `new URL(path, base)`, but accepting and returning `Path` objects.
   * Note that `base` must be one of:
   *
   * - a valid second argument to `new URL(…)`.
   * - a `Path` representing an absolute path.
   *
   */
  static resolve(path: string | URL | Path, base: string | URL | Path): Path {
    const baseURL = (() => {
      if (!(base instanceof Path)) {
        if (typeof base === "string" && !base.startsWith("file://")) {
          return pathToFileURL(base);
        }
        return base;
      }
      if (!base.isAbsolutePath()) {
        throw new Error(
          "The `base` arg to `Path.resolve(…)` must be an absolute path.",
        );
      }
      return pathToFileURL(base.#path);
    })();
    return new Path(new URL(Path.#pathlikeToString(path), baseURL));
  }

  static #pathlikeToString(path: string | URL | Path): string {
    if (path instanceof Path) {
      return path.#path;
    }
    if (path instanceof URL) {
      return fileURLToPath(path);
    }
    if (typeof path === "string") {
      // TODO: allow turning off this heuristic?
      if (path.startsWith("file:///")) {
        return fileURLToPath(path);
      }
      return path;
    }
    throw new Error("Invalid path");
  }

  // Preserves the `ResolutionPrefix` status when possible.
  #setNormalizedPath(path: string): void {
    const prefix = resolutionPrefix(path);
    this.#path = join(path);
    if (prefix === ResolutionPrefix.Relative && !this.#path.startsWith(".")) {
      // We don't have to handle the case of `"."`, as it already starts with `"."`
      this.#path = `./${this.#path}`;
    }
  }

  isAbsolutePath(): boolean {
    return this.resolutionPrefix === ResolutionPrefix.Absolute;
  }

  toFileURL(): URL {
    if (!this.isAbsolutePath()) {
      throw new Error(
        "Tried to convert to file URL when the path is not absolute.",
      );
    }
    return pathToFileURL(this.#path);
  }

  /**
   * The `Path` can have a trailing slash, indicating that it represents a
   * directory. (If there is no trailing slash, it can represent either a file
   * or a directory.)
   *
   * Some operations will refuse to treat a directory path as a file path. This
   * function identifies such paths.
   */
  hasTrailingSlash(): boolean {
    // TODO: handle Windows semantically
    return this.#path.endsWith("/");
  }

  /**
   * Same as `.toString()`, but more concise.
   */
  get path() {
    return this.#path;
  }

  toString(): string {
    return this.#path;
  }

  /** Constructs a new path by appending the given path segments.
   * This follows `node` semantics for absolute paths: leading slashes in the given descendant segments are ignored.
   */
  join(...segments: (string | Path)[]): Path {
    const segmentStrings = segments.map((segment) => {
      const s = stringifyIfPath(segment);
      if (resolutionPrefix(s) === ResolutionPrefix.Absolute) {
        throw new Error(
          "Arguments to `.join(…)` cannot be absolute. Use `.asRelative()` to convert them first if needed.",
        );
      }
      return s;
    });
    return new Path(join(this.#path, ...segmentStrings));
  }

  /**
   * Adjust the prefix to construct a relative path.
   *
   * | Example input   | Output          |
   * |-----------------|-----------------|
   * | `"bare"`        | `"./bare"`      |
   * | `"./relative"`  | `"./relative"`  |
   * | `"../up-first"` | `"../up-first"` |
   * | `"/absolute"`   | `"./absolute"`  |
   *
   */
  asRelative(): Path {
    return new Path(`./${this.#path}`);
  }

  /**
   * Adjust the prefix to construct an absolute path.
   *
   * | Example input   | Output        |
   * |-----------------|---------------|
   * | `"bare"`        | `"/bare"`     |
   * | `"./relative"`  | `"/relative"` |
   * | `"../up-first"` | `"/up-first"` |
   * | `"/absolute"`   | `"/absolute"` |
   *
   */
  asAbsolute(): Path {
    return new Path(join("/", this.#path));
  }

  /**
   * Adjust the prefix to construct a bare path. Note that this returns `"."` if
   * there are no named paths left.
   *
   * | Example input     | Output       |
   * |-------------------|--------------|
   * | `"bare"`          | `"bare"`     |
   * | `"./relative"  `  | `"relative"` |
   * | `"/absolute"`     | `"absolute"` |
   * | `"."`             | `"."`        |
   * | `"down-first/.."` | `"."`        |
   * | `"../up-first"`   | (error)      |
   * | `".."`            | (error)      |
   *
   * Specify `parentTraversalPrefixHandling` in the `options` if you would like
   * to strip or keep resolution prefixes like `../` rather than erroring.
   *
   * | Example input        | Output with `{ parentTraversalPrefixHandling: "strip" }` |
   * |----------------------|----------------------------------------------------------|
   * | `"../up-first"`      | `"up-first"`                                             |
   * | `".."`               | `"."`                                                    |
   *
   * | Example input        | Output with `{ parentTraversalPrefixHandling: "keep" }` |
   * |----------------------|---------------------------------------------------------|
   * | `"../up-first"`      | `"../up-first"`                                         |
   * | `".."`               | `".."`                                                  |
   *
   * If you need the output to start with a named component and return values
   * like `.`, `..`, `../`, or `../…` are not okay, pass
   * `requireNamedComponentPrefix: true`. This is useful if the path represents
   * an `npm`-style package name (e.g. `"typescript"`, `"@biomejs/biome"`).
   *
   */
  asBare(options?: {
    parentTraversalPrefixHandling?: "error" | "strip" | "keep";
    requireNamedComponentPrefix?: boolean;
  }): Path {
    const path = new Path(join(".", this.#path));
    if (!path.#path.startsWith("../") && path.#path !== "..") {
      if (
        options?.requireNamedComponentPrefix &&
        path.resolutionPrefix === ResolutionPrefix.Relative
      ) {
        throw new Error("Output does not start with a named component.");
      }
      return path;
    }
    const parentTraversalHandling =
      options?.parentTraversalPrefixHandling ?? "error";
    switch (parentTraversalHandling) {
      case "error": {
        throw new Error(
          'Converting path to a bare path resulted in a `..` traversal prefix. Pass `"strip"` or `"keep"` as the `parentTraversalHandling` option to avoid an error.',
        );
      }
      case "strip": {
        let newPath = path.#path.replace(/^(\.\.\/)+/, "");
        if (["", ".."].includes(newPath)) {
          newPath = ".";
        }
        const output = new Path(newPath);
        if (
          options?.requireNamedComponentPrefix &&
          output.resolutionPrefix === ResolutionPrefix.Relative
        ) {
          throw new Error("Output does not start with a named component.");
        }
        return new Path(newPath);
      }
      case "keep": {
        if (options?.requireNamedComponentPrefix) {
          throw new Error("Output does not start with a named component.");
        }
        return path;
      }
    }
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
    mustNotHaveTrailingSlash(this);
    return extname(this.#path);
  }

  // Normally I'd stick with `node`'s name, but I think `.extname` is a
  // particularly poor name. So we support `.extname` for discovery but mark it
  // as deprecated, even if it will never be removed.
  /** @deprecated Alias for `.extension`. */
  get extname(): string {
    return this.extension;
  }

  // TODO: find a neat way to dedup with the sync version?
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
        mustNotHaveTrailingSlash(this);
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

  read: typeof readFileType = (options) =>
    // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
    readFile(this.#path, options as any) as any;

  async readText(): Promise<string> {
    return readFile(this.#path, "utf-8");
  }

  /**
   * Reads JSON from the given file and parses it. No validation is performed
   * (beyond JSON parsing).
   *
   * An optional `fallback` value can be specified. It will be used if (and only
   * if) the file does not exist.
   *
   */

  // biome-ignore lint/suspicious/noExplicitAny: Allow a default of `any` to match `JSON.parse(…)`.
  async readJSON<T = any>(options?: { fallback?: T }): Promise<T> {
    try {
      return JSON.parse(await this.readText());
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

  /** Creates intermediate directories if they do not exist.
   *
   * Returns the original `Path` (for chaining).
   */
  async write(
    data: WritableData | Promise<WritableData>,
    options?: Parameters<typeof writeFile>[2],
  ): Promise<Path> {
    await this.parent.mkdir();
    await writeFile(this.#path, await wrangleWritableData(data), options);
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

  /** Returns the destination path. */
  async symlink(
    target: string | URL | Path,
    type?: Parameters<typeof symlink>[2],
  ): Promise<Path> {
    const targetPath = new Path(target);
    await symlink(
      this.path,
      targetPath.path,
      type as Exclude<Parameters<typeof symlink>[2], undefined>, // 🤷
    );
    return targetPath;
  }

  // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
  stat: typeof statType = (...options) => stat(this.#path, ...options) as any;

  // I don't think `lstat` is a great name, but it does match the
  // well-established canonical system call. So in this case we keep the
  // awkward abbreviation.
  lstat: typeof lstatType = (...options) =>
    // biome-ignore lint/suspicious/noExplicitAny: Needed to wrangle the types.
    lstat(this.#path, ...options) as any;

  static get homedir(): Path {
    return new Path(homedir());
  }

  static xdg = {
    cache: new Path(xdgCache ?? Path.homedir.join(".cache")),
    config: new Path(xdgConfig ?? Path.homedir.join(".config")),
    data: new Path(xdgData ?? Path.homedir.join(".local/share")),
    state: new Path(xdgState ?? Path.homedir.join(".local/state")),
    /**
     * {@link Path.xdg.runtime} does not have a default value. Consider
     * {@link Path.xdg.runtimeWithStateFallback} if you need a fallback but do not have a particular fallback in mind.
     */
    runtime: xdgRuntime ? new Path(xdgRuntime) : undefined,
    runtimeWithStateFallback: xdgRuntime
      ? new Path(xdgRuntime)
      : new Path(xdgState ?? Path.homedir.join(".local/state")),
  };

  /** Chainable function to print the path. Prints the same as:
   *
   *     if (args.length > 0) {
   *      console.log(...args);
   *     }
   *     console.log(this.path);
   *
   */
  // biome-ignore lint/suspicious/noExplicitAny: This is the correct type, based on `console.log(…)`.
  debugPrint(...args: any[]): Path {
    if (args.length > 0) {
      console.log(...args);
    }
    console.log(this.#path);
    return this;
  }
}

/**
 * This function is useful to serialize any `Path`s in a structure to pass on to
 * functions that do not know about the `Path` class, e.g.
 *
 *     function process(args: (string | Path)[]) {
 *       const argsAsStrings = args.map(stringifyIfPath);
 *     }
 *
 */
export function stringifyIfPath<T>(value: T | Path): T | string {
  if (value instanceof Path) {
    return value.toString();
  }
  return value;
}

export function mustNotHaveTrailingSlash(path: Path): void {
  if (path.hasTrailingSlash()) {
    throw new Error(
      "Path ends with a slash, which cannot be treated as a file.",
    );
  }
}
