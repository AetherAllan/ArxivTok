import { describe, expect, test } from "bun:test";
import { createDownloadTaskSlot, type DownloadTask } from "./downloadTask";

describe("download task slot", () => {
  test("rejects concurrent work and only lets the owner release the slot", () => {
    const commits: (DownloadTask | null)[] = [];
    const slot = createDownloadTaskSlot((task) => commits.push(task));
    const first: DownloadTask = { kind: "pdf", arxivId: "first" };
    const second: DownloadTask = { kind: "pdf", arxivId: "second" };

    slot.begin(first);
    expect(() => slot.begin(second)).toThrow("already running");
    slot.finish(second);
    expect(slot.current()).toBe(first);
    slot.finish(first);
    expect(slot.current()).toBeNull();
    expect(commits).toEqual([first, null]);
  });
});
