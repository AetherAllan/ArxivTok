import { useCallback, useEffect, useRef, useState } from "react";
import Constants from "expo-constants";
import {
  fetchLatestRelease,
  isNewerVersion,
  type ReleaseInfo,
} from "./appUpdate";

export type AppUpdateState = {
  status: "checking" | "current" | "available" | "error";
  release: ReleaseInfo | null;
};

export function useAppUpdate() {
  const currentVersion = Constants.expoConfig?.version ?? "0.0.0";
  const [state, setState] = useState<AppUpdateState>({
    status: "checking",
    release: null,
  });
  const controller = useRef<AbortController | null>(null);

  const check = useCallback(async () => {
    controller.current?.abort();
    const nextController = new AbortController();
    controller.current = nextController;
    setState((previous) => ({ ...previous, status: "checking" }));
    try {
      const release = await fetchLatestRelease(nextController.signal);
      if (nextController.signal.aborted) return;
      setState({
        status: isNewerVersion(currentVersion, release.version)
          ? "available"
          : "current",
        release,
      });
    } catch {
      if (!nextController.signal.aborted) {
        setState({ status: "error", release: null });
      }
    }
  }, [currentVersion]);

  useEffect(() => {
    void check();
    return () => controller.current?.abort();
  }, [check]);

  return { ...state, currentVersion, check };
}
