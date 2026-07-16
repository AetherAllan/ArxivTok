import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ProviderProfile } from "@/features/settings/providerCore";
import type { Paper } from "@/types/paper";
import {
  loadTranslationCache,
  saveTranslationCache,
  type TranslationCache,
} from "./translationCache";
import {
  blockCacheKey,
  translationCacheId,
  type TranslationBlock,
} from "./translationCore";
import {
  restoreProtectedTokens,
  translatableBlocks,
  type PaperBlock,
  type PaperDocument,
} from "./paperDocument";
import { isRetryableTranslationError, translateBlocks } from "./translator";

// ponytail: model the title as one synthetic block so it reuses the existing
// cache, progress, cancellation, and retry path instead of owning parallel state.
export const PAPER_TITLE_TRANSLATION_ID = "__paper_title__";
const RETRY_DELAYS_MS = [3000, 6000, 12_000, 30_000] as const;

type Progress = { completed: number; pending: number; failed: number };

type TranslationRuntime = {
  session: string;
  controller: AbortController | null;
  pending: Map<string, TranslationBlock>;
  inFlight: Set<string>;
  failed: Map<string, TranslationBlock>;
  completed: Set<string>;
  cache: TranslationCache;
  cacheReady: Promise<void>;
  processing: boolean;
};

function createRuntime(session: string): TranslationRuntime {
  return {
    session,
    controller: null,
    pending: new Map(),
    inFlight: new Set(),
    failed: new Map(),
    completed: new Set(),
    cache: {},
    cacheReady: Promise.resolve(),
    processing: false,
  };
}

type Options = {
  active: boolean;
  paper: Paper | null;
  document: PaperDocument | null;
  providerProfile: ProviderProfile | null;
  targetLang: string;
  getProviderApiKey: (profileId: string) => Promise<string | null>;
};

function translationBlock(
  paper: Paper,
  block: PaperBlock,
): TranslationBlock | null {
  if (!block.translationSource) return null;
  return {
    id: block.id,
    text: block.translationSource,
    context: {
      paperTitle: paper.title,
      sectionTitle: block.sectionTitle,
      previousText: block.contextBefore,
    },
  };
}

async function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  await new Promise<void>((resolve) => {
    const finish = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const timeout = setTimeout(finish, ms);
    if (signal.aborted) finish();
    else signal.addEventListener("abort", finish, { once: true });
  });
}

export function useDocumentTranslation({
  active,
  paper,
  document,
  providerProfile,
  targetLang,
  getProviderApiKey,
}: Options) {
  const activeRef = useRef(active);
  const runtimeRef = useRef<TranslationRuntime>(createRuntime(""));
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Progress>({
    completed: 0,
    pending: 0,
    failed: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const blocksById = useMemo(
    () => new Map(document?.blocks.map((block) => [block.id, block]) ?? []),
    [document],
  );
  const total = useMemo(
    () => (document ? translatableBlocks(document).length + 1 : 0),
    [document],
  );
  const cacheId = useMemo(
    () =>
      paper && document && providerProfile
        ? translationCacheId(
            paper,
            providerProfile,
            targetLang,
            document.sourceHash,
          )
        : null,
    [document, paper, providerProfile, targetLang],
  );
  const session = `${cacheId ?? "none"}:${document?.sourceHash ?? "none"}`;

  const refreshProgress = useCallback((runtime = runtimeRef.current) => {
    if (runtimeRef.current !== runtime) return;
    // A request remains pending from the user's perspective until its result is
    // committed. Use a union because transient failures briefly requeue the
    // same IDs before the request's finally block releases them.
    const waiting = new Set([...runtime.pending.keys(), ...runtime.inFlight]);
    setProgress({
      completed: runtime.completed.size,
      pending: waiting.size,
      failed: runtime.failed.size,
    });
  }, []);

  useEffect(() => {
    runtimeRef.current.controller?.abort();
    const runtime = createRuntime(session);
    runtimeRef.current = runtime;
    setTranslations({});
    setError(null);
    refreshProgress(runtime);
    runtime.cacheReady = cacheId
      ? loadTranslationCache(cacheId).then((loaded) => {
          if (runtimeRef.current === runtime) runtime.cache = loaded;
        })
      : Promise.resolve();
    return () => runtime.controller?.abort();
  }, [cacheId, refreshProgress, session]);

  useEffect(() => {
    activeRef.current = active;
    if (!active) {
      const runtime = runtimeRef.current;
      runtime.controller?.abort();
      runtime.pending.clear();
      refreshProgress(runtime);
    }
  }, [active, refreshProgress]);

  const drainQueue = useCallback(
    async function runQueue() {
      const runtime = runtimeRef.current;
      if (
        runtime.processing ||
        !activeRef.current ||
        !paper ||
        !providerProfile ||
        !cacheId
      ) {
        return;
      }
      runtime.processing = true;
      let retryCount = 0;
      try {
        const apiKey =
          providerProfile.kind === "google"
            ? null
            : await getProviderApiKey(providerProfile.id);
        if (providerProfile.kind !== "google" && !apiKey) {
          throw new Error("The selected provider has no API key");
        }
        while (
          runtime.pending.size > 0 &&
          activeRef.current &&
          runtimeRef.current === runtime
        ) {
          const title = runtime.pending.get(PAPER_TITLE_TRANSLATION_ID);
          // The title is a tiny, immediately visible request. Finish it first so
          // the reader shows useful progress before larger paragraph batches.
          const batch = title
            ? [title]
            : [...runtime.pending.values()].slice(0, 6);
          for (const block of batch) {
            runtime.pending.delete(block.id);
            runtime.inFlight.add(block.id);
          }
          refreshProgress(runtime);
          const currentController = new AbortController();
          runtime.controller = currentController;
          try {
            const results = await translateBlocks(
              providerProfile,
              apiKey,
              targetLang,
              batch,
              currentController.signal,
            );
            if (
              runtimeRef.current !== runtime ||
              currentController.signal.aborted
            ) {
              return;
            }
            const restored: Record<string, string> = {};
            const requests = new Map(batch.map((block) => [block.id, block]));
            for (const result of results) {
              const sourceBlock = blocksById.get(result.id);
              const requestBlock = requests.get(result.id);
              if (!requestBlock) {
                throw new Error(
                  "Translation result does not match the active document",
                );
              }
              if (result.id === PAPER_TITLE_TRANSLATION_ID) {
                restored[result.id] = result.text.trim();
              } else {
                if (!sourceBlock) {
                  throw new Error(
                    "Translation result does not match the active document",
                  );
                }
                restored[result.id] = restoreProtectedTokens(
                  result.text,
                  sourceBlock.protectedTokens,
                );
              }
            }
            // Do not expose or cache a partial batch. A later damaged marker must
            // not leave earlier paragraphs looking successfully translated.
            for (const [id, markdown] of Object.entries(restored)) {
              const requestBlock = requests.get(id)!;
              runtime.completed.add(id);
              runtime.failed.delete(id);
              runtime.cache[blockCacheKey(requestBlock)] = markdown;
            }
            setTranslations((current) => ({ ...current, ...restored }));
            void saveTranslationCache(cacheId, runtime.cache).catch(
              () => undefined,
            );
            setError(null);
            retryCount = 0;
          } catch (translationError) {
            if (currentController.signal.aborted) return;
            if (isRetryableTranslationError(translationError)) {
              // Keep the visible batch first. As long as translation mode stays
              // active, transient provider failures retry with a capped backoff.
              runtime.pending = new Map([
                ...batch.map((block) => [block.id, block] as const),
                ...runtime.pending,
              ]);
              refreshProgress(runtime);
              const delay =
                RETRY_DELAYS_MS[
                  Math.min(retryCount, RETRY_DELAYS_MS.length - 1)
                ];
              retryCount += 1;
              await waitForRetry(delay, currentController.signal);
              if (currentController.signal.aborted || !activeRef.current)
                return;
              continue;
            }
            for (const block of batch) runtime.failed.set(block.id, block);
            for (const block of runtime.pending.values()) {
              runtime.failed.set(block.id, block);
            }
            runtime.pending.clear();
            setError(
              translationError instanceof Error
                ? translationError.message
                : "Unknown translation error",
            );
            refreshProgress(runtime);
            break;
          } finally {
            // A replaced session may already be translating blocks with the same
            // arXiv-generated IDs. The old request must not release their state.
            if (runtimeRef.current === runtime) {
              for (const block of batch) runtime.inFlight.delete(block.id);
            }
          }
          refreshProgress(runtime);
        }
      } catch (translationError) {
        if (runtimeRef.current !== runtime || !activeRef.current) return;
        // Credential access happens before a request controller exists. Treat a
        // failure here as retryable by the user, but do not leave pending work in
        // place or finally would immediately start the same failing loop again.
        for (const block of runtime.pending.values()) {
          runtime.failed.set(block.id, block);
        }
        runtime.pending.clear();
        setError(
          translationError instanceof Error
            ? translationError.message
            : "Unknown translation error",
        );
      } finally {
        // Session replacement deliberately permits the new queue to start before
        // the aborted promise settles. Only the current owner may clear shared
        // controller/processing state or schedule more work.
        if (runtimeRef.current === runtime) {
          runtime.processing = false;
          runtime.controller = null;
          refreshProgress(runtime);
          if (activeRef.current && runtime.pending.size > 0) {
            void runQueue();
          }
        }
      }
    },
    [
      blocksById,
      cacheId,
      getProviderApiKey,
      paper,
      providerProfile,
      refreshProgress,
      targetLang,
    ],
  );

  const enqueue = useCallback(
    async (ids: string[]) => {
      if (!activeRef.current || !paper) return;
      const runtime = runtimeRef.current;
      await runtime.cacheReady;
      if (runtimeRef.current !== runtime || !activeRef.current) return;
      const cached: Record<string, string> = {};
      for (const id of ids) {
        const sourceBlock = blocksById.get(id);
        const block =
          id === PAPER_TITLE_TRANSLATION_ID
            ? {
                id,
                text: paper.title,
                context: { paperTitle: paper.title },
              }
            : sourceBlock
              ? translationBlock(paper, sourceBlock)
              : null;
        if (
          !block ||
          runtime.completed.has(id) ||
          runtime.inFlight.has(id) ||
          runtime.failed.has(id) ||
          runtime.pending.has(id)
        ) {
          continue;
        }
        const cachedMarkdown = runtime.cache[blockCacheKey(block)];
        if (cachedMarkdown) {
          runtime.completed.add(id);
          cached[id] = cachedMarkdown;
        } else {
          runtime.pending.set(id, block);
        }
      }
      if (Object.keys(cached).length > 0) {
        setTranslations((current) => ({ ...current, ...cached }));
      }
      refreshProgress(runtime);
      void drainQueue();
    },
    [blocksById, drainQueue, paper, refreshProgress],
  );

  const retryFailed = useCallback(() => {
    const runtime = runtimeRef.current;
    for (const block of runtime.failed.values())
      runtime.pending.set(block.id, block);
    runtime.failed.clear();
    setError(null);
    refreshProgress(runtime);
    void drainQueue();
  }, [drainQueue, refreshProgress]);

  const cancel = useCallback(() => {
    const runtime = runtimeRef.current;
    runtime.controller?.abort();
    runtime.pending.clear();
    refreshProgress(runtime);
  }, [refreshProgress]);

  return {
    translations,
    progress,
    total,
    error,
    enqueue,
    retryFailed,
    cancel,
  };
}
