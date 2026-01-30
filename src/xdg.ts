/** biome-ignore-all lint/complexity/useLiteralKeys: TODO: https://github.com/biomejs/biome/discussions/7572 */

import { Path } from "./Path";

function env(): typeof import("node:process").env {
  const { env } = globalThis.process.getBuiltinModule("node:process");
  return env;
}

function varWithoutFallback(envVar: `XDG_${string}`): Path | undefined {
  const value = env()[envVar];
  return value ? Path.fromString(value) : undefined;
}

function varWithFallback(
  envVar: `XDG_${string}`,
  fallbackInHomeDir: string,
): Path {
  return varWithoutFallback(envVar) ?? Path.homedir.join(fallbackInHomeDir);
}

// This is a level of indirection to avoid accessing env vars or `homedir()`
// until needed, to avoid permissions prompts / flags for `deno` when these are
// not needed for the calling code.
//
// TODO: cache values?
class XDG {
  get cache() {
    return varWithFallback("XDG_CACHE_HOME", ".cache");
  }
  get config() {
    return varWithFallback("XDG_CONFIG_HOME", ".config");
  }
  get data() {
    return varWithFallback("XDG_DATA_HOME", ".local/share");
  }
  get state() {
    return varWithFallback("XDG_STATE_HOME", ".local/state");
  }
  /**
   * {@link Path.xdg.runtime} does not have a default value. Consider
   * {@link Path.xdg.runtimeWithStateFallback} if you need a fallback but do not have a particular fallback in mind.
   */
  get runtime() {
    return varWithoutFallback("XDG_RUNTIME_DIR");
  }
  get runtimeWithStateFallback() {
    return varWithoutFallback("XDG_RUNTIME_DIR") ?? this.state;
  }
}

export const xdg = new XDG();
