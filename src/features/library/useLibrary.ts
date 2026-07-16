import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDurableStateQueue,
  type DurableStateQueue,
} from "@/lib/durableStateQueue";
import type { Paper } from "@/types/paper";
import { deletePdfFiles, downloadPaperPdf, openPdf } from "./downloads";
import {
  deleteOfflinePaperPackage,
  downloadOfflinePaper,
} from "./offlinePaper";
import { createDownloadTaskSlot, type DownloadTask } from "./downloadTask";
import {
  loadLibraryState,
  persistHistory,
  persistOfflinePapers,
  persistPdfDownloads,
  persistSaved,
  removeSaved,
  summarizeDownloads,
  upsertByArxivId,
  upsertHistory,
  upsertSaved,
  type OfflinePaperEntry,
  type PdfDownloadEntry,
  type HistoryEntry,
  type SavedEntry,
} from "./library";

export class PdfMetadataError extends Error {
  override name = "PdfMetadataError";
}

function useDurableQueue<T>(
  initial: T,
  commit: (value: T) => void,
): DurableStateQueue<T> {
  const queue = useRef<DurableStateQueue<T> | null>(null);
  if (!queue.current) queue.current = createDurableStateQueue(initial, commit);
  return queue.current;
}

export function useLibrary() {
  const [saved, setSaved] = useState<SavedEntry[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [offlinePapers, setOfflinePapers] = useState<OfflinePaperEntry[]>([]);
  const [pdfDownloads, setPdfDownloads] = useState<PdfDownloadEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [recoveryWarning, setRecoveryWarning] = useState(false);
  const [downloadTask, setDownloadTask] = useState<DownloadTask | null>(null);
  const downloadSlot = useMemo(
    () => createDownloadTaskSlot(setDownloadTask),
    [],
  );
  const savedQueue = useDurableQueue<SavedEntry[]>([], setSaved);
  const historyQueue = useDurableQueue<HistoryEntry[]>([], setHistory);
  const offlineQueue = useDurableQueue<OfflinePaperEntry[]>(
    [],
    setOfflinePapers,
  );
  const pdfQueue = useDurableQueue<PdfDownloadEntry[]>([], setPdfDownloads);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadLibraryState();
      if (cancelled) return;
      savedQueue.replace(loaded.saved);
      historyQueue.replace(loaded.history);
      offlineQueue.replace(loaded.offlinePapers);
      pdfQueue.replace(loaded.pdfDownloads);
      setRecoveryWarning(loaded.recovered);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [historyQueue, offlineQueue, pdfQueue, savedQueue]);

  useEffect(
    () => () => {
      const task = downloadSlot.current();
      if (task?.kind === "reader") task.controller.abort();
    },
    [downloadSlot],
  );

  const savedIds = useMemo(
    () => new Set(saved.map((paper) => paper.arxivId)),
    [saved],
  );
  const offlineById = useMemo(
    () => new Map(offlinePapers.map((entry) => [entry.arxivId, entry])),
    [offlinePapers],
  );
  const pdfById = useMemo(
    () => new Map(pdfDownloads.map((entry) => [entry.arxivId, entry])),
    [pdfDownloads],
  );
  const downloads = useMemo(
    () => summarizeDownloads(offlinePapers, pdfDownloads),
    [offlinePapers, pdfDownloads],
  );

  const toggleSave = useCallback(
    async (paper: Paper) => {
      await savedQueue.mutate(
        (previous) =>
          previous.some((item) => item.arxivId === paper.arxivId)
            ? removeSaved(previous, paper.arxivId)
            : upsertSaved(previous, paper),
        persistSaved,
      );
    },
    [savedQueue],
  );

  const unsave = useCallback(
    async (arxivId: string) => {
      await savedQueue.mutate(
        (previous) => removeSaved(previous, arxivId),
        persistSaved,
      );
    },
    [savedQueue],
  );

  const recordHistory = useCallback(
    async (paper: Paper) => {
      await historyQueue.mutate(
        (previous) => upsertHistory(previous, paper),
        persistHistory,
      );
    },
    [historyQueue],
  );

  const clearHistory = useCallback(async () => {
    await historyQueue.mutate(() => [], persistHistory);
  }, [historyQueue]);

  const downloadOffline = useCallback(
    async (paper: Paper) => {
      const controller = new AbortController();
      const task: DownloadTask = {
        kind: "reader",
        arxivId: paper.arxivId,
        controller,
      };
      downloadSlot.begin(task);
      const previousEntry = offlineQueue
        .value()
        .find((entry) => entry.arxivId === paper.arxivId);
      try {
        const entry = await downloadOfflinePaper(paper, controller.signal);
        try {
          await offlineQueue.mutate(
            (previous) => upsertByArxivId(previous, entry),
            persistOfflinePapers,
          );
        } catch (error) {
          // A refresh reuses the previous package path, so deleting it would also
          // destroy the still-valid metadata target. Only a brand-new orphan can
          // be safely removed after metadata persistence fails.
          if (!previousEntry) {
            await deleteOfflinePaperPackage(entry).catch(() => undefined);
          }
          throw error;
        }
        return entry;
      } finally {
        downloadSlot.finish(task);
      }
    },
    [downloadSlot, offlineQueue],
  );

  const downloadPdf = useCallback(
    async (paper: Paper) => {
      const task: DownloadTask = { kind: "pdf", arxivId: paper.arxivId };
      downloadSlot.begin(task);
      try {
        const entry = await downloadPaperPdf(paper);
        try {
          await pdfQueue.mutate(
            (previous) => upsertByArxivId(previous, entry),
            persistPdfDownloads,
          );
        } catch {
          // The user-visible SAF copy may already exist and must not be deleted
          // just because application metadata could not be written.
          throw new PdfMetadataError();
        }
        return entry;
      } finally {
        downloadSlot.finish(task);
      }
    },
    [downloadSlot, pdfQueue],
  );

  const deleteOffline = useCallback(
    async (arxivId: string) => {
      const entry = offlineById.get(arxivId);
      if (!entry) return;
      await offlineQueue.mutate(
        (previous) => previous.filter((item) => item.arxivId !== arxivId),
        persistOfflinePapers,
      );
      await deleteOfflinePaperPackage(entry);
    },
    [offlineById, offlineQueue],
  );

  const deleteDownloads = useCallback(
    async (arxivId: string) => {
      const offlineEntry = offlineById.get(arxivId);
      const pdfEntry = pdfById.get(arxivId);
      await offlineQueue.mutate(
        (previous) => previous.filter((item) => item.arxivId !== arxivId),
        persistOfflinePapers,
      );
      await pdfQueue.mutate(
        (previous) => previous.filter((item) => item.arxivId !== arxivId),
        persistPdfDownloads,
      );
      if (offlineEntry) await deleteOfflinePaperPackage(offlineEntry);
      if (pdfEntry) await deletePdfFiles(pdfEntry);
    },
    [offlineById, offlineQueue, pdfById, pdfQueue],
  );
  const clearRecoveryWarning = useCallback(() => setRecoveryWarning(false), []);

  return {
    ready,
    recoveryWarning,
    clearRecoveryWarning,
    saved,
    history,
    downloads,
    offlinePapers,
    pdfDownloads,
    downloadTask,
    downloadingId: downloadTask?.arxivId ?? null,
    canCancelDownload: downloadTask?.kind === "reader",
    isSaved: (arxivId: string) => savedIds.has(arxivId),
    hasOfflinePaper: (arxivId: string) => offlineById.has(arxivId),
    hasPdf: (arxivId: string) => pdfById.has(arxivId),
    getOfflinePaper: (arxivId: string) => offlineById.get(arxivId),
    getPdf: (arxivId: string) => pdfById.get(arxivId),
    toggleSave,
    unsave,
    recordHistory,
    clearHistory,
    downloadOffline,
    downloadPdf,
    openPdf,
    deleteOffline,
    deleteDownloads,
    cancelDownload: () => {
      const task = downloadSlot.current();
      if (task?.kind === "reader") task.controller.abort();
    },
  };
}
