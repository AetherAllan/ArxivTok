import { describe, expect, test } from "bun:test";
import { createDurableStateQueue } from "./durableStateQueue";

describe("durable state queue", () => {
  test("serializes mutations around the last persisted value", async () => {
    const commits: number[] = [];
    const writes: number[] = [];
    let releaseFirst!: () => void;
    const firstWrite = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const queue = createDurableStateQueue(0, (value) => commits.push(value));

    const first = queue.mutate(
      (value) => value + 1,
      async (value) => {
        writes.push(value);
        await firstWrite;
      },
    );
    const second = queue.mutate(
      (value) => value + 1,
      async (value) => void writes.push(value),
    );

    await Promise.resolve();
    expect(writes).toEqual([1]);
    expect(commits).toEqual([]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(writes).toEqual([1, 2]);
    expect(commits).toEqual([1, 2]);
    expect(queue.value()).toBe(2);
  });

  test("keeps the previous value after a failed write", async () => {
    const commits: number[] = [];
    const queue = createDurableStateQueue(4, (value) => commits.push(value));

    await expect(
      queue.mutate(
        (value) => value + 1,
        async () => {
          throw new Error("disk full");
        },
      ),
    ).rejects.toThrow("disk full");
    expect(queue.value()).toBe(4);
    expect(commits).toEqual([]);

    await queue.mutate(
      (value) => value + 2,
      async () => undefined,
    );
    expect(queue.value()).toBe(6);
  });
});
