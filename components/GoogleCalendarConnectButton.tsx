"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function GoogleCalendarConnectButton({ connected = false }: { connected?: boolean }) {
  const [pending, setPending] = useState(false);

  async function connect() {
    setPending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/calendar.events",
        queryParams: {
          access_type: "offline",
          prompt: "consent"
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
      {pending ? "Googleへ移動中…" : connected ? "Google Calendarを再接続" : "Google Calendarと接続"}
    </button>
  );
}
