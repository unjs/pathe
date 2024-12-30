import type NodePath from "node:path";

import * as path from "./path";

export * from "./path";

export type Pathe = Omit<typeof NodePath, "posix" | "win32">;

export const posix = path satisfies Pathe;

export const win32 = path satisfies Pathe;

export default path satisfies Pathe;
