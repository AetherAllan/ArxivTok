export type DurableStateQueue<T> = {
  replace(value: T): void;
  value(): T;
  mutate(
    update: (current: T) => T,
    persist: (next: T) => Promise<void>,
  ): Promise<T>;
};

/**
 * Serialize read-modify-write operations around the last durable value.
 * React state is committed only after persistence succeeds, so callers can
 * trust that a resolved mutation survived an app restart.
 */
export function createDurableStateQueue<T>(
  initial: T,
  commit: (value: T) => void,
): DurableStateQueue<T> {
  let current = initial;
  let tail: Promise<void> = Promise.resolve();

  return {
    replace(value) {
      current = value;
      commit(value);
    },
    value() {
      return current;
    },
    mutate(update, persist) {
      const run = async () => {
        const next = update(current);
        await persist(next);
        current = next;
        commit(next);
        return next;
      };
      const result = tail.then(run, run);
      // A failed write must reject its caller without blocking later attempts.
      tail = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  };
}
