// Note: this file is `.ts` rather than `.d.ts` to ensure it ends up in the `tsc` output.

import type { Abortable } from "node:events";
import type {
  BigIntStats,
  Dirent,
  ObjectEncodingOptions,
  OpenMode,
  StatOptions,
  Stats,
} from "node:fs";

// Modifying the type of `readdir(…)` from `node:fs/promises` to remove the
// first parameter is difficult, if not impossible. So we give up and duplicate
// the types manually. This ensures ergonomic types, such as an inferred return
// type of `string[]` when `options` is not passed.

export declare function readDirType(
  options?:
    | (ObjectEncodingOptions & {
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      })
    | BufferEncoding
    | null,
): Promise<string[]>;

export declare function readDirType(
  options:
    | {
        encoding: "buffer";
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      }
    | "buffer",
): Promise<Buffer[]>;

export declare function readDirType(
  options?:
    | (ObjectEncodingOptions & {
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      })
    | BufferEncoding
    | null,
): Promise<string[] | Buffer[]>;

export declare function readDirType(
  options: ObjectEncodingOptions & {
    withFileTypes: true;
    recursive?: boolean | undefined;
  },
): Promise<Dirent[]>;

export declare function readDirType(options: {
  encoding: "buffer";
  withFileTypes: true;
  recursive?: boolean | undefined;
}): Promise<Dirent<Buffer>[]>;

export declare function readFileType(
  options?:
    | ({
        encoding?: null | undefined;
        flag?: OpenMode | undefined;
      } & Abortable)
    | null,
): Promise<Buffer>;
export declare function readFileType(
  options:
    | ({
        encoding: BufferEncoding;
        flag?: OpenMode | undefined;
      } & Abortable)
    | BufferEncoding,
): Promise<string>;
export declare function readFileType(
  options?:
    | (ObjectEncodingOptions &
        Abortable & {
          flag?: OpenMode | undefined;
        })
    | BufferEncoding
    | null,
): Promise<string | Buffer>;

export declare function statType(
  opts?: StatOptions & {
    bigint?: false | undefined;
  },
): Promise<Stats>;
export declare function statType(
  opts: StatOptions & {
    bigint: true;
  },
): Promise<BigIntStats>;
export declare function statType(
  opts?: StatOptions,
): Promise<Stats | BigIntStats>;

export declare const lstatType: typeof statType;
