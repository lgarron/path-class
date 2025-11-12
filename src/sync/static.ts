import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { Path } from "../Path";

declare module "../Path" {
  namespace Path {
    export function makeTempDirSync(prefix?: string): Path;
  }
}

Path.makeTempDirSync = (prefix?: string): Path =>
  new Path(
    mkdtempSync(new Path(tmpdir()).join(prefix ?? "js-temp-").toString()),
  );
