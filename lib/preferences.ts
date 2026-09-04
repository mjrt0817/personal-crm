import { createClient } from "@/lib/supabase/server";

export type ActionPreferences = {
  waitingFollowupDays: number;
  staleProjectDays: number;
  taskHorizonDays: number;
  scheduleHorizonDays: number;
  projectDueHorizonDays: number;
  gmailLookbackDays: number;
};

export const DEFAULT_ACTION_PREFERENCES: ActionPreferences = {
  waitingFollowupDays: 3,
  staleProjectDays: 14,
  taskHorizonDays: 7,
  scheduleHorizonDays: 7,
  projectDueHorizonDays: 7,
  gmailLookbackDays: 7,
};

function normalize(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : fallback;
}

export async function getActionPreferences(): Promise<ActionPreferences> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === "true") return DEFAULT_ACTION_PREFERENCES;
  const supabase = await createClient();
  const { data: claims, error: authError } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (authError || !userId) return DEFAULT_ACTION_PREFERENCES;

  const { data, error } = await supabase
    .from("user_preferences")
    .select("waiting_followup_days,stale_project_days,task_horizon_days,schedule_horizon_days,project_due_horizon_days,gmail_lookback_days")
    .eq("user_id", String(userId))
    .maybeSingle();

  if (error) return DEFAULT_ACTION_PREFERENCES;
  if (!data) return DEFAULT_ACTION_PREFERENCES;

  return {
    waitingFollowupDays: normalize(data.waiting_followup_days, 3, 1, 30),
    staleProjectDays: normalize(data.stale_project_days, 14, 3, 90),
    taskHorizonDays: normalize(data.task_horizon_days, 7, 1, 30),
    scheduleHorizonDays: normalize(data.schedule_horizon_days, 7, 1, 30),
    projectDueHorizonDays: normalize(data.project_due_horizon_days, 7, 1, 30),
    gmailLookbackDays: normalize(data.gmail_lookback_days, 7, 1, 30),
  };
}
