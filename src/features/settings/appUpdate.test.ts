import { describe, expect, spyOn, test } from "bun:test";
import {
  fetchLatestRelease,
  isNewerVersion,
  parseRelease,
  parseVersion,
} from "./appUpdate";

describe("app updates", () => {
  test("compares stable semantic versions", () => {
    expect(isNewerVersion("1.0.2", "v1.0.3")).toBe(true);
    expect(isNewerVersion("1.2.0", "1.1.9")).toBe(false);
    expect(isNewerVersion("1.0.2", "v1.0.2")).toBe(false);
    expect(parseVersion("1.0")).toBeNull();
  });

  test("accepts only a stable release from the Paprism repository", () => {
    expect(
      parseRelease({
        tag_name: "v1.2.3",
        html_url: "https://github.com/AetherAllan/Paprism/releases/tag/v1.2.3",
        draft: false,
        prerelease: false,
      }),
    ).toEqual({
      version: "1.2.3",
      url: "https://github.com/AetherAllan/Paprism/releases/tag/v1.2.3",
    });
    expect(
      parseRelease({
        tag_name: "v2.0.0-beta.1",
        html_url: "https://github.com/AetherAllan/Paprism/releases/tag/beta",
        prerelease: true,
      }),
    ).toBeNull();
    expect(
      parseRelease({
        tag_name: "v2.0.0",
        html_url: "https://example.com/download",
      }),
    ).toBeNull();
  });

  test("surfaces a GitHub failure for the UI to degrade silently", async () => {
    const fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("", { status: 503 }),
    );
    try {
      await expect(fetchLatestRelease()).rejects.toThrow("GitHub HTTP 503");
    } finally {
      fetchMock.mockRestore();
    }
  });
});
