export type DownloadTask =
  | { kind: "reader"; arxivId: string; controller: AbortController }
  | { kind: "pdf"; arxivId: string };

export function createDownloadTaskSlot(
  commit: (task: DownloadTask | null) => void,
) {
  let current: DownloadTask | null = null;
  return {
    current: () => current,
    begin(task: DownloadTask) {
      if (current) throw new Error("Another download is already running");
      current = task;
      commit(task);
    },
    finish(task: DownloadTask) {
      // Only the task that acquired the slot may release it. This prevents a
      // late finally block from clearing a newer download's visible state.
      if (current !== task) return;
      current = null;
      commit(null);
    },
  };
}
