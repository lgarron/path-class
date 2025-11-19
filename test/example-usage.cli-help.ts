import { Path } from "../src";

const exampleUsage = (
  await Path.resolve("./example-usage.ts", import.meta.url).readText()
).replace('"../src"', '"path-class"');
console.log(exampleUsage);
