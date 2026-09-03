import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { pullGoogleCalendar } from "@/lib/google-calendar-server";

const MIN_INTERVAL_MS = 4 * 60 * 1000;

export async function POST() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.json({ ok: true, skipped: true, reason: "demo" });
  }

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const { data: connection, error: connectionError } = await supabase
    .from("google_calendar_connections")
    .select("last_sync_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (connectionError) {
    if (["42P01", "PGRST205"].includes(connectionError.code ?? "")) {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_configured" });
    }
    return NextResponse.json({ ok: false, error: connectionError.message }, { status: 500 });
  }
  if (!connection) return NextResponse.json({ ok: true, skipped: true, reason: "not_connected" });

  if (connection.last_sync_at) {
    const elapsed = Date.now() - new Date(connection.last_sync_at).getTime();
    if (elapsed >= 0 && elapsed < MIN_INTERVAL_MS) {
      return NextResponse.json({ ok: true, skipped: true, reason: "throttled", nextInMs: MIN_INTERVAL_MS - elapsed });
    }
  }

  try {
    const result = await pullGoogleCalendar(supabase, userId, { incremental: true });
    return NextResponse.json({ ok: true, synced: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Google Calendar自動同期に失敗しました。";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
