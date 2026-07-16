import { describe, expect, test } from "bun:test";
import { RateLimiter } from "./rateLimiter";

describe("RateLimiter cancellation", () => {
  test("does not start an aborted queued task and keeps the queue moving", async () => {
    const limiter = new RateLimiter(0);
    let release!: () => void;
    const first = limiter.schedule(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const controller = new AbortController();
    let abortedTaskStarted = false;
    const aborted = limiter.schedule(async () => {
      abortedTaskStarted = true;
    }, controller.signal);
    const final = limiter.schedule(async () => "done");

    controller.abort();
    await Promise.resolve();
    release();
    await first;
    await expect(aborted).rejects.toMatchObject({ name: "AbortError" });
    expect(abortedTaskStarted).toBe(false);
    expect(await final).toBe("done");
  });

  test("aborts while waiting for the minimum interval", async () => {
    const limiter = new RateLimiter(60_000);
    await limiter.schedule(async () => undefined);
    const controller = new AbortController();
    const waiting = limiter.schedule(async () => undefined, controller.signal);
    controller.abort();
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
  });
});
