import { Path } from "./Path";

/**
 * This function is useful to serialize any `Path`s in a structure to pass on to
 * functions that do not know about the `Path` class, e.g.
 *
 *     function process(args: (string | Path)[]) {
 *       const argsAsStrings = args.map(stringifyIfPath);
 *     }
 *
 */
export function stringifyIfPath<T>(value: Exclude<T, Path> | Path): T | string {
  if (value instanceof Path) {
    return value.toString();
  }
  return value;
}
