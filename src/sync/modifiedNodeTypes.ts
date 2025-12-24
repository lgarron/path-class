// Note: this file is `.ts` rather than `.d.ts` to ensure it ends up in the `tsc` output.

import type { Abortable } from "node:events";
import type {
  BigIntStats,
  Dirent,
  Mode,
  ObjectEncodingOptions,
  StatSyncOptions,
  Stats,
} from "node:fs";

export declare function readFileSyncType(
  options?: {
    encoding?: null | undefined;
    flag?: string | undefined;
  } | null,
): NonSharedBuffer;
export declare function readFileSyncType(
  options:
    | {
        encoding: BufferEncoding;
        flag?: string | undefined;
      }
    | BufferEncoding,
): string;
export declare function readFileSyncType(
  options?:
    | (ObjectEncodingOptions & {
        flag?: string | undefined;
      })
    | BufferEncoding
    | null,
): string | NonSharedBuffer;
export type WriteFileOptions =
  | (ObjectEncodingOptions &
      Abortable & {
        mode?: Mode | undefined;
        flag?: string | undefined;
        flush?: boolean | undefined;
      })
  | BufferEncoding
  | null;

export declare function readDirSyncType(
  options?:
    | {
        encoding: BufferEncoding | null;
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      }
    | BufferEncoding
    | null,
): string[];
export declare function readDirSyncType(
  options:
    | {
        encoding: "buffer";
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      }
    | "buffer",
): Buffer[];
export declare function readDirSyncType(
  options?:
    | (ObjectEncodingOptions & {
        withFileTypes?: false | undefined;
        recursive?: boolean | undefined;
      })
    | BufferEncoding
    | null,
): string[] | Buffer[];
export declare function readDirSyncType(
  options: ObjectEncodingOptions & {
    withFileTypes: true;
    recursive?: boolean | undefined;
  },
): Dirent[];
export declare function readDirSyncType(options: {
  encoding: "buffer";
  withFileTypes: true;
  recursive?: boolean | undefined;
}): Dirent<Buffer>[];

export declare function statSyncType(options?: undefined): Stats;
export declare function statSyncType(
  options?: StatSyncOptions & {
    bigint?: false | undefined;
    throwIfNoEntry: false;
  },
): Stats | undefined;
export declare function statSyncType(
  options: StatSyncOptions & {
    bigint: true;
    throwIfNoEntry: false;
  },
): BigIntStats | undefined;
export declare function statSyncType(
  options?: StatSyncOptions & {
    bigint?: false | undefined;
  },
): Stats;
export declare function statSyncType(
  options: StatSyncOptions & {
    bigint: true;
  },
): BigIntStats;
export declare function statSyncType(
  options: StatSyncOptions & {
    bigint: boolean;
    throwIfNoEntry?: false | undefined;
  },
): Stats | BigIntStats;
export declare function statSyncType(
  options?: StatSyncOptions,
): Stats | BigIntStats | undefined;

export declare const lstatSyncType: typeof statSyncType;
