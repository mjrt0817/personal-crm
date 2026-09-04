import { CSV_KINDS, getCsvRows, toCsv } from "@/lib/backup";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(kind in CSV_KINDS)) return new Response("Not found", { status: 404 });
  try {
    const typedKind = kind as keyof typeof CSV_KINDS;
    const rows = await getCsvRows(typedKind);
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return new Response(toCsv(rows), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="personal-crm-${kind}-${date}.csv"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Export failed", { status: 401 });
  }
}
