"use client";

import { useEffect, useState } from "react";

type SyncState = { kind: "ok" | "error"; message: string } | null;

export default function CalendarSyncToast() {
  const [state, setState] = useState<SyncState>(null);

  useEffect(() => {
    let timer: number | undefined;
    function onSync(event: Event) {
      const detail = (event as CustomEvent).detail ?? {};
      const changed = Number(detail.updated || 0) + Number(detail.linked || 0) + Number(detail.deleted || 0);
      if (detail.ok && changed > 0) {
        setState({ kind: "ok", message: `Google Calendarを自動同期しました（${changed}件更新）` });
      } else if (!detail.ok && detail.error) {
        setState({ kind: "error", message: `Calendar自動同期：${detail.error}` });
      } else {
        return;
      }
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setState(null), 5000);
    }
    window.addEventListener("personal-crm:calendar-sync", onSync);
    return () => {
      window.removeEventListener("personal-crm:calendar-sync", onSync);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  if (!state) return null;
  return <div className={`sync-toast ${state.kind}`}>{state.message}</div>;
}
