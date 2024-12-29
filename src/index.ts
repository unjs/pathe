import * as path from "./path";

export * from "./path";

export const win32 = path satisfies Omit<typeof import("node:path").win32, "posix" | "win32">;
export default path;
