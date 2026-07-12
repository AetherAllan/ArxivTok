import { beforeEach, describe, expect, mock, test } from "bun:test";

const values = new Map<string, string>();
mock.module("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: async (key: string) => {
      values.delete(key);
    },
  },
}));

const { loadPdfDownloads } = await import("./library");

describe("download metadata migration", () => {
  beforeEach(() => values.clear());

  test("moves legacy PDF rows without retaining duplicate Paper fields", async () => {
    values.set(
      "arxivtok.downloads",
      JSON.stringify([
        {
          id: "legacy-duplicate",
          arxivId: "1234.5678v2",
          title: "Paper",
          authors: ["Ada"],
          localUri: "file:///paper.pdf",
          exportUri: "content://paper.pdf",
          downloadedAt: 42,
        },
      ]),
    );

    const result = await loadPdfDownloads();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      arxivId: "1234.5678v2",
      localUri: "file:///paper.pdf",
      exported: true,
    });
    expect(values.has("arxivtok.downloads")).toBe(false);
    expect(JSON.parse(values.get("arxivtok.pdfDownloads") ?? "[]")[0]).not.toHaveProperty("id");
  });
});
