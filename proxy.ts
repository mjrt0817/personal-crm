import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        }
      }
    }
  );

  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean);
  const claimEmail = typeof claims?.email === "string" ? claims.email.toLowerCase() : "";
  const isAuthenticated = Boolean(claims?.sub) && (allowed.length === 0 || allowed.includes(claimEmail));
  const path = request.nextUrl.pathname;
  const publicPath = path.startsWith("/login") || path.startsWith("/auth/");

  if (!isAuthenticated && !publicPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon-192.png|icon-512.png).*)"]
};
