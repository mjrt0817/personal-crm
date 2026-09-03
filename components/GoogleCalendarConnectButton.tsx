"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GOOGLE_WORKSPACE_SCOPES } from "@/lib/google-scopes";

export default function GoogleCalendarConnectButton({ connected = false }: { connected?: boolean }) {
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: GOOGLE_WORKSPACE_SCOPES,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true"
        }
      }
    });
    if (error) {
      alert(error.message);
      setPending(false);
    }
  }

  return (
    <button className="button primary" type="button" onClick={connect} disabled={pending}>
      {pending ? "Googleへ移動中…" : connected ? "Google Workspaceを再接続" : "Google Workspaceと接続"}
    </button>
  );
}
