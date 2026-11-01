import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/backup";

// Vendor-neutral *source events*, NOT accounting journal entries. It deliberately
// does not infer recognition dates, tax classification or debit/credit accounts.
type Row = Record<string, unknown>;
function str(value: unknown) { return typeof value === "string" ? value : ""; }
function num(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : 0; }

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  if (authError || !claims?.claims?.sub) return new Response("認証が必要です", { status: 401 });
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") || new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return new Response("年度が不正です", { status: 400 });
  const start = `${year}-01-01`;
  const end = `${year + 1}-01-01`;
  // A small personal CRM can paginate, rather than silently truncate at the
  // PostgREST default maximum number of rows.
  async function readAll(table: "project_invoices" | "companies"): Promise<Row[]> {
    const out: Row[] = [];
    for (let from = 0; from < 100000; from += 500) {
      const { data, error } = await supabase.from(table).select("*").range(from, from + 499);
      if (error) throw new Error(`${table}: ${error.message}`);
      const batch = (data || []) as Row[];
      out.push(...batch);
      if (batch.length < 500) return out;
    }
    throw new Error("出力上限を超えています。期間を分けてください。");
  }
  try {
    const [invoices, companies] = await Promise.all([readAll("project_invoices"), readAll("companies")]);
    const companyNames = new Map(companies.map(c => [str(c.id), str(c.name)]));
    const rows: Row[] = [];
    for (const invoice of invoices) {
      const status = str(invoice.status);
      if (status === "cancelled" || status === "planned") continue;
      const id = str(invoice.id);
      const common = {
        "元システム": "personal-crm", "請求ID": id,
        "請求書番号": str(invoice.reference_no), "取引先ID": str(invoice.company_id),
        "取引先名": companyNames.get(str(invoice.company_id)) || "",
        "案件ID": str(invoice.project_id), "請求件名": str(invoice.title),
        "請求金額(税込・円)": num(invoice.amount), "税率(設定値)": invoice.tax_rate ?? "",
        "支払期限": str(invoice.due_date), "請求ステータス": status,
        "備考": str(invoice.memo),
        "会計処理要確認": "売上計上日・税区分・前受金/売掛金・入金口座を会計側で確認",
      };
      const issued = str(invoice.invoice_date);
      if (issued >= start && issued < end) rows.push({ ...common, "イベント識別子": `${id}:issued`, "イベント種別": "請求書発行", "イベント日": issued, "イベント金額(円)": num(invoice.amount) });
      const paid = str(invoice.paid_date);
      if (status === "paid" && paid >= start && paid < end) rows.push({ ...common, "イベント識別子": `${id}:paid`, "イベント種別": "入金確認", "イベント日": paid, "イベント金額(円)": num(invoice.amount) });
      // Missing dates are surfaced as review items instead of disappearing.
      if (!issued && (status === "invoiced" || status === "paid")) rows.push({ ...common, "イベント識別子": `${id}:missing-invoice-date`, "イベント種別": "要確認：請求日未登録", "イベント日": "", "イベント金額(円)": num(invoice.amount) });
      if (status === "paid" && !paid) rows.push({ ...common, "イベント識別子": `${id}:missing-paid-date`, "イベント種別": "要確認：入金日未登録", "イベント日": "", "イベント金額(円)": num(invoice.amount) });
    }
    rows.sort((a, b) => str(a["イベント日"]).localeCompare(str(b["イベント日"])) || str(a["イベント識別子"]).localeCompare(str(b["イベント識別子"])));
    const header = ["元システム","イベント識別子","イベント種別","イベント日","イベント金額(円)","請求ID","請求書番号","取引先ID","取引先名","案件ID","請求件名","請求金額(税込・円)","税率(設定値)","支払期限","請求ステータス","備考","会計処理要確認"];
    const csv = rows.length ? toCsv(rows) : "\uFEFF" + header.join(",") + "\r\n";
    return new Response(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="personal-crm-accounting-events-${year}.csv"`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "エクスポートできませんでした", { status: 500 });
  }
}
