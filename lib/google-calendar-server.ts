import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

type SupabaseLike = any;

type ScheduleRow = {
  id: string;
  user_id: string;
  company_id: string | null;
  project_id: string | null;
  title: string;
  schedule_type: string;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  description: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
  google_sync_status: string;
  google_sync_error: string | null;
  google_updated_at: string | null;
  google_html_link: string | null;
  updated_at?: string;
};

type GoogleEvent = {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink?: string;
  updated?: string;
  start?: { dateTime?: string; date?: string; timeZone?: string };
  end?: { dateTime?: string; date?: string; timeZone?: string };
  extendedProperties?: { private?: Record<string, string> };
};

type GoogleEventsResponse = {
  items?: GoogleEvent[];
  nextPageToken?: string;
};

import { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-scopes";
const GOOGLE_API = "https://www.googleapis.com/calendar/v3";

function encryptionKey() {
  const secret = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("GOOGLE_TOKEN_ENCRYPTION_KEY が設定されていません。");
  return createHash("sha256").update(secret).digest();
}

export function encryptGoogleToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ["v1", iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(".");
}

function decryptGoogleToken(value: string) {
  const [version, ivPart, tagPart, encryptedPart] = value.split(".");
  if (version !== "v1" || !ivPart || !tagPart || !encryptedPart) throw new Error("Googleトークンの保存形式が不正です。");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
}

function googleCredentials() {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Google OAuthのClient ID / Client SecretがVercelに設定されていません。");
  return { clientId, clientSecret };
}

async function getConnection(supabase: SupabaseLike, userId: string) {
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("refresh_token_encrypted,last_sync_at,last_sync_error")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as { refresh_token_encrypted: string; last_sync_at: string | null; last_sync_error: string | null } | null;
}

async function accessToken(supabase: SupabaseLike, userId: string) {
  const connection = await getConnection(supabase, userId);
  if (!connection) return null;

  const refreshToken = decryptGoogleToken(connection.refresh_token_encrypted);
  const { clientId, clientSecret } = googleCredentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token"
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store"
  });
  const json = (await response.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !json.access_token) {
    const message = json.error_description || json.error || `Googleトークン更新に失敗しました (${response.status})`;
    await supabase.from("google_calendar_connections").update({ last_sync_error: message }).eq("user_id", userId);
    throw new Error(message);
  }
  return json.access_token;
}

async function googleFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${GOOGLE_API}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    },
    cache: "no-store"
  });
  if (response.status === 204) return undefined as T;
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (json as any)?.error?.message || `Google Calendar APIエラー (${response.status})`;
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return json as T;
}

function jstDate(iso: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date(iso));
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function eventBody(schedule: ScheduleRow) {
  const endAt = schedule.end_at || new Date(new Date(schedule.start_at).getTime() + 60 * 60 * 1000).toISOString();
  let start: Record<string, string>;
  let end: Record<string, string>;

  if (schedule.all_day) {
    const startDate = jstDate(schedule.start_at);
    let endDate = schedule.end_at ? jstDate(endAt) : addDays(startDate, 1);
    if (endDate <= startDate) endDate = addDays(startDate, 1);
    start = { date: startDate };
    end = { date: endDate };
  } else {
    start = { dateTime: schedule.start_at, timeZone: "Asia/Tokyo" };
    end = { dateTime: endAt, timeZone: "Asia/Tokyo" };
  }

  return {
    summary: schedule.title,
    description: schedule.description || undefined,
    location: schedule.location || undefined,
    start,
    end,
    extendedProperties: {
      private: { personalCrmScheduleId: schedule.id }
    }
  };
}

async function markScheduleError(supabase: SupabaseLike, scheduleId: string, message: string) {
  await supabase.from("schedules").update({ google_sync_status: "error", google_sync_error: message }).eq("id", scheduleId);
}

/** アプリの1予定をGoogle Calendarへ新規作成または更新する。接続未設定なら何もしない。 */
export async function syncScheduleToGoogle(supabase: SupabaseLike, userId: string, scheduleId: string) {
  const connection = await getConnection(supabase, userId);
  if (!connection) return { connected: false, synced: false };

  const { data, error } = await supabase
    .from("schedules")
    .select("id,user_id,company_id,project_id,title,schedule_type,start_at,end_at,all_day,location,description,google_event_id,google_calendar_id,google_sync_status,google_sync_error,google_updated_at,google_html_link")
    .eq("id", scheduleId)
    .single();
  if (error) throw new Error(error.message);
  const schedule = data as ScheduleRow;

  try {
    const token = await accessToken(supabase, userId);
    if (!token) return { connected: false, synced: false };
    const calendarId = encodeURIComponent(schedule.google_calendar_id || "primary");
    let event: GoogleEvent;

    if (schedule.google_event_id) {
      try {
        event = await googleFetch<GoogleEvent>(token, `/calendars/${calendarId}/events/${encodeURIComponent(schedule.google_event_id)}`, {
          method: "PATCH",
          body: JSON.stringify(eventBody(schedule))
        });
      } catch (e) {
        const status = (e as Error & { status?: number }).status;
        if (status !== 404 && status !== 410) throw e;
        event = await googleFetch<GoogleEvent>(token, `/calendars/${calendarId}/events`, {
          method: "POST",
          body: JSON.stringify(eventBody(schedule))
        });
      }
    } else {
      event = await googleFetch<GoogleEvent>(token, `/calendars/${calendarId}/events`, {
        method: "POST",
        body: JSON.stringify(eventBody(schedule))
      });
    }

    await supabase.from("schedules").update({
      google_event_id: event.id,
      google_calendar_id: "primary",
      google_sync_status: "synced",
      google_sync_error: null,
      google_updated_at: event.updated || new Date().toISOString(),
      google_html_link: event.htmlLink || null
    }).eq("id", scheduleId);
    return { connected: true, synced: true, eventId: event.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Calendar同期に失敗しました。";
    await markScheduleError(supabase, scheduleId, message);
    return { connected: true, synced: false, error: message };
  }
}

/** アプリ側で削除する予定をGoogle Calendarからも削除する。 */
export async function deleteScheduleFromGoogle(supabase: SupabaseLike, userId: string, scheduleId: string) {
  const connection = await getConnection(supabase, userId);
  if (!connection) return;
  const { data, error } = await supabase.from("schedules").select("google_event_id,google_calendar_id").eq("id", scheduleId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.google_event_id) return;

  try {
    const token = await accessToken(supabase, userId);
    if (!token) return;
    const calendarId = encodeURIComponent(data.google_calendar_id || "primary");
    await googleFetch<void>(token, `/calendars/${calendarId}/events/${encodeURIComponent(data.google_event_id)}`, { method: "DELETE" });
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 404 || status === 410) return;
    throw e;
  }
}

function googleEventTimes(event: GoogleEvent) {
  if (event.start?.date) {
    const startAt = new Date(`${event.start.date}T00:00:00+09:00`).toISOString();
    const endDate = event.end?.date || addDays(event.start.date, 1);
    const endAt = new Date(`${endDate}T00:00:00+09:00`).toISOString();
    return { startAt, endAt, allDay: true };
  }
  if (!event.start?.dateTime) return null;
  const startAt = new Date(event.start.dateTime).toISOString();
  const endAt = event.end?.dateTime
    ? new Date(event.end.dateTime).toISOString()
    : new Date(new Date(startAt).getTime() + 60 * 60 * 1000).toISOString();
  return { startAt, endAt, allDay: false };
}

function sameMinute(a: string, b: string) {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) < 60_000;
}

type PullGoogleCalendarOptions = {
  /** 自動同期時は前回同期後に更新されたイベントだけを取得する。 */
  incremental?: boolean;
};

/** Googleのprimaryカレンダーを取り込み、既存予定は更新する。 */
export async function pullGoogleCalendar(supabase: SupabaseLike, userId: string, options: PullGoogleCalendarOptions = {}) {
  const connection = await getConnection(supabase, userId);
  if (!connection) throw new Error("Google Calendarが未接続です。");

  try {
    const token = await accessToken(supabase, userId);
    if (!token) throw new Error("Google Calendarが未接続です。");

    const now = Date.now();
    const timeMin = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString();
    const timeMax = new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString();
    const events: GoogleEvent[] = [];
    let pageToken = "";

    // 自動同期では前回同期時刻から少し重ねて取り込むことで、通信タイミング境界の取りこぼしを避ける。
    const updatedMin = options.incremental && connection.last_sync_at
      ? new Date(new Date(connection.last_sync_at).getTime() - 2 * 60 * 1000).toISOString()
      : "";

    do {
      const qs = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        showDeleted: "true",
        maxResults: "2500"
      });
      if (updatedMin) qs.set("updatedMin", updatedMin);
      if (pageToken) qs.set("pageToken", pageToken);
      const page = await googleFetch<GoogleEventsResponse>(token, `/calendars/primary/events?${qs.toString()}`);
      events.push(...(page.items ?? []));
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);

    const { data: localData, error: localError } = await supabase
      .from("schedules")
      .select("id,user_id,company_id,project_id,title,schedule_type,start_at,end_at,all_day,location,description,google_event_id,google_calendar_id,google_sync_status,google_sync_error,google_updated_at,google_html_link,updated_at")
      .gte("start_at", timeMin)
      .lte("start_at", timeMax);
    if (localError) throw new Error(localError.message);

    const locals = (localData ?? []) as ScheduleRow[];
    const byGoogleId = new Map(locals.filter((x) => x.google_event_id).map((x) => [x.google_event_id as string, x]));
    const byLocalId = new Map(locals.map((x) => [x.id, x]));
    const rows: any[] = [];
    const deletedIds: string[] = [];
    let updated = 0;
    let linked = 0;
    let deleted = 0;
    let skipped = 0;

    for (const event of events) {
      let local = byGoogleId.get(event.id);
      const embeddedId = event.extendedProperties?.private?.personalCrmScheduleId;
      if (!local && embeddedId) local = byLocalId.get(embeddedId);

      if (event.status === "cancelled") {
        if (local) {
          deletedIds.push(local.id);
          deleted += 1;
        }
        continue;
      }

      const times = googleEventTimes(event);
      if (!times) continue;

      if (!local) {
        // Ver.1.3までの「Google Calendarへ登録」リンクで作った予定を、タイトル＋開始時刻で自動的に結び付ける。
        local = locals.find((x) => !x.google_event_id && x.title === (event.summary || "(無題)") && sameMinute(x.start_at, times.startAt));
        if (local) linked += 1;
      }

      // CRMと紐付いていない個人予定・家族予定などは取り込まない。
      // Google上で新規作成した予定の全面取り込みは、専用カレンダー対応時に追加する。
      if (!local) {
        skipped += 1;
        continue;
      }

      rows.push({
        id: local.id,
        user_id: userId,
        company_id: local.company_id ?? null,
        project_id: local.project_id ?? null,
        title: event.summary || "(無題)",
        schedule_type: local.schedule_type || "other",
        start_at: times.startAt,
        end_at: times.endAt,
        all_day: times.allDay,
        location: event.location || null,
        description: event.description || null,
        google_event_id: event.id,
        google_calendar_id: "primary",
        google_sync_status: "synced",
        google_sync_error: null,
        google_updated_at: event.updated || new Date().toISOString(),
        google_html_link: event.htmlLink || null
      });
      updated += 1;
    }

    if (rows.length) {
      const { error } = await supabase.from("schedules").upsert(rows, { onConflict: "id" });
      if (error) throw new Error(error.message);
    }
    if (deletedIds.length) {
      const { error } = await supabase.from("schedules").delete().in("id", deletedIds);
      if (error) throw new Error(error.message);
    }

    await supabase.from("google_calendar_connections").update({
      last_sync_at: new Date().toISOString(),
      last_sync_error: null
    }).eq("user_id", userId);

    return { updated, linked, deleted, skipped, total: events.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Calendarの取り込みに失敗しました。";
    await supabase.from("google_calendar_connections").update({ last_sync_error: message }).eq("user_id", userId);
    throw e;
  }
}

export async function revokeGoogleCalendarConnection(supabase: SupabaseLike, userId: string) {
  const connection = await getConnection(supabase, userId);
  if (connection) {
    try {
      const refreshToken = decryptGoogleToken(connection.refresh_token_encrypted);
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        cache: "no-store"
      });
    } catch {
      // Google側の失効に失敗しても、アプリ側の接続情報は削除する。
    }
  }
  const { error } = await supabase.from("google_calendar_connections").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function getGoogleProviderAccessToken(supabase: SupabaseLike, userId: string) {
  return accessToken(supabase, userId);
}

export { GOOGLE_CALENDAR_SCOPE };
