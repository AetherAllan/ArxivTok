export const LATEST_RELEASE_URL =
  "https://api.github.com/repos/AetherAllan/Paprism/releases/latest";

export type ReleaseInfo = {
  version: string;
  url: string;
};

export function parseVersion(value: string): [number, number, number] | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(value.trim());
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = parseVersion(current);
  const latestParts = parseVersion(latest);
  if (!currentParts || !latestParts) return false;
  for (let index = 0; index < currentParts.length; index += 1) {
    if (latestParts[index]! !== currentParts[index]!) {
      return latestParts[index]! > currentParts[index]!;
    }
  }
  return false;
}

export function parseRelease(payload: unknown): ReleaseInfo | null {
  if (!payload || typeof payload !== "object") return null;
  const release = payload as Record<string, unknown>;
  if (release.draft === true || release.prerelease === true) return null;
  if (
    typeof release.tag_name !== "string" ||
    !parseVersion(release.tag_name) ||
    typeof release.html_url !== "string" ||
    !release.html_url.startsWith("https://github.com/AetherAllan/Paprism/")
  ) {
    return null;
  }
  return {
    version: release.tag_name.replace(/^v/, ""),
    url: release.html_url,
  };
}

export async function fetchLatestRelease(
  signal?: AbortSignal,
): Promise<ReleaseInfo> {
  const response = await fetch(LATEST_RELEASE_URL, {
    signal,
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`);
  const release = parseRelease(await response.json());
  if (!release) throw new Error("GitHub returned an invalid release");
  return release;
}
