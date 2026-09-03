import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { encryptGoogleToken } from "@/lib/google-calendar-server";

const defaultCategories = [
  ["DX支援",10],["ITコンサルティング",20],["Webサイト制作",30],["Webサイト保守",40],["システム開発",50],
  ["業務改善",60],["IT導入支援",70],["研修・講師",80],["その他",90]
] as const;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth", url.origin));

  const supabase = await createClient();
  const { data: sessionData, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=oauth", url.origin));

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  const email = user?.email?.toLowerCase();
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);

  if (!user || !email || (allowed.length > 0 && !allowed.includes(email))) {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=not_allowed", url.origin));
  }

  await supabase.from("profiles").upsert({ id:user.id, email, display_name:user.user_metadata?.full_name ?? user.user_metadata?.name ?? email });
  await supabase.from("project_categories").upsert(
    defaultCategories.map(([name,sort_order]) => ({ user_id:user.id, name, sort_order, is_active:true })),
    { onConflict:"user_id,name", ignoreDuplicates:true }
  );

  // Calendar権限付きで再認証した場合だけ、Google refresh tokenを暗号化して保存する。
  const providerRefreshToken = sessionData.session?.provider_refresh_token;
  if (providerRefreshToken) {
    try {
      const encrypted = encryptGoogleToken(providerRefreshToken);
      const { error: calendarError } = await supabase.from("google_calendar_connections").upsert({
        user_id: user.id,
        refresh_token_encrypted: encrypted,
        google_email: email,
        connected_at: new Date().toISOString(),
        last_sync_error: null
      }, { onConflict: "user_id" });
      if (calendarError) throw calendarError;
      return NextResponse.redirect(new URL("/settings?calendar=connected", url.origin));
    } catch {
      return NextResponse.redirect(new URL("/settings?calendar=save_error", url.origin));
    }
  }

  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
