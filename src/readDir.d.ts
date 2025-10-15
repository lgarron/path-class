import type { Dirent, ObjectEncodingOptions } from "node:fs";

// Modifying the type of `readdir(…)` from `node:fs/promises` to remove the
// first parameter is difficult, if not impossible. So we give up and duplicate
// the types manually. This ensures ergonomic types, such as an inferred return
// type of `string[]` when `options` is not passed.

declare function readDirType(
  options?:
    | (ObjectEncodingOptions & {
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      })
    | BufferEncoding
    | null,
): Promise<string[]>;

declare function readDirType(
  options:
    | {
        encoding: "buffer";
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      }
    | "buffer",
): Promise<Buffer[]>;

declare function readDirType(
  options?:
    | (ObjectEncodingOptions & {
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      })
    | BufferEncoding
    | null,
): Promise<string[] | Buffer[]>;

declare function readDirType(
  options: ObjectEncodingOptions & {
    withFileTypes: true;
    recursive?: boolean | undefined;
  },
): Promise<Dirent[]>;

declare function readDirType(options: {
  encoding: "buffer";
  withFileTypes: true;
  recursive?: boolean | undefined;
}): Promise<Dirent<Buffer>[]>;
