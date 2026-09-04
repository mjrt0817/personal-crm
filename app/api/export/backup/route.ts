import { getBackupPayload } from "@/lib/backup";

export async function GET() {
  try {
    const payload = await getBackupPayload();
    const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="personal-crm-backup-${date}.json"`,
        "cache-control": "no-store"
      }
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "Backup failed", { status: 401 });
  }
}
