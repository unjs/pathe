import type { PlatformPath } from "node:path";
import * as path from "./path";

export * from "./path";

export const posix = path satisfies Omit<PlatformPath['posix'], "posix" | "win32">;
export const win32 = path satisfies Omit<PlatformPath['win32'], "posix" | "win32">;

export default path;
