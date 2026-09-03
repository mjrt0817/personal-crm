"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CLIENT_INTERVAL_MS = 10 * 60 * 1000;

export default function AutoDriveSync({ projectId, enabled }: { projectId: string; enabled: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let disposed = false;
    let running = false;
    const storageKey = `personal-crm:last-drive-auto-sync-at:${projectId}`;

    async function sync(force = false) {
      if (disposed || running || document.visibilityState === "hidden") return;

      const now = Date.now();
      const previous = Number(window.localStorage.getItem(storageKey) || "0");
      if (!force && previous && now - previous < CLIENT_INTERVAL_MS - 5000) return;

      running = true;
      try {
        const response = await fetch("/api/google/drive/auto-sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ projectId }),
          cache: "no-store"
        });
        const result = await response.json().catch(() => ({}));
        window.localStorage.setItem(storageKey, String(Date.now()));
        if (!disposed && (Number(result?.syncedFolders || 0) > 0 || !response.ok)) router.refresh();
      } catch {
        // 一時的なネットワークエラーでは画面操作を止めない。次回の表示・フォーカス時に再試行する。
      } finally {
        running = false;
      }
    }

    const initialTimer = window.setTimeout(() => sync(false), 1600);
    const interval = window.setInterval(() => sync(false), CLIENT_INTERVAL_MS);
    const onFocus = () => sync(false);
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync(false);
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      disposed = true;
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled, projectId, router]);

  return null;
}
