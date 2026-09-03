"use client";

import { createClient } from "@/lib/supabase/client";

export default function GoogleLoginButton() {
  async function login() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    });
  }

  return <button className="button primary" onClick={login}>Googleでログイン</button>;
}
