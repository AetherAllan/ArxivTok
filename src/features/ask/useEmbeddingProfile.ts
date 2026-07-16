import { useCallback, useEffect, useState } from "react";
import type { EmbeddingProfile } from "./askTypes";
import type { ProviderProfile } from "@/features/settings/providerCore";
import {
  clearEmbeddingProfile,
  getEmbeddingApiKey,
  loadEmbeddingProfile,
  saveEmbeddingProfile,
} from "./embeddingProviders";

export function useEmbeddingProfile() {
  const [profile, setProfile] = useState<EmbeddingProfile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadEmbeddingProfile().then((loaded) => {
      if (!cancelled) {
        setProfile(loaded);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const saveProfile = useCallback(
    async (next: ProviderProfile, apiKey?: string) => {
      if (next.kind === "google") throw new Error("Google cannot embed text");
      const embeddingProfile: EmbeddingProfile = { ...next, kind: next.kind };
      await saveEmbeddingProfile(embeddingProfile, apiKey);
      setProfile(embeddingProfile);
    },
    [],
  );
  const clear = useCallback(async () => {
    await clearEmbeddingProfile();
    setProfile(null);
  }, []);
  const deleteProfile = useCallback(async () => clear(), [clear]);

  return {
    ready,
    profile,
    profiles: profile ? [profile] : [],
    activeProfileId: profile?.id ?? null,
    saveProfile,
    deleteProfile,
    setActiveProfileId: async () => undefined,
    clear,
    getApiKey: getEmbeddingApiKey,
  };
}
