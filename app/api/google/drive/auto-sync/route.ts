import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { syncProjectDriveFolder } from "@/lib/google-drive-server";

const MIN_INTERVAL_MS = 9 * 60 * 1000;

export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.json({ ok: true, skipped: true, reason: "demo", syncedFolders: 0 });
  }

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId.trim() : "";
  if (!projectId) return NextResponse.json({ ok: false, error: "projectId is required" }, { status: 400 });

  const supabase = await createClient();
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (claimsError || !userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const { data: folders, error } = await supabase
    .from("project_drive_folders")
    .select("id,last_sync_at,last_sync_error")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  if (error) {
    if (["42P01", "PGRST205"].includes(error.code ?? "")) {
      return NextResponse.json({ ok: true, skipped: true, reason: "not_configured", syncedFolders: 0 });
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const now = Date.now();
  const stale = (folders ?? []).filter((folder) => {
    if (folder.last_sync_error || !folder.last_sync_at) return true;
    const elapsed = now - new Date(folder.last_sync_at).getTime();
    return elapsed < 0 || elapsed >= MIN_INTERVAL_MS;
  });

  if (!stale.length) {
    return NextResponse.json({ ok: true, skipped: true, reason: "fresh", syncedFolders: 0 });
  }

  let syncedFolders = 0;
  const errors: string[] = [];

  for (const folder of stale) {
    try {
      await syncProjectDriveFolder(supabase, userId, folder.id);
      syncedFolders += 1;
    } catch (syncError) {
      errors.push(syncError instanceof Error ? syncError.message : "Google Drive同期に失敗しました。");
    }
  }

  if (!syncedFolders && errors.length) {
    return NextResponse.json({ ok: false, error: errors[0], errors, syncedFolders }, { status: 500 });
  }

  return NextResponse.json({ ok: true, syncedFolders, errors });
}
