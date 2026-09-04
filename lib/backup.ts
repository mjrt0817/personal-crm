import { createClient } from "@/lib/supabase/server";

export const BACKUP_TABLES = [
  "companies",
  "contacts",
  "project_categories",
  "projects",
  "project_links",
  "tasks",
  "activities",
  "schedules",
  "project_drive_folders",
  "files",
  "project_gmail_syncs",
  "gmail_messages",
  "user_preferences",
  "project_invoices",
  "estimates",
  "estimate_items",
  "invoice_settings"
] as const;

export async function getBackupPayload() {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (authError || !userId) throw new Error("ログインが必要です。");

  const entries = await Promise.all(BACKUP_TABLES.map(async (table) => {
    const result = await supabase.from(table).select("*");
    // 旧migration環境でもバックアップ画面全体を壊さない。
    if (result.error && ["42P01", "PGRST205"].includes(result.error.code ?? "")) return [table, []] as const;
    if (result.error) throw new Error(`${table}: ${result.error.message}`);
    return [table, result.data ?? []] as const;
  }));

  return {
    format: "personal-crm-backup",
    version: "2.9",
    exported_at: new Date().toISOString(),
    note: "Google OAuth refresh token / secret information is intentionally excluded.",
    tables: Object.fromEntries(entries)
  };
}

function csvEscape(value: unknown) {
  if (value === null || value === undefined) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "\uFEFF";
  const headers = Array.from(rows.reduce((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));
  const body = [headers.join(","), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(","))];
  return "\uFEFF" + body.join("\r\n");
}

export const CSV_KINDS = {
  companies: { table: "companies", label: "取引先" },
  contacts: { table: "contacts", label: "担当者" },
  projects: { table: "projects", label: "案件" },
  tasks: { table: "tasks", label: "タスク" },
  activities: { table: "activities", label: "活動履歴" },
  schedules: { table: "schedules", label: "スケジュール" },
  invoices: { table: "project_invoices", label: "請求・入金" },
  estimates: { table: "estimates", label: "見積" }
} as const;

export async function getCsvRows(kind: keyof typeof CSV_KINDS) {
  const supabase = await createClient();
  const { data: claimsData, error: authError } = await supabase.auth.getClaims();
  if (authError || !claimsData?.claims?.sub) throw new Error("ログインが必要です。");
  const { table } = CSV_KINDS[kind];
  const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Record<string, unknown>[];
}
