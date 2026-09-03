"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const CLIENT_INTERVAL_MS = 5 * 60 * 1000;
const STORAGE_KEY = "personal-crm:last-calendar-auto-sync-at";

export default function AutoCalendarSync() {
  const router = useRouter();

  useEffect(() => {
    let disposed = false;
    let running = false;

    async function sync(force = false) {
      if (disposed || running || document.visibilityState === "hidden") return;

      const now = Date.now();
      const previous = Number(window.localStorage.getItem(STORAGE_KEY) || "0");
      if (!force && previous && now - previous < CLIENT_INTERVAL_MS - 5000) return;

      running = true;
      try {
        const response = await fetch("/api/google/calendar/auto-sync", {
          method: "POST",
          headers: { "content-type": "application/json" },
          cache: "no-store"
        });
        const result = await response.json().catch(() => ({}));
        window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
        if (!disposed && response.ok && result?.synced) {
          const changed = Number(result.updated || 0) + Number(result.linked || 0) + Number(result.deleted || 0);
          window.dispatchEvent(new CustomEvent("personal-crm:calendar-sync", { detail: { ok: true, ...result } }));
          if (changed > 0) router.refresh();
        } else if (!disposed && !response.ok) {
          window.dispatchEvent(new CustomEvent("personal-crm:calendar-sync", { detail: { ok: false, error: result?.error } }));
        }
      } catch {
        // ネットワークが一時的に切れていても画面操作は妨げない。次回の自動同期で再試行する。
      } finally {
        running = false;
      }
    }

    const initialTimer = window.setTimeout(() => sync(false), 1200);
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
  }, [router]);

  return null;
}
