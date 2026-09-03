import { getGoogleProviderAccessToken } from "@/lib/google-calendar-server";

type SupabaseLike = any;

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1";
const MAX_MESSAGES = 30;

type GmailMessageRef = { id: string; threadId: string };
type GmailListResponse = { messages?: GmailMessageRef[]; nextPageToken?: string; resultSizeEstimate?: number };
type GmailHeader = { name: string; value: string };
type GmailMessage = {
  id: string;
  threadId: string;
  internalDate?: string;
  snippet?: string;
  payload?: { headers?: GmailHeader[] };
};

function gmailErrorMessage(json: any, status: number) {
  return json?.error?.message || `Gmail APIエラー (${status})`;
}

async function gmailFetch<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${GMAIL_API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(gmailErrorMessage(json, response.status));
  return json as T;
}

function normalizeEmail(value?: string | null) {
  return (value || "").trim().toLowerCase();
}

function quoteGmailTerm(value: string) {
  return value.replace(/[{}]/g, "");
}

function header(message: GmailMessage, name: string) {
  return message.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";
}

function gmailThreadUrl(threadId: string) {
  return `https://mail.google.com/mail/u/0/#all/${encodeURIComponent(threadId)}`;
}

async function projectEmailAddresses(supabase: SupabaseLike, projectId: string) {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,company_id,primary_contact_id,companies(email)")
    .eq("id", projectId)
    .single();
  if (projectError) throw new Error(projectError.message);

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .select("email")
    .eq("company_id", project.company_id);
  if (contactError) throw new Error(contactError.message);

  const values = [
    (project.companies as { email?: string | null } | null)?.email,
    ...(contacts ?? []).map((c: { email?: string | null }) => c.email)
  ]
    .map(normalizeEmail)
    .filter(Boolean);

  return {
    companyId: String(project.company_id),
    emails: [...new Set(values)]
  };
}

async function connectedGoogleEmail(supabase: SupabaseLike, userId: string) {
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("google_email")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return normalizeEmail(data?.google_email);
}

function buildSearchQuery(emails: string[]) {
  const terms = emails.flatMap((email) => [`from:${quoteGmailTerm(email)}`, `to:${quoteGmailTerm(email)}`]);
  return `newer_than:1y {${terms.join(" ")}}`;
}

export async function syncProjectGmail(supabase: SupabaseLike, userId: string, projectId: string) {
  const token = await getGoogleProviderAccessToken(supabase, userId);
  if (!token) throw new Error("Google連携が未設定です。設定画面からGoogle Workspaceを接続してください。");

  const { companyId, emails } = await projectEmailAddresses(supabase, projectId);
  if (!emails.length) {
    throw new Error("この取引先・担当者にメールアドレスが登録されていません。取引先または担当者へメールアドレスを登録してください。");
  }

  const myEmail = await connectedGoogleEmail(supabase, userId);
  const q = buildSearchQuery(emails);
  const qs = new URLSearchParams({ q, maxResults: String(MAX_MESSAGES) });

  try {
    const list = await gmailFetch<GmailListResponse>(token, `/users/me/messages?${qs.toString()}`);
    const refs = list.messages ?? [];
    const messages = await Promise.all(refs.map(async (ref) => {
      const detailQs = new URLSearchParams({ format: "metadata" });
      for (const h of ["Subject", "From", "To", "Cc", "Date", "Message-ID"]) detailQs.append("metadataHeaders", h);
      return gmailFetch<GmailMessage>(token, `/users/me/messages/${encodeURIComponent(ref.id)}?${detailQs.toString()}`);
    }));

    const rows = messages.map((message) => {
      const from = header(message, "From");
      const internalMs = message.internalDate ? Number(message.internalDate) : NaN;
      const dateHeader = header(message, "Date");
      const sentAt = Number.isFinite(internalMs) ? new Date(internalMs).toISOString() : (dateHeader ? new Date(dateHeader).toISOString() : null);
      return {
        user_id: userId,
        project_id: projectId,
        company_id: companyId,
        gmail_message_id: message.id,
        gmail_thread_id: message.threadId,
        rfc_message_id: header(message, "Message-ID") || null,
        subject: header(message, "Subject") || "(件名なし)",
        from_text: from || null,
        to_text: header(message, "To") || null,
        cc_text: header(message, "Cc") || null,
        sent_at: sentAt,
        snippet: message.snippet || null,
        gmail_url: gmailThreadUrl(message.threadId),
        is_outgoing: Boolean(myEmail && from.toLowerCase().includes(myEmail))
      };
    });

    if (rows.length) {
      const { error: upsertError } = await supabase.from("gmail_messages").upsert(rows, {
        onConflict: "user_id,project_id,gmail_message_id"
      });
      if (upsertError) throw new Error(upsertError.message);
    }

    const { error: syncError } = await supabase.from("project_gmail_syncs").upsert({
      user_id: userId,
      project_id: projectId,
      last_sync_at: new Date().toISOString(),
      last_sync_error: null
    }, { onConflict: "user_id,project_id" });
    if (syncError) throw new Error(syncError.message);

    return { count: rows.length, query: q, addresses: emails };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gmail同期に失敗しました。";
    await supabase.from("project_gmail_syncs").upsert({
      user_id: userId,
      project_id: projectId,
      last_sync_error: message
    }, { onConflict: "user_id,project_id" });
    throw e;
  }
}
