import { getGoogleProviderAccessToken } from "@/lib/google-calendar-server";

// Drive連携ではファイル本文を取得せず、名前・URL・更新日時などのメタデータだけを扱う。
type SupabaseLike = any;

const GOOGLE_DRIVE_API = "https://www.googleapis.com/drive/v3";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const MAX_SYNC_ITEMS = 500;
const MAX_DEPTH = 8;

type GoogleDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
  parents?: string[];
};

type GoogleDriveList = {
  files?: GoogleDriveFile[];
  nextPageToken?: string;
};

export type DriveFolderMetadata = {
  id: string;
  name: string;
  url: string;
};

type SyncedDriveItem = GoogleDriveFile & { relativePath: string };

function driveErrorMessage(json: any, status: number) {
  return json?.error?.message || `Google Drive APIエラー (${status})`;
}

async function driveFetch<T>(token: string, path: string): Promise<T> {
  const response = await fetch(`${GOOGLE_DRIVE_API}${path}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store"
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(driveErrorMessage(json, response.status));
  return json as T;
}

export function extractGoogleDriveFolderId(input: string) {
  const value = input.trim();
  if (!value) return null;

  // IDだけ貼り付けた場合にも対応する。
  if (/^[A-Za-z0-9_-]{15,}$/.test(value) && !value.includes("/") && !value.includes(".")) return value;

  try {
    const url = new URL(value);
    const folderMatch = url.pathname.match(/\/folders\/([A-Za-z0-9_-]+)/);
    if (folderMatch?.[1]) return folderMatch[1];
    const id = url.searchParams.get("id");
    if (id && /^[A-Za-z0-9_-]+$/.test(id)) return id;
  } catch {
    return null;
  }
  return null;
}

function defaultDriveUrl(id: string) {
  return `https://drive.google.com/drive/folders/${encodeURIComponent(id)}`;
}

export async function getDriveFolderMetadata(supabase: SupabaseLike, userId: string, input: string): Promise<DriveFolderMetadata> {
  const folderId = extractGoogleDriveFolderId(input);
  if (!folderId) throw new Error("Google DriveのフォルダURLを入力してください。");

  const token = await getGoogleProviderAccessToken(supabase, userId);
  if (!token) throw new Error("Google連携が未設定です。設定画面からGoogle Workspaceを接続してください。");

  const qs = new URLSearchParams({
    fields: "id,name,mimeType,webViewLink",
    supportsAllDrives: "true"
  });
  const item = await driveFetch<GoogleDriveFile>(token, `/files/${encodeURIComponent(folderId)}?${qs.toString()}`);
  if (item.mimeType !== FOLDER_MIME) throw new Error("指定されたURLはGoogle Driveフォルダではありません。");
  return { id: item.id, name: item.name, url: item.webViewLink || defaultDriveUrl(item.id) };
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function listDirectChildren(token: string, parentId: string) {
  const result: GoogleDriveFile[] = [];
  let pageToken = "";
  do {
    const qs = new URLSearchParams({
      q: `'${escapeDriveQueryValue(parentId)}' in parents and trashed = false`,
      fields: "nextPageToken,files(id,name,mimeType,webViewLink,modifiedTime,parents)",
      pageSize: "200",
      orderBy: "folder,name",
      spaces: "drive",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true"
    });
    if (pageToken) qs.set("pageToken", pageToken);
    const page = await driveFetch<GoogleDriveList>(token, `/files?${qs.toString()}`);
    result.push(...(page.files ?? []));
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && result.length < MAX_SYNC_ITEMS);
  return result;
}

async function listTree(token: string, rootId: string) {
  const items: SyncedDriveItem[] = [];

  async function walk(parentId: string, basePath: string, depth: number) {
    if (depth > MAX_DEPTH || items.length >= MAX_SYNC_ITEMS) return;
    const children = await listDirectChildren(token, parentId);
    for (const item of children) {
      if (items.length >= MAX_SYNC_ITEMS) break;
      const relativePath = basePath ? `${basePath}/${item.name}` : item.name;
      items.push({ ...item, relativePath });
      if (item.mimeType === FOLDER_MIME) await walk(item.id, relativePath, depth + 1);
    }
  }

  await walk(rootId, "", 0);
  return items;
}

function fileTypeLabel(mimeType: string) {
  const map: Record<string, string> = {
    "application/vnd.google-apps.folder": "フォルダ",
    "application/vnd.google-apps.document": "Google Docs",
    "application/vnd.google-apps.spreadsheet": "Google Sheets",
    "application/vnd.google-apps.presentation": "Google Slides",
    "application/vnd.google-apps.form": "Google Forms",
    "application/pdf": "PDF"
  };
  if (map[mimeType]) return map[mimeType];
  if (mimeType.startsWith("image/")) return "画像";
  if (mimeType.startsWith("video/")) return "動画";
  if (mimeType.startsWith("text/")) return "テキスト";
  return "ファイル";
}

/** 案件に登録済みのDriveフォルダを再走査し、ファイルメタデータをSupabaseへ同期する。 */
export async function syncProjectDriveFolder(supabase: SupabaseLike, userId: string, driveFolderRowId: string) {
  const { data: folderData, error: folderError } = await supabase
    .from("project_drive_folders")
    .select("id,project_id,google_folder_id,name,url")
    .eq("id", driveFolderRowId)
    .single();
  if (folderError) throw new Error(folderError.message);

  try {
    const token = await getGoogleProviderAccessToken(supabase, userId);
    if (!token) throw new Error("Google連携が未設定です。設定画面からGoogle Workspaceを接続してください。");

    // フォルダ名変更にも追随する。
    const metaQs = new URLSearchParams({ fields: "id,name,mimeType,webViewLink", supportsAllDrives: "true" });
    const root = await driveFetch<GoogleDriveFile>(token, `/files/${encodeURIComponent(folderData.google_folder_id)}?${metaQs.toString()}`);
    if (root.mimeType !== FOLDER_MIME) throw new Error("連携先がGoogle Driveフォルダではなくなっています。");

    const items = await listTree(token, folderData.google_folder_id);
    const now = new Date().toISOString();
    const rows = items.map((item) => ({
      user_id: userId,
      project_id: folderData.project_id,
      company_id: null,
      name: item.name,
      file_type: fileTypeLabel(item.mimeType),
      url: item.webViewLink || (item.mimeType === FOLDER_MIME ? defaultDriveUrl(item.id) : `https://drive.google.com/open?id=${encodeURIComponent(item.id)}`),
      memo: null,
      source: "google_drive",
      external_id: item.id,
      external_parent_id: item.parents?.[0] ?? folderData.google_folder_id,
      drive_folder_id: driveFolderRowId,
      mime_type: item.mimeType,
      relative_path: item.relativePath,
      external_modified_at: item.modifiedTime || null,
      is_folder: item.mimeType === FOLDER_MIME,
      updated_at: now
    }));

    const { data: existing, error: existingError } = await supabase
      .from("files")
      .select("external_id")
      .eq("drive_folder_id", driveFolderRowId)
      .eq("source", "google_drive");
    if (existingError) throw new Error(existingError.message);

    if (rows.length) {
      const { error: upsertError } = await supabase
        .from("files")
        .upsert(rows, { onConflict: "user_id,drive_folder_id,external_id" });
      if (upsertError) throw new Error(upsertError.message);
    }

    const currentIds = new Set(rows.map((x) => x.external_id));
    const staleIds = (existing ?? []).map((x: { external_id: string | null }) => x.external_id).filter((x: string | null): x is string => Boolean(x) && !currentIds.has(x as string));
    if (staleIds.length) {
      const { error: deleteError } = await supabase
        .from("files")
        .delete()
        .eq("drive_folder_id", driveFolderRowId)
        .in("external_id", staleIds);
      if (deleteError) throw new Error(deleteError.message);
    }
    if (!rows.length) {
      const { error: clearError } = await supabase.from("files").delete().eq("drive_folder_id", driveFolderRowId).eq("source", "google_drive");
      if (clearError) throw new Error(clearError.message);
    }

    await supabase.from("project_drive_folders").update({
      name: root.name,
      url: root.webViewLink || defaultDriveUrl(root.id),
      last_sync_at: now,
      last_sync_error: null
    }).eq("id", driveFolderRowId);

    return { count: rows.length, truncated: rows.length >= MAX_SYNC_ITEMS };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Drive同期に失敗しました。";
    await supabase.from("project_drive_folders").update({ last_sync_error: message }).eq("id", driveFolderRowId);
    throw e;
  }
}

export async function registerProjectDriveFolder(supabase: SupabaseLike, userId: string, projectId: string, input: string) {
  const metadata = await getDriveFolderMetadata(supabase, userId, input);
  const { data, error } = await supabase.from("project_drive_folders").upsert({
    user_id: userId,
    project_id: projectId,
    google_folder_id: metadata.id,
    name: metadata.name,
    url: metadata.url,
    last_sync_error: null
  }, { onConflict: "user_id,project_id,google_folder_id" }).select("id").single();
  if (error) throw new Error(error.message);
  const result = await syncProjectDriveFolder(supabase, userId, data.id);
  return { folderId: data.id, ...result };
}

export const GOOGLE_DRIVE_FOLDER_MIME = FOLDER_MIME;
