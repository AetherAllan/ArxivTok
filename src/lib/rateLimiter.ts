/**
 * Serializes async work with a minimum gap between starts.
 * arXiv ToU: ≤ 1 request every 3 seconds, single connection.
 */
export class RateLimiter {
  private chain: Promise<void> = Promise.resolve();
  private lastStart = 0;

  constructor(private readonly minIntervalMs: number) {}

  schedule<T>(fn: () => Promise<T>, signal?: AbortSignal): Promise<T> {
    const run = async (): Promise<T> => {
      throwIfAborted(signal);
      const wait = Math.max(
        0,
        this.minIntervalMs - (Date.now() - this.lastStart),
      );
      if (wait > 0) {
        await sleep(wait, signal);
      }
      throwIfAborted(signal);
      this.lastStart = Date.now();
      return fn();
    };

    const result = this.chain.then(run, run);
    // Keep the queue moving even if one call fails.
    this.chain = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

function abortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timeout);
      reject(abortError());
    };
    const timeout = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) onAbort();
    else signal?.addEventListener("abort", onAbort, { once: true });
  });
}
