// Util to normalize windows paths to posix
export function normalizeWindowsPath(input = "") {
  if (!input) {
    return input;
  }

  let normalized = input;
  if (normalized.includes("\\")) {
    normalized = normalized.replace(/\\/g, "/");
  }

  const driveLetter = normalized[0];
  if (
    driveLetter &&
    normalized[1] === ":" &&
    normalized[2] === "/" &&
    driveLetter >= "a" &&
    driveLetter <= "z"
  ) {
    normalized = driveLetter.toUpperCase() + normalized.slice(1);
  }

  return normalized;
}
