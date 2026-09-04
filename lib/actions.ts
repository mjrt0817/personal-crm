"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteScheduleFromGoogle, pullGoogleCalendar, revokeGoogleCalendarConnection, syncScheduleToGoogle } from "@/lib/google-calendar-server";
import { registerProjectDriveFolder, syncProjectDriveFolder } from "@/lib/google-drive-server";
import { syncProjectGmail } from "@/lib/google-gmail-server";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function optional(formData: FormData, name: string) {
  const value = text(formData, name);
  return value || null;
}

function required(formData: FormData, name: string, label: string) {
  const value = text(formData, name);
  if (!value) throw new Error(`${label}は必須です。`);
  return value;
}

function checkbox(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function numberOrNull(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  const parsed = Number(value.replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}


function pricingFields(formData: FormData) {
  const pricingModel = text(formData, "pricing_model") === "unit" ? "unit" : "fixed";
  if (pricingModel === "unit") {
    return {
      pricing_model: "unit",
      unit_label: optional(formData, "unit_label") || "回",
      unit_price: numberOrNull(formData, "unit_price"),
      planned_units: numberOrNull(formData, "planned_units"),
      completed_units: numberOrNull(formData, "completed_units"),
      expected_amount: null,
      order_amount: null
    };
  }
  return {
    pricing_model: "fixed",
    unit_label: "回",
    unit_price: null,
    planned_units: null,
    completed_units: null,
    expected_amount: numberOrNull(formData, "expected_amount"),
    order_amount: numberOrNull(formData, "order_amount")
  };
}

function jstDateTimeOrNull(formData: FormData, name: string) {
  const value = text(formData, name);
  if (!value) return null;
  // datetime-local は利用者の日本時間として扱う。
  return new Date(`${value}:00+09:00`).toISOString();
}

function demoReturn(formData: FormData, fallback: string): never {
  const returnTo = text(formData, "return_to") || fallback;
  redirect(`${returnTo}${returnTo.includes("?") ? "&" : "?"}demo_notice=1`);
}

async function authed() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (error || !userId) redirect("/login");
  return { supabase, userId: String(userId) };
}


async function validatePrimaryContactForCompany(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  contactId: string | null
) {
  if (!contactId) return null;
  const { data, error } = await supabase
    .from("contacts")
    .select("id,company_id")
    .eq("id", contactId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.company_id !== companyId) {
    throw new Error("主担当者は選択した取引先に登録されている担当者から選択してください。");
  }
  return contactId;
}

async function resolveCompanyIdForProject(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string | null, fallback: string | null) {
  if (!projectId) return fallback;
  const { data, error } = await supabase.from("projects").select("company_id").eq("id", projectId).single();
  if (error) throw new Error(error.message);
  return data.company_id as string;
}

function returnTarget(formData: FormData, fallback: string) {
  const candidate = text(formData, "return_to");
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : fallback;
}

function invalidateProjectMutation(projectId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/pipeline");
  revalidatePath("/companies");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
    revalidatePath(`/projects/${projectId}/billing`);
  }
  revalidatePath("/billing");
}

function invalidateTaskMutation(projectId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

function invalidateActivityMutation(projectId?: string | null, projectChanged = false) {
  revalidatePath("/dashboard");
  revalidatePath("/companies");
  if (projectChanged) revalidatePath("/projects");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

function invalidateScheduleMutation(projectId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

function invalidateLinkMutation(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
}

function invalidateDriveMutation(projectId: string) {
  revalidatePath(`/projects/${projectId}`);
  revalidatePath(`/projects/${projectId}/drive`);
}

export async function createCompany(formData: FormData) {
  if (demoMode) demoReturn(formData, "/companies");
  const { supabase, userId } = await authed();
  const { data, error } = await supabase.from("companies").insert({
    user_id: userId,
    name: required(formData, "name", "取引先名"),
    company_type: optional(formData, "company_type"),
    industry: optional(formData, "industry"),
    postal_code: optional(formData, "postal_code"),
    address: optional(formData, "address"),
    phone: optional(formData, "phone"),
    email: optional(formData, "email"),
    website_url: optional(formData, "website_url"),
    memo: optional(formData, "memo")
  }).select("id").single();
  if (error) throw new Error(error.message);
  revalidatePath("/companies");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(formData: FormData) {
  const id = required(formData, "id", "取引先ID");
  if (demoMode) demoReturn(formData, `/companies/${id}`);
  const { supabase } = await authed();
  const { error } = await supabase.from("companies").update({
    name: required(formData, "name", "取引先名"),
    company_type: optional(formData, "company_type"),
    industry: optional(formData, "industry"),
    postal_code: optional(formData, "postal_code"),
    address: optional(formData, "address"),
    phone: optional(formData, "phone"),
    email: optional(formData, "email"),
    website_url: optional(formData, "website_url"),
    memo: optional(formData, "memo")
  }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/companies");
  revalidatePath(`/companies/${id}`);
  redirect(`/companies/${id}`);
}

export async function archiveCompany(formData: FormData) {
  const id = required(formData, "id", "取引先ID");
  if (demoMode) demoReturn(formData, "/companies");
  const { supabase } = await authed();
  const { error } = await supabase.from("companies").update({ is_archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/companies");
  redirect("/companies");
}

export async function createProject(formData: FormData) {
  if (demoMode) demoReturn(formData, "/projects");
  const { supabase, userId } = await authed();
  const companyId = required(formData, "company_id", "取引先");
  const primaryContactId = await validatePrimaryContactForCompany(supabase, companyId, optional(formData, "primary_contact_id"));
  const { data, error } = await supabase.from("projects").insert({
    user_id: userId,
    company_id: companyId,
    primary_contact_id: primaryContactId,
    category_id: optional(formData, "category_id"),
    name: required(formData, "name", "案件名"),
    status: text(formData, "status") || "consultation",
    priority: text(formData, "priority") || "medium",
    description: optional(formData, "description"),
    inquiry_date: optional(formData, "inquiry_date"),
    proposal_date: optional(formData, "proposal_date"),
    order_date: optional(formData, "order_date"),
    start_date: optional(formData, "start_date"),
    due_date: optional(formData, "due_date"),
    completed_date: optional(formData, "completed_date"),
    ...pricingFields(formData),
    win_probability: numberOrNull(formData, "win_probability"),
    expected_close_date: optional(formData, "expected_close_date"),
    next_action: optional(formData, "next_action"),
    next_action_due: jstDateTimeOrNull(formData, "next_action_due"),
    memo: optional(formData, "memo")
  }).select("id").single();
  if (error) throw new Error(error.message);
  invalidateProjectMutation(data.id);
  redirect(`/projects/${data.id}`);
}

export async function updateProject(formData: FormData) {
  const id = required(formData, "id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${id}`);
  const { supabase } = await authed();
  const status = text(formData, "status") || "consultation";
  const companyId = required(formData, "company_id", "取引先");
  const primaryContactId = await validatePrimaryContactForCompany(supabase, companyId, optional(formData, "primary_contact_id"));
  const { error } = await supabase.from("projects").update({
    company_id: companyId,
    primary_contact_id: primaryContactId,
    category_id: optional(formData, "category_id"),
    name: required(formData, "name", "案件名"),
    status,
    priority: text(formData, "priority") || "medium",
    description: optional(formData, "description"),
    inquiry_date: optional(formData, "inquiry_date"),
    proposal_date: optional(formData, "proposal_date"),
    order_date: optional(formData, "order_date"),
    start_date: optional(formData, "start_date"),
    due_date: optional(formData, "due_date"),
    completed_date: optional(formData, "completed_date") || (status === "completed" ? new Date().toISOString().slice(0, 10) : null),
    ...pricingFields(formData),
    win_probability: numberOrNull(formData, "win_probability"),
    expected_close_date: optional(formData, "expected_close_date"),
    next_action: optional(formData, "next_action"),
    next_action_due: jstDateTimeOrNull(formData, "next_action_due"),
    memo: optional(formData, "memo")
  }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProjectMutation(id);
  redirect(`/projects/${id}`);
}

export async function adjustProjectCompletedUnits(formData: FormData) {
  const id = required(formData, "id", "案件ID");
  const deltaRaw = Number(text(formData, "delta"));
  const delta = deltaRaw >= 0 ? 1 : -1;
  if (demoMode) demoReturn(formData, `/projects/${id}`);
  const { supabase } = await authed();
  const { data, error } = await supabase
    .from("projects")
    .select("pricing_model,completed_units,planned_units")
    .eq("id", id)
    .single();
  if (error) throw new Error(error.message);
  if (data.pricing_model !== "unit") throw new Error("単価×回数の案件ではありません。");

  const current = Number(data.completed_units ?? 0);
  const planned = Number(data.planned_units ?? 0);
  const completed = Math.max(0, current + delta);
  const nextPlanned = delta > 0 && completed > planned ? completed : planned;
  const { error: updateError } = await supabase
    .from("projects")
    .update({ completed_units: completed, planned_units: nextPlanned })
    .eq("id", id);
  if (updateError) throw new Error(updateError.message);
  invalidateProjectMutation(id);
  redirect(`/projects/${id}`);
}

export async function archiveProject(formData: FormData) {
  const id = required(formData, "id", "案件ID");
  if (demoMode) demoReturn(formData, "/projects");
  const { supabase } = await authed();
  const { error } = await supabase.from("projects").update({ is_archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProjectMutation(id);
  redirect("/projects");
}

export async function createProjectLink(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}`);
  const { supabase, userId } = await authed();
  const pinned = checkbox(formData, "is_pinned");
  let pinOrder: number | null = null;

  if (pinned) {
    const { data: current, error: pinError } = await supabase
      .from("project_links")
      .select("pin_order")
      .eq("project_id", projectId)
      .eq("is_pinned", true);
    if (pinError) throw new Error(pinError.message);
    const used = new Set((current ?? []).map((x) => x.pin_order).filter(Boolean));
    const available = [1, 2, 3, 4].find((n) => !used.has(n));
    if (!available) throw new Error("クイックリンクは最大4件です。");
    pinOrder = available;
  }

  const { error } = await supabase.from("project_links").insert({
    user_id: userId,
    project_id: projectId,
    name: required(formData, "name", "表示名"),
    url: required(formData, "url", "URL"),
    link_type: text(formData, "link_type") || "other",
    memo: optional(formData, "memo"),
    is_pinned: pinned,
    pin_order: pinOrder
  });
  if (error) throw new Error(error.message);
  invalidateLinkMutation(projectId);
  redirect(`/projects/${projectId}?tab=links`);
}

export async function updateProjectLink(formData: FormData) {
  const id = required(formData, "id", "リンクID");
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}`);
  const { supabase } = await authed();
  const { data: existing, error: existingError } = await supabase
    .from("project_links")
    .select("is_pinned,pin_order")
    .eq("id", id)
    .eq("project_id", projectId)
    .single();
  if (existingError) throw new Error(existingError.message);

  const pinned = checkbox(formData, "is_pinned");
  let pinOrder: number | null = null;
  if (pinned) {
    if (existing.is_pinned && existing.pin_order) {
      pinOrder = existing.pin_order;
    } else {
      const { data: current, error: pinError } = await supabase
        .from("project_links")
        .select("pin_order")
        .eq("project_id", projectId)
        .eq("is_pinned", true)
        .neq("id", id);
      if (pinError) throw new Error(pinError.message);
      const used = new Set((current ?? []).map((x) => x.pin_order).filter(Boolean));
      const available = [1, 2, 3, 4].find((n) => !used.has(n));
      if (!available) throw new Error("クイックリンクは最大4件です。");
      pinOrder = available;
    }
  }

  const { error } = await supabase.from("project_links").update({
    name: required(formData, "name", "表示名"),
    url: required(formData, "url", "URL"),
    link_type: text(formData, "link_type") || "other",
    memo: optional(formData, "memo"),
    is_pinned: pinned,
    pin_order: pinOrder
  }).eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  invalidateLinkMutation(projectId);
  redirect(returnTarget(formData, `/projects/${projectId}?tab=links`));
}

export async function deleteProjectLink(formData: FormData) {
  const id = required(formData, "id", "リンクID");
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}`);
  const { supabase } = await authed();
  const { error } = await supabase.from("project_links").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateLinkMutation(projectId);
  redirect(`/projects/${projectId}?tab=links`);
}

export async function createTask(formData: FormData) {
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/tasks");
  const { supabase, userId } = await authed();
  const companyId = await resolveCompanyIdForProject(supabase, projectId, optional(formData, "company_id"));
  const status = text(formData, "status") || "todo";
  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    company_id: companyId,
    project_id: projectId,
    title: required(formData, "title", "タスク名"),
    description: optional(formData, "description"),
    status,
    priority: text(formData, "priority") || "medium",
    start_date: optional(formData, "start_date"),
    due_at: jstDateTimeOrNull(formData, "due_at"),
    waiting_since: status === "waiting" ? (jstDateTimeOrNull(formData, "waiting_since") || new Date().toISOString()) : null,
    follow_up_at: status === "waiting" ? jstDateTimeOrNull(formData, "follow_up_at") : null,
    memo: optional(formData, "memo")
  });
  if (error) throw new Error(error.message);
  invalidateTaskMutation(projectId);
  redirect(projectId ? `/projects/${projectId}?tab=tasks` : "/tasks");
}

export async function updateTask(formData: FormData) {
  const id = required(formData, "id", "タスクID");
  const projectId = optional(formData, "project_id");
  const oldProjectId = optional(formData, "old_project_id");
  if (demoMode) demoReturn(formData, returnTarget(formData, projectId ? `/projects/${projectId}?tab=tasks` : "/tasks"));
  const { supabase } = await authed();
  const companyId = await resolveCompanyIdForProject(supabase, projectId, optional(formData, "company_id"));
  const status = text(formData, "status") || "todo";
  const { data: existing, error: existingError } = await supabase.from("tasks").select("status,waiting_since").eq("id", id).single();
  if (existingError) throw new Error(existingError.message);
  const waitingSinceInput = jstDateTimeOrNull(formData, "waiting_since");
  const waitingSince = status === "waiting" ? (waitingSinceInput || (existing.status === "waiting" ? existing.waiting_since : null) || new Date().toISOString()) : null;
  const { error } = await supabase.from("tasks").update({
    company_id: companyId,
    project_id: projectId,
    title: required(formData, "title", "タスク名"),
    description: optional(formData, "description"),
    status,
    priority: text(formData, "priority") || "medium",
    start_date: optional(formData, "start_date"),
    due_at: jstDateTimeOrNull(formData, "due_at"),
    completed_at: status === "completed" ? new Date().toISOString() : null,
    waiting_since: waitingSince,
    follow_up_at: status === "waiting" ? jstDateTimeOrNull(formData, "follow_up_at") : null,
    memo: optional(formData, "memo")
  }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateTaskMutation(oldProjectId);
  if (projectId && projectId !== oldProjectId) invalidateTaskMutation(projectId);
  redirect(returnTarget(formData, projectId ? `/projects/${projectId}?tab=tasks` : "/tasks"));
}

export async function setTaskStatus(formData: FormData) {
  const id = required(formData, "id", "タスクID");
  const status = required(formData, "status", "ステータス");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/tasks");
  const { supabase } = await authed();
  const { data: existing, error: existingError } = await supabase.from("tasks").select("status,waiting_since").eq("id", id).single();
  if (existingError) throw new Error(existingError.message);
  const { error } = await supabase.from("tasks").update({
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
    waiting_since: status === "waiting" ? (existing.waiting_since || new Date().toISOString()) : null,
    follow_up_at: status === "waiting" ? undefined : null
  }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateTaskMutation(projectId);
  redirect(projectId ? `/projects/${projectId}?tab=tasks` : "/tasks");
}

export async function setTaskStatusQuick(id: string, status: "todo" | "completed", projectId?: string) {
  if (demoMode) return { ok: true };
  const { supabase } = await authed();
  const { error } = await supabase.from("tasks").update({
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null,
    waiting_since: null,
    follow_up_at: null
  }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateTaskMutation(projectId);
  return { ok: true };
}


export async function markTaskFollowedUp(formData: FormData) {
  const id = required(formData, "id", "タスクID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, returnTarget(formData, projectId ? `/projects/${projectId}?tab=tasks` : "/tasks?filter=waiting"));
  const { supabase } = await authed();
  const { error } = await supabase.from("tasks").update({
    status: "waiting",
    waiting_since: new Date().toISOString(),
    follow_up_at: null
  }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateTaskMutation(projectId);
  redirect(returnTarget(formData, projectId ? `/projects/${projectId}?tab=tasks` : "/tasks?filter=waiting"));
}

export async function deleteTask(formData: FormData) {
  const id = required(formData, "id", "タスクID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/tasks");
  const { supabase } = await authed();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateTaskMutation(projectId);
  redirect(projectId ? `/projects/${projectId}?tab=tasks` : "/tasks");
}

export async function createActivity(formData: FormData) {
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/dashboard");
  const { supabase, userId } = await authed();
  const companyId = required(formData, "company_id", "取引先");
  const nextAction = optional(formData, "next_action");
  const nextActionDue = jstDateTimeOrNull(formData, "next_action_due");

  const { error } = await supabase.from("activities").insert({
    user_id: userId,
    company_id: companyId,
    project_id: projectId,
    contact_id: optional(formData, "contact_id"),
    activity_type: text(formData, "activity_type") || "other",
    activity_at: jstDateTimeOrNull(formData, "activity_at") || new Date().toISOString(),
    title: optional(formData, "title"),
    content: required(formData, "content", "活動内容"),
    next_action: nextAction
  });
  if (error) throw new Error(error.message);

  if (projectId && checkbox(formData, "update_project_next_action") && nextAction) {
    const { error: updateError } = await supabase.from("projects").update({
      next_action: nextAction,
      next_action_due: nextActionDue
    }).eq("id", projectId);
    if (updateError) throw new Error(updateError.message);
  }

  invalidateActivityMutation(projectId, Boolean(projectId && checkbox(formData, "update_project_next_action") && nextAction));
  redirect(projectId ? `/projects/${projectId}?tab=activities` : "/dashboard");
}

export async function updateActivity(formData: FormData) {
  const id = required(formData, "id", "活動ID");
  const projectId = optional(formData, "project_id");
  const oldProjectId = optional(formData, "old_project_id");
  if (demoMode) demoReturn(formData, returnTarget(formData, projectId ? `/projects/${projectId}?tab=activities` : "/dashboard"));
  const { supabase } = await authed();
  const companyId = required(formData, "company_id", "取引先");
  const nextAction = optional(formData, "next_action");
  const nextActionDue = jstDateTimeOrNull(formData, "next_action_due");
  const { error } = await supabase.from("activities").update({
    company_id: companyId,
    project_id: projectId,
    contact_id: optional(formData, "contact_id"),
    activity_type: text(formData, "activity_type") || "other",
    activity_at: jstDateTimeOrNull(formData, "activity_at") || new Date().toISOString(),
    title: optional(formData, "title"),
    content: required(formData, "content", "活動内容"),
    next_action: nextAction
  }).eq("id", id);
  if (error) throw new Error(error.message);

  const updateProject = Boolean(projectId && checkbox(formData, "update_project_next_action") && nextAction);
  if (updateProject && projectId) {
    const { error: updateError } = await supabase.from("projects").update({ next_action: nextAction, next_action_due: nextActionDue }).eq("id", projectId);
    if (updateError) throw new Error(updateError.message);
  }
  invalidateActivityMutation(oldProjectId, false);
  if (projectId && projectId !== oldProjectId) invalidateActivityMutation(projectId, updateProject);
  else if (projectId) invalidateActivityMutation(projectId, updateProject);
  redirect(returnTarget(formData, projectId ? `/projects/${projectId}?tab=activities` : "/dashboard"));
}

export async function deleteActivity(formData: FormData) {
  const id = required(formData, "id", "活動ID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/dashboard");
  const { supabase } = await authed();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateActivityMutation(projectId);
  redirect(projectId ? `/projects/${projectId}?tab=activities` : "/dashboard");
}

export async function createSchedule(formData: FormData) {
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/schedule");
  const { supabase, userId } = await authed();
  const companyId = await resolveCompanyIdForProject(supabase, projectId, optional(formData, "company_id"));
  const { data, error } = await supabase.from("schedules").insert({
    user_id: userId,
    company_id: companyId,
    project_id: projectId,
    title: required(formData, "title", "件名"),
    schedule_type: text(formData, "schedule_type") || "other",
    start_at: jstDateTimeOrNull(formData, "start_at") ?? (() => { throw new Error("開始日時は必須です。"); })(),
    end_at: jstDateTimeOrNull(formData, "end_at"),
    all_day: checkbox(formData, "all_day"),
    location: optional(formData, "location"),
    description: optional(formData, "description")
  }).select("id").single();
  if (error) throw new Error(error.message);
  await syncScheduleToGoogle(supabase, userId, data.id);
  invalidateScheduleMutation(projectId);
  redirect(projectId ? `/projects/${projectId}?tab=schedule` : "/schedule");
}

export async function updateSchedule(formData: FormData) {
  const id = required(formData, "id", "予定ID");
  const projectId = optional(formData, "project_id");
  const oldProjectId = optional(formData, "old_project_id");
  if (demoMode) demoReturn(formData, returnTarget(formData, projectId ? `/projects/${projectId}?tab=schedule` : "/schedule"));
  const { supabase, userId } = await authed();
  const companyId = await resolveCompanyIdForProject(supabase, projectId, optional(formData, "company_id"));
  const { error } = await supabase.from("schedules").update({
    company_id: companyId,
    project_id: projectId,
    title: required(formData, "title", "件名"),
    schedule_type: text(formData, "schedule_type") || "other",
    start_at: jstDateTimeOrNull(formData, "start_at") ?? (() => { throw new Error("開始日時は必須です。"); })(),
    end_at: jstDateTimeOrNull(formData, "end_at"),
    all_day: checkbox(formData, "all_day"),
    location: optional(formData, "location"),
    description: optional(formData, "description")
  }).eq("id", id);
  if (error) throw new Error(error.message);
  await syncScheduleToGoogle(supabase, userId, id);
  invalidateScheduleMutation(oldProjectId);
  if (projectId && projectId !== oldProjectId) invalidateScheduleMutation(projectId);
  redirect(returnTarget(formData, projectId ? `/projects/${projectId}?tab=schedule` : "/schedule"));
}

export async function deleteSchedule(formData: FormData) {
  const id = required(formData, "id", "予定ID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/schedule");
  const { supabase, userId } = await authed();
  await deleteScheduleFromGoogle(supabase, userId, id);
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateScheduleMutation(projectId);
  redirect(projectId ? `/projects/${projectId}?tab=schedule` : "/schedule");
}

export async function syncScheduleNow(formData: FormData) {
  const id = required(formData, "id", "予定ID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/schedule");
  const { supabase, userId } = await authed();
  await syncScheduleToGoogle(supabase, userId, id);
  invalidateScheduleMutation(projectId);
  redirect(projectId ? `/projects/${projectId}?tab=schedule` : "/schedule");
}

export async function importGoogleCalendar() {
  if (demoMode) redirect("/schedule?demo_notice=1");
  const { supabase, userId } = await authed();
  let target = "/schedule?sync=error";
  try {
    const result = await pullGoogleCalendar(supabase, userId);
    revalidatePath("/schedule");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    const qs = new URLSearchParams({
      sync: "ok",
      updated: String(result.updated),
      linked: String(result.linked),
      deleted: String(result.deleted),
      skipped: String(result.skipped)
    });
    target = `/schedule?${qs.toString()}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Calendar同期に失敗しました。";
    target = `/schedule?sync=error&message=${encodeURIComponent(message)}`;
  }
  redirect(target);
}

export async function disconnectGoogleCalendar() {
  if (demoMode) redirect("/settings?demo_notice=1");
  const { supabase, userId } = await authed();
  await revokeGoogleCalendarConnection(supabase, userId);
  revalidatePath("/settings");
  revalidatePath("/schedule");
  redirect("/settings?calendar=disconnected");
}

export async function createProjectDriveFolder(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}/drive`);
  const { supabase, userId } = await authed();
  let target = `/projects/${projectId}/drive?drive=error`;
  try {
    const result = await registerProjectDriveFolder(supabase, userId, projectId, required(formData, "folder_url", "Google DriveフォルダURL"));
    invalidateDriveMutation(projectId);
    const qs = new URLSearchParams({ drive: "added", count: String(result.count), truncated: result.truncated ? "1" : "0" });
    target = `/projects/${projectId}/drive?${qs.toString()}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Driveフォルダを登録できませんでした。";
    target = `/projects/${projectId}/drive/new?error=${encodeURIComponent(message)}`;
  }
  redirect(target);
}

export async function syncProjectDriveFolderNow(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  const folderId = required(formData, "drive_folder_id", "DriveフォルダID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}/drive`);
  const { supabase, userId } = await authed();
  let target = `/projects/${projectId}/drive?drive=error`;
  try {
    const result = await syncProjectDriveFolder(supabase, userId, folderId);
    invalidateDriveMutation(projectId);
    const qs = new URLSearchParams({ drive: "synced", count: String(result.count), truncated: result.truncated ? "1" : "0" });
    target = `/projects/${projectId}/drive?${qs.toString()}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Google Drive同期に失敗しました。";
    target = `/projects/${projectId}/drive?drive=error&message=${encodeURIComponent(message)}`;
  }
  redirect(target);
}

export async function deleteProjectDriveFolder(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  const folderId = required(formData, "drive_folder_id", "DriveフォルダID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}/drive`);
  const { supabase } = await authed();
  const { error } = await supabase.from("project_drive_folders").delete().eq("id", folderId).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  invalidateDriveMutation(projectId);
  redirect(`/projects/${projectId}/drive?drive=removed`);
}

export async function createContact(formData: FormData) {
  const companyId = required(formData, "company_id", "取引先ID");
  if (demoMode) demoReturn(formData, `/companies/${companyId}`);
  const { supabase, userId } = await authed();
  const { error } = await supabase.from("contacts").insert({
    user_id: userId,
    company_id: companyId,
    name: required(formData, "name", "氏名"),
    department: optional(formData, "department"),
    position: optional(formData, "position"),
    email: optional(formData, "email"),
    phone: optional(formData, "phone"),
    mobile: optional(formData, "mobile"),
    memo: optional(formData, "memo")
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/projects");
  redirect(`/companies/${companyId}#contacts`);
}

export async function updateContact(formData: FormData) {
  const id = required(formData, "id", "担当者ID");
  const companyId = required(formData, "company_id", "取引先ID");
  if (demoMode) demoReturn(formData, `/companies/${companyId}#contacts`);
  const { supabase } = await authed();
  const { error } = await supabase.from("contacts").update({
    name: required(formData, "name", "氏名"),
    department: optional(formData, "department"),
    position: optional(formData, "position"),
    email: optional(formData, "email"),
    phone: optional(formData, "phone"),
    mobile: optional(formData, "mobile"),
    memo: optional(formData, "memo")
  }).eq("id", id).eq("company_id", companyId);
  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/projects");
  revalidatePath("/search");
  redirect(`/companies/${companyId}#contacts`);
}

export async function deleteContact(formData: FormData) {
  const id = required(formData, "id", "担当者ID");
  const companyId = required(formData, "company_id", "取引先ID");
  if (demoMode) demoReturn(formData, `/companies/${companyId}`);
  const { supabase } = await authed();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}#contacts`);
}

export async function syncProjectGmailNow(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}?tab=activities`);
  const { supabase, userId } = await authed();
  let target = `/projects/${projectId}?tab=activities&gmail=error`;
  try {
    const result = await syncProjectGmail(supabase, userId, projectId);
    revalidatePath(`/projects/${projectId}`);
    const qs = new URLSearchParams({ tab: "activities", gmail: "synced", count: String(result.count) });
    target = `/projects/${projectId}?${qs.toString()}`;
  } catch (e) {
    const message = e instanceof Error ? e.message : "Gmail同期に失敗しました。";
    const qs = new URLSearchParams({ tab: "activities", gmail: "error", message });
    target = `/projects/${projectId}?${qs.toString()}`;
  }
  redirect(target);
}

export async function createActivityFromGmail(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  const gmailRowId = required(formData, "gmail_row_id", "GmailメッセージID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}?tab=activities`);
  const { supabase, userId } = await authed();

  const { data: mail, error: mailError } = await supabase
    .from("gmail_messages")
    .select("id,company_id,project_id,gmail_message_id,subject,from_text,to_text,sent_at,snippet,gmail_url,is_outgoing,activity_id")
    .eq("id", gmailRowId)
    .eq("project_id", projectId)
    .single();
  if (mailError) throw new Error(mailError.message);

  if (mail.activity_id) redirect(`/projects/${projectId}?tab=activities&gmail=already_added`);

  const direction = mail.is_outgoing ? "送信メール" : "受信メール";
  const content = [
    direction,
    mail.from_text ? `差出人: ${mail.from_text}` : null,
    mail.to_text ? `宛先: ${mail.to_text}` : null,
    "",
    mail.snippet || "（本文プレビューなし）",
    "",
    `Gmail: ${mail.gmail_url}`
  ].filter((v) => v !== null).join("\n");

  const { data: activity, error: activityError } = await supabase.from("activities").insert({
    user_id: userId,
    company_id: mail.company_id,
    project_id: projectId,
    activity_type: "email",
    activity_at: mail.sent_at || new Date().toISOString(),
    title: mail.subject || "(件名なし)",
    content,
    source: "gmail",
    source_external_id: mail.gmail_message_id
  }).select("id").single();

  if (activityError) {
    if (activityError.code === "23505") redirect(`/projects/${projectId}?tab=activities&gmail=already_added`);
    throw new Error(activityError.message);
  }

  const { error: updateError } = await supabase.from("gmail_messages").update({ activity_id: activity.id }).eq("id", gmailRowId);
  if (updateError) throw new Error(updateError.message);

  invalidateActivityMutation(projectId);
  redirect(`/projects/${projectId}?tab=activities&gmail=added`);
}

export async function createTaskFromGmail(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  const gmailRowId = required(formData, "gmail_row_id", "GmailメッセージID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}?tab=activities`);
  const { supabase, userId } = await authed();

  const { data: mail, error: mailError } = await supabase
    .from("gmail_messages")
    .select("id,company_id,project_id,gmail_message_id,subject,from_text,to_text,sent_at,snippet,gmail_url,is_outgoing,task_id")
    .eq("id", gmailRowId)
    .eq("project_id", projectId)
    .single();
  if (mailError) throw new Error(mailError.message);

  if (mail.task_id) redirect(`/projects/${projectId}?tab=activities&gmail=task_already_added`);

  const statusRaw = text(formData, "status");
  const status = ["todo", "doing", "waiting"].includes(statusRaw) ? statusRaw : (mail.is_outgoing ? "waiting" : "todo");

  const { data: task, error: taskError } = await supabase.from("tasks").insert({
    user_id: userId,
    company_id: mail.company_id,
    project_id: projectId,
    title: required(formData, "title", "タスク名"),
    description: optional(formData, "description"),
    status,
    priority: text(formData, "priority") || "medium",
    start_date: optional(formData, "start_date"),
    due_at: jstDateTimeOrNull(formData, "due_at"),
    waiting_since: status === "waiting" ? (mail.sent_at || new Date().toISOString()) : null,
    follow_up_at: status === "waiting" ? jstDateTimeOrNull(formData, "follow_up_at") : null,
    memo: optional(formData, "memo"),
    source: "gmail",
    source_external_id: mail.gmail_message_id
  }).select("id").single();

  if (taskError) {
    if (taskError.code === "23505") redirect(`/projects/${projectId}?tab=activities&gmail=task_already_added`);
    throw new Error(taskError.message);
  }

  const { error: updateError } = await supabase.from("gmail_messages").update({ task_id: task.id }).eq("id", gmailRowId);
  if (updateError) throw new Error(updateError.message);

  invalidateTaskMutation(projectId);
  revalidatePath(`/projects/${projectId}/mail`);
  redirect(`/projects/${projectId}?tab=activities&gmail=task_added`);
}


function intInRange(formData: FormData, name: string, fallback: number, min: number, max: number) {
  const parsed = Number(text(formData, name));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

export async function saveActionPreferences(formData: FormData) {
  if (demoMode) demoReturn(formData, "/settings");
  const { supabase, userId } = await authed();
  const payload = {
    user_id: userId,
    waiting_followup_days: intInRange(formData, "waiting_followup_days", 3, 1, 30),
    stale_project_days: intInRange(formData, "stale_project_days", 14, 3, 90),
    task_horizon_days: intInRange(formData, "task_horizon_days", 7, 1, 30),
    schedule_horizon_days: intInRange(formData, "schedule_horizon_days", 7, 1, 30),
    project_due_horizon_days: intInRange(formData, "project_due_horizon_days", 7, 1, 30),
    gmail_lookback_days: intInRange(formData, "gmail_lookback_days", 7, 1, 30),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("user_preferences").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  revalidatePath("/focus");
  revalidatePath("/dashboard");
  redirect("/settings?action_rules=saved");
}

export async function restoreProject(formData: FormData) {
  const id = required(formData, "id", "案件ID");
  if (demoMode) demoReturn(formData, "/archive");
  const { supabase } = await authed();
  const { data: project, error: findError } = await supabase.from("projects").select("company_id").eq("id", id).single();
  if (findError) throw new Error(findError.message);
  const { error } = await supabase.from("projects").update({ is_archived: false }).eq("id", id);
  if (error) throw new Error(error.message);
  if (project?.company_id) {
    const { error: companyError } = await supabase.from("companies").update({ is_archived: false }).eq("id", project.company_id);
    if (companyError) throw new Error(companyError.message);
  }
  revalidatePath("/archive");
  revalidatePath("/projects");
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  redirect("/archive?restored=project");
}

export async function restoreCompany(formData: FormData) {
  const id = required(formData, "id", "取引先ID");
  if (demoMode) demoReturn(formData, "/archive");
  const { supabase } = await authed();
  const { error } = await supabase.from("companies").update({ is_archived: false }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/archive");
  revalidatePath("/companies");
  revalidatePath("/dashboard");
  redirect("/archive?restored=company");
}

function todayJstDate() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function invalidateBillingMutation(projectId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/billing");
  revalidatePath("/pipeline");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}


async function getInvoiceSettingsRow(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data, error } = await supabase.from("invoice_settings")
    .select("issuer_name,issuer_postal_code,issuer_address,issuer_phone,issuer_email,registration_number,bank_name,bank_branch,bank_account_type,bank_account_number,bank_account_name,invoice_prefix,next_invoice_number,default_tax_rate,payment_note,estimate_prefix,next_estimate_number,default_estimate_valid_days,estimate_note")
    .eq("user_id", userId)
    .maybeSingle();
  if (error && !["42P01", "PGRST205"].includes(error.code ?? "")) throw new Error(error.message);
  return data ?? null;
}

async function allocateInvoiceReference(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  let settings = await getInvoiceSettingsRow(supabase, userId);
  if (!settings) {
    const { data, error } = await supabase.from("invoice_settings").insert({ user_id: userId }).select("invoice_prefix,next_invoice_number").single();
    if (error) throw new Error(error.message);
    settings = data as any;
  }
  if (!settings) throw new Error("請求書設定を取得できませんでした。");
  const prefix = String(settings.invoice_prefix || "INV").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20) || "INV";
  const next = Math.max(1, Number(settings.next_invoice_number || 1));
  const date = todayJstDate().replaceAll("-", "").slice(0, 6);
  const reference = `${prefix}-${date}-${String(next).padStart(4, "0")}`;
  const { error } = await supabase.from("invoice_settings").update({ next_invoice_number: next + 1 }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return reference;
}

async function buildInvoiceSnapshots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string,
  billing: { name?: string | null; postalCode?: string | null; address?: string | null }
) {
  const [settings, companyResult] = await Promise.all([
    getInvoiceSettingsRow(supabase, userId),
    supabase.from("companies").select("name,postal_code,address,phone,email").eq("id", companyId).single()
  ]);
  if (companyResult.error) throw new Error(companyResult.error.message);
  const company = companyResult.data;
  return {
    issuer_snapshot: {
      name: settings?.issuer_name || "",
      postalCode: settings?.issuer_postal_code || undefined,
      address: settings?.issuer_address || undefined,
      phone: settings?.issuer_phone || undefined,
      email: settings?.issuer_email || undefined,
      registrationNumber: settings?.registration_number || undefined,
      bankName: settings?.bank_name || undefined,
      bankBranch: settings?.bank_branch || undefined,
      bankAccountType: settings?.bank_account_type || undefined,
      bankAccountNumber: settings?.bank_account_number || undefined,
      bankAccountName: settings?.bank_account_name || undefined,
      paymentNote: settings?.payment_note || undefined
    },
    customer_snapshot: {
      name: billing.name || company.name,
      postalCode: billing.postalCode || company.postal_code || undefined,
      address: billing.address || company.address || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined
    },
    issued_snapshot_at: new Date().toISOString()
  };
}

async function issueInvoiceRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  id: string,
  projectId: string,
  currentReference?: string | null,
  invoiceDate?: string | null
) {
  const { data, error } = await supabase.from("project_invoices")
    .select("company_id,billing_name,billing_postal_code,billing_address,issuer_snapshot,customer_snapshot")
    .eq("id", id).eq("project_id", projectId).single();
  if (error) throw new Error(error.message);
  const update: Record<string, unknown> = { status: "invoiced", invoice_date: invoiceDate || todayJstDate() };
  if (!currentReference) update.reference_no = await allocateInvoiceReference(supabase, userId);
  if (!data.issuer_snapshot || !data.customer_snapshot) {
    Object.assign(update, await buildInvoiceSnapshots(supabase, userId, data.company_id, {
      name: data.billing_name,
      postalCode: data.billing_postal_code,
      address: data.billing_address
    }));
  }
  const { error: updateError } = await supabase.from("project_invoices").update(update).eq("id", id).eq("project_id", projectId);
  if (updateError) throw new Error(updateError.message);
}

export async function saveInvoiceSettings(formData: FormData) {
  if (demoMode) demoReturn(formData, "/settings#invoice-settings");
  const { supabase, userId } = await authed();
  const defaultTax = numberOrNull(formData, "default_tax_rate") ?? 10;
  const nextNumber = Math.max(1, Math.floor(numberOrNull(formData, "next_invoice_number") ?? 1));
  const payload = {
    user_id: userId,
    issuer_name: text(formData, "issuer_name"),
    issuer_postal_code: optional(formData, "issuer_postal_code"),
    issuer_address: optional(formData, "issuer_address"),
    issuer_phone: optional(formData, "issuer_phone"),
    issuer_email: optional(formData, "issuer_email"),
    registration_number: optional(formData, "registration_number"),
    bank_name: optional(formData, "bank_name"),
    bank_branch: optional(formData, "bank_branch"),
    bank_account_type: optional(formData, "bank_account_type"),
    bank_account_number: optional(formData, "bank_account_number"),
    bank_account_name: optional(formData, "bank_account_name"),
    invoice_prefix: text(formData, "invoice_prefix") || "INV",
    next_invoice_number: nextNumber,
    default_tax_rate: Math.max(0, Math.min(100, defaultTax)),
    payment_note: optional(formData, "payment_note"),
    estimate_prefix: text(formData, "estimate_prefix") || "EST",
    next_estimate_number: Math.max(1, Math.floor(numberOrNull(formData, "next_estimate_number") ?? 1)),
    default_estimate_valid_days: Math.max(1, Math.min(365, Math.floor(numberOrNull(formData, "default_estimate_valid_days") ?? 30))),
    estimate_note: optional(formData, "estimate_note")
  };
  const { error } = await supabase.from("invoice_settings").upsert(payload, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/settings");
  redirect("/settings?invoice_settings=saved#invoice-settings");
}

export async function createProjectInvoice(formData: FormData) {
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}?tab=billing`);
  const { supabase, userId } = await authed();
  const { data: project, error: projectError } = await supabase.from("projects").select("company_id").eq("id", projectId).single();
  if (projectError) throw new Error(projectError.message);
  const rawStatus = text(formData, "status");
  const status = ["planned","invoiced","paid","cancelled"].includes(rawStatus) ? rawStatus : "planned";
  const today = todayJstDate();
  const amount = numberOrNull(formData, "amount");
  if (amount == null) throw new Error("請求額は必須です。");
  const taxRate = Math.max(0, Math.min(100, numberOrNull(formData, "tax_rate") ?? 0));
  const insertPayload = {
    user_id: userId,
    project_id: projectId,
    company_id: project.company_id,
    title: required(formData, "title", "請求名"),
    status: status === "paid" ? "invoiced" : status,
    amount,
    unit_quantity: numberOrNull(formData, "unit_quantity"),
    unit_price: numberOrNull(formData, "unit_price"),
    scheduled_invoice_date: optional(formData, "scheduled_invoice_date"),
    invoice_date: optional(formData, "invoice_date") || (["invoiced","paid"].includes(status) ? today : null),
    due_date: optional(formData, "due_date"),
    paid_date: optional(formData, "paid_date") || (status === "paid" ? today : null),
    reference_no: optional(formData, "reference_no"),
    line_description: optional(formData, "line_description"),
    tax_rate: taxRate,
    billing_name: optional(formData, "billing_name"),
    billing_postal_code: optional(formData, "billing_postal_code"),
    billing_address: optional(formData, "billing_address"),
    memo: optional(formData, "memo")
  };
  const { data: created, error } = await supabase.from("project_invoices").insert(insertPayload).select("id,reference_no,invoice_date").single();
  if (error) throw new Error(error.message);
  if (["invoiced","paid"].includes(status)) {
    await issueInvoiceRecord(supabase, userId, created.id, projectId, created.reference_no, created.invoice_date);
    if (status === "paid") {
      const { error: paidError } = await supabase.from("project_invoices").update({ status: "paid", paid_date: insertPayload.paid_date || today }).eq("id", created.id);
      if (paidError) throw new Error(paidError.message);
    }
  }
  invalidateBillingMutation(projectId);
  redirect(`/projects/${projectId}?tab=billing`);
}

export async function updateProjectInvoice(formData: FormData) {
  const id = required(formData, "id", "請求ID");
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}?tab=billing`);
  const { supabase, userId } = await authed();
  const rawStatus = text(formData, "status");
  const status = ["planned","invoiced","paid","cancelled"].includes(rawStatus) ? rawStatus : "planned";
  const today = todayJstDate();
  const amount = numberOrNull(formData, "amount");
  if (amount == null) throw new Error("請求額は必須です。");
  const taxRate = Math.max(0, Math.min(100, numberOrNull(formData, "tax_rate") ?? 0));
  const { data: current, error: currentError } = await supabase.from("project_invoices").select("status,reference_no,invoice_date").eq("id", id).eq("project_id", projectId).single();
  if (currentError) throw new Error(currentError.message);
  const { error } = await supabase.from("project_invoices").update({
    title: required(formData, "title", "請求名"),
    status: status === "paid" ? "invoiced" : status,
    amount,
    unit_quantity: numberOrNull(formData, "unit_quantity"),
    unit_price: numberOrNull(formData, "unit_price"),
    scheduled_invoice_date: optional(formData, "scheduled_invoice_date"),
    invoice_date: optional(formData, "invoice_date") || (["invoiced","paid"].includes(status) ? today : null),
    due_date: optional(formData, "due_date"),
    paid_date: optional(formData, "paid_date") || (status === "paid" ? today : null),
    reference_no: optional(formData, "reference_no") || current.reference_no,
    line_description: optional(formData, "line_description"),
    tax_rate: taxRate,
    billing_name: optional(formData, "billing_name"),
    billing_postal_code: optional(formData, "billing_postal_code"),
    billing_address: optional(formData, "billing_address"),
    memo: optional(formData, "memo")
  }).eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  if (["invoiced","paid"].includes(status)) {
    await issueInvoiceRecord(supabase, userId, id, projectId, optional(formData, "reference_no") || current.reference_no, optional(formData, "invoice_date") || current.invoice_date);
  }
  if (status === "paid") {
    const { error: paidError } = await supabase.from("project_invoices").update({ status: "paid", paid_date: optional(formData, "paid_date") || today }).eq("id", id);
    if (paidError) throw new Error(paidError.message);
  }
  invalidateBillingMutation(projectId);
  redirect(returnTarget(formData, `/projects/${projectId}?tab=billing`));
}

export async function advanceInvoiceStatus(formData: FormData) {
  const id = required(formData, "id", "請求ID");
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, returnTarget(formData, `/projects/${projectId}?tab=billing`));
  const { supabase, userId } = await authed();
  const { data, error } = await supabase.from("project_invoices").select("status,invoice_date,paid_date,reference_no").eq("id", id).single();
  if (error) throw new Error(error.message);
  const today = todayJstDate();
  if (data.status === "planned") {
    await issueInvoiceRecord(supabase, userId, id, projectId, data.reference_no, data.invoice_date || today);
  } else if (data.status === "invoiced") {
    if (!data.reference_no) await issueInvoiceRecord(supabase, userId, id, projectId, data.reference_no, data.invoice_date || today);
    const { error: updateError } = await supabase.from("project_invoices").update({ status: "paid", paid_date: data.paid_date || today }).eq("id", id);
    if (updateError) throw new Error(updateError.message);
  } else {
    redirect(returnTarget(formData, `/projects/${projectId}?tab=billing`));
  }
  invalidateBillingMutation(projectId);
  redirect(returnTarget(formData, `/projects/${projectId}?tab=billing`));
}

export async function cancelProjectInvoice(formData: FormData) {
  const id = required(formData, "id", "請求ID");
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, returnTarget(formData, `/projects/${projectId}?tab=billing`));
  const { supabase } = await authed();
  const { error } = await supabase.from("project_invoices").update({ status: "cancelled" }).eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  invalidateBillingMutation(projectId);
  redirect(returnTarget(formData, `/projects/${projectId}?tab=billing`));
}

export async function deleteProjectInvoice(formData: FormData) {
  const id = required(formData, "id", "請求ID");
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, returnTarget(formData, `/projects/${projectId}?tab=billing`));
  const { supabase } = await authed();
  const { error } = await supabase.from("project_invoices").delete().eq("id", id).eq("project_id", projectId);
  if (error) throw new Error(error.message);
  invalidateBillingMutation(projectId);
  redirect(returnTarget(formData, `/projects/${projectId}?tab=billing`));
}

function formValues(formData: FormData, name: string) {
  return formData.getAll(name).map((v) => typeof v === "string" ? v.trim() : "");
}

function estimateItemsFromForm(formData: FormData) {
  const descriptions = formValues(formData, "item_description");
  const quantities = formValues(formData, "item_quantity");
  const units = formValues(formData, "item_unit");
  const unitPrices = formValues(formData, "item_unit_price");
  const taxRates = formValues(formData, "item_tax_rate");
  const items = descriptions.map((description, index) => {
    if (!description) return null;
    const quantity = Math.max(0, Number(quantities[index] || 0));
    const unitPrice = Math.max(0, Math.round(Number(unitPrices[index] || 0)));
    const taxRate = Math.max(0, Math.min(100, Number(taxRates[index] || 0)));
    const lineSubtotal = Math.round(quantity * unitPrice);
    const taxAmount = Math.round(lineSubtotal * taxRate / 100);
    return {
      description,
      quantity,
      unit: units[index] || null,
      unit_price: unitPrice,
      tax_rate: taxRate,
      line_subtotal: lineSubtotal,
      tax_amount: taxAmount,
      sort_order: index
    };
  }).filter(Boolean) as Array<{description:string;quantity:number;unit:string|null;unit_price:number;tax_rate:number;line_subtotal:number;tax_amount:number;sort_order:number}>;
  if (!items.length) throw new Error("見積明細を1件以上入力してください。");
  return items;
}

async function validateEstimateRelations(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  contactId: string | null,
  projectId: string | null
) {
  const validContact = await validatePrimaryContactForCompany(supabase, companyId, contactId);
  if (projectId) {
    const { data, error } = await supabase.from("projects").select("id,company_id").eq("id", projectId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data || data.company_id !== companyId) throw new Error("見積に紐付ける案件は選択した取引先の案件から選択してください。");
  }
  return validContact;
}

async function allocateEstimateReference(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  let settings = await getInvoiceSettingsRow(supabase, userId);
  if (!settings) {
    const { data, error } = await supabase.from("invoice_settings").insert({ user_id: userId }).select("estimate_prefix,next_estimate_number").single();
    if (error) throw new Error(error.message);
    settings = data as any;
  }
  if (!settings) throw new Error("見積設定を取得できませんでした。");
  const prefix = String((settings as any).estimate_prefix || "EST").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 20) || "EST";
  const next = Math.max(1, Number((settings as any).next_estimate_number || 1));
  const date = todayJstDate().replaceAll("-", "").slice(0, 6);
  const reference = `${prefix}-${date}-${String(next).padStart(4, "0")}`;
  const { error } = await supabase.from("invoice_settings").update({ next_estimate_number: next + 1 }).eq("user_id", userId);
  if (error) throw new Error(error.message);
  return reference;
}

async function buildEstimateSnapshots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  companyId: string,
  billing: { name?: string | null; postalCode?: string | null; address?: string | null }
) {
  const [settings, companyResult] = await Promise.all([
    getInvoiceSettingsRow(supabase, userId),
    supabase.from("companies").select("name,postal_code,address,phone,email").eq("id", companyId).single()
  ]);
  if (companyResult.error) throw new Error(companyResult.error.message);
  const company = companyResult.data;
  return {
    issuer_snapshot: {
      name: settings?.issuer_name || "",
      postalCode: settings?.issuer_postal_code || undefined,
      address: settings?.issuer_address || undefined,
      phone: settings?.issuer_phone || undefined,
      email: settings?.issuer_email || undefined,
      registrationNumber: settings?.registration_number || undefined
    },
    customer_snapshot: {
      name: billing.name || company.name,
      postalCode: billing.postalCode || company.postal_code || undefined,
      address: billing.address || company.address || undefined,
      phone: company.phone || undefined,
      email: company.email || undefined
    },
    issued_snapshot_at: new Date().toISOString()
  };
}

function invalidateEstimateMutation(projectId?: string | null) {
  revalidatePath("/estimates");
  revalidatePath("/dashboard");
  revalidatePath("/pipeline");
  if (projectId) revalidatePath(`/projects/${projectId}`);
}

export async function createEstimate(formData: FormData) {
  if (demoMode) demoReturn(formData, "/estimates");
  const { supabase, userId } = await authed();
  const companyId = required(formData, "company_id", "取引先");
  const projectId = optional(formData, "project_id");
  const contactId = await validateEstimateRelations(supabase, companyId, optional(formData, "contact_id"), projectId);
  const items = estimateItemsFromForm(formData);
  const subtotal = items.reduce((sum, x) => sum + x.line_subtotal, 0);
  const taxAmount = items.reduce((sum, x) => sum + x.tax_amount, 0);
  const statusRaw = text(formData, "status");
  const status = ["draft","sent","accepted","rejected","expired"].includes(statusRaw) ? statusRaw : "draft";
  const estimateNo = await allocateEstimateReference(supabase, userId);
  const payload: Record<string, unknown> = {
    user_id: userId,
    company_id: companyId,
    contact_id: contactId,
    project_id: projectId,
    estimate_no: estimateNo,
    title: required(formData, "title", "見積名"),
    status,
    issue_date: optional(formData, "issue_date") || todayJstDate(),
    valid_until: optional(formData, "valid_until"),
    accepted_date: status === "accepted" ? (optional(formData, "accepted_date") || todayJstDate()) : optional(formData, "accepted_date"),
    billing_name: optional(formData, "billing_name"),
    billing_postal_code: optional(formData, "billing_postal_code"),
    billing_address: optional(formData, "billing_address"),
    subtotal,
    tax_amount: taxAmount,
    total_amount: subtotal + taxAmount,
    memo: optional(formData, "memo"),
    terms: optional(formData, "terms")
  };
  if (status !== "draft") Object.assign(payload, await buildEstimateSnapshots(supabase, userId, companyId, {
    name: payload.billing_name as string | null,
    postalCode: payload.billing_postal_code as string | null,
    address: payload.billing_address as string | null
  }));
  const { data, error } = await supabase.from("estimates").insert(payload).select("id").single();
  if (error) throw new Error(error.message);
  const { error: itemError } = await supabase.from("estimate_items").insert(items.map((x) => ({...x, user_id: userId, estimate_id: data.id})));
  if (itemError) {
    await supabase.from("estimates").delete().eq("id", data.id);
    throw new Error(itemError.message);
  }
  invalidateEstimateMutation(projectId);
  redirect(`/estimates/${data.id}`);
}

export async function updateEstimate(formData: FormData) {
  const id = required(formData, "id", "見積ID");
  if (demoMode) demoReturn(formData, `/estimates/${id}`);
  const { supabase, userId } = await authed();
  const companyId = required(formData, "company_id", "取引先");
  const projectId = optional(formData, "project_id");
  const contactId = await validateEstimateRelations(supabase, companyId, optional(formData, "contact_id"), projectId);
  const items = estimateItemsFromForm(formData);
  const subtotal = items.reduce((sum, x) => sum + x.line_subtotal, 0);
  const taxAmount = items.reduce((sum, x) => sum + x.tax_amount, 0);
  const statusRaw = text(formData, "status");
  const status = ["draft","sent","accepted","rejected","expired"].includes(statusRaw) ? statusRaw : "draft";
  const { data: current, error: currentError } = await supabase.from("estimates").select("issuer_snapshot,customer_snapshot").eq("id", id).single();
  if (currentError) throw new Error(currentError.message);
  const payload: Record<string, unknown> = {
    company_id: companyId,
    contact_id: contactId,
    project_id: projectId,
    title: required(formData, "title", "見積名"),
    status,
    issue_date: optional(formData, "issue_date") || todayJstDate(),
    valid_until: optional(formData, "valid_until"),
    accepted_date: status === "accepted" ? (optional(formData, "accepted_date") || todayJstDate()) : optional(formData, "accepted_date"),
    billing_name: optional(formData, "billing_name"),
    billing_postal_code: optional(formData, "billing_postal_code"),
    billing_address: optional(formData, "billing_address"),
    subtotal,
    tax_amount: taxAmount,
    total_amount: subtotal + taxAmount,
    memo: optional(formData, "memo"),
    terms: optional(formData, "terms")
  };
  if (status !== "draft" && (!current.issuer_snapshot || !current.customer_snapshot)) Object.assign(payload, await buildEstimateSnapshots(supabase, userId, companyId, {
    name: payload.billing_name as string | null,
    postalCode: payload.billing_postal_code as string | null,
    address: payload.billing_address as string | null
  }));
  const { error } = await supabase.from("estimates").update(payload).eq("id", id);
  if (error) throw new Error(error.message);
  const { error: deleteError } = await supabase.from("estimate_items").delete().eq("estimate_id", id);
  if (deleteError) throw new Error(deleteError.message);
  const { error: itemError } = await supabase.from("estimate_items").insert(items.map((x) => ({...x, user_id: userId, estimate_id: id})));
  if (itemError) throw new Error(itemError.message);
  invalidateEstimateMutation(projectId);
  redirect(`/estimates/${id}`);
}

export async function deleteEstimate(formData: FormData) {
  const id = required(formData, "id", "見積ID");
  if (demoMode) demoReturn(formData, "/estimates");
  const { supabase } = await authed();
  const { data } = await supabase.from("estimates").select("project_id").eq("id", id).maybeSingle();
  const { error } = await supabase.from("estimates").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateEstimateMutation(data?.project_id ?? null);
  redirect("/estimates");
}

function estimateProjectPricing(items: Array<{description:string;quantity:number;unit:string|null;unit_price:number;tax_rate:number;line_subtotal:number;tax_amount:number}>, total: number, accepted: boolean) {
  if (items.length === 1 && items[0].quantity > 1 && items[0].unit) {
    return {
      pricing_model: "unit",
      unit_label: items[0].unit,
      unit_price: items[0].unit_price,
      planned_units: items[0].quantity,
      completed_units: 0,
      expected_amount: null,
      order_amount: null
    };
  }
  return {
    pricing_model: "fixed",
    unit_label: "回",
    unit_price: null,
    planned_units: null,
    completed_units: null,
    expected_amount: total,
    order_amount: accepted ? total : null
  };
}

export async function acceptEstimateAndApplyProject(formData: FormData) {
  const id = required(formData, "id", "見積ID");
  if (demoMode) demoReturn(formData, `/estimates/${id}`);
  const { supabase, userId } = await authed();
  const { data: estimate, error } = await supabase.from("estimates").select("id,estimate_no,company_id,contact_id,project_id,title,total_amount,billing_name,billing_postal_code,billing_address,issuer_snapshot,customer_snapshot").eq("id", id).single();
  if (error) throw new Error(error.message);
  const { data: itemRows, error: itemError } = await supabase.from("estimate_items").select("description,quantity,unit,unit_price,tax_rate,line_subtotal,tax_amount").eq("estimate_id", id).order("sort_order");
  if (itemError) throw new Error(itemError.message);
  const pricing = estimateProjectPricing(itemRows ?? [], Number(estimate.total_amount ?? 0), true);
  let projectId = estimate.project_id as string | null;
  if (projectId) {
    const { error: updateError } = await supabase.from("projects").update({
      company_id: estimate.company_id,
      primary_contact_id: estimate.contact_id,
      status: "ordered",
      order_date: todayJstDate(),
      ...pricing
    }).eq("id", projectId);
    if (updateError) throw new Error(updateError.message);
  } else {
    const { data: created, error: createError } = await supabase.from("projects").insert({
      user_id: userId,
      company_id: estimate.company_id,
      primary_contact_id: estimate.contact_id,
      status: "ordered",
      priority: "medium",
      order_date: todayJstDate(),
      description: `見積 ${estimate.estimate_no || id} から案件化`,
      ...pricing
    }).select("id").single();
    if (createError) throw new Error(createError.message);
    projectId = created.id;
  }
  const estimateUpdate: Record<string, unknown> = { status: "accepted", accepted_date: todayJstDate(), project_id: projectId };
  if (!estimate.issuer_snapshot || !estimate.customer_snapshot) Object.assign(estimateUpdate, await buildEstimateSnapshots(supabase, userId, estimate.company_id, {
    name: estimate.billing_name,
    postalCode: estimate.billing_postal_code,
    address: estimate.billing_address
  }));
  const { error: estimateError } = await supabase.from("estimates").update(estimateUpdate).eq("id", id);
  if (estimateError) throw new Error(estimateError.message);
  invalidateEstimateMutation(projectId);
  revalidatePath("/projects");
  redirect(`/estimates/${id}?accepted=1`);
}

export async function createInvoiceFromEstimate(formData: FormData) {
  const id = required(formData, "id", "見積ID");
  if (demoMode) demoReturn(formData, `/estimates/${id}`);
  const { supabase, userId } = await authed();
  const { data: estimate, error } = await supabase.from("estimates").select("id,estimate_no,company_id,project_id,title,total_amount,billing_name,billing_postal_code,billing_address,memo,status").eq("id", id).single();
  if (error) throw new Error(error.message);
  if (!estimate.project_id) throw new Error("先に見積を案件へ反映してください。");
  if (estimate.status !== "accepted") throw new Error("採用済みの見積から請求予定を作成してください。");
  const { data: existingInvoice, error: existingError } = await supabase.from("project_invoices").select("id").eq("estimate_id", id).neq("status", "cancelled").limit(1).maybeSingle();
  if (existingError) throw new Error(existingError.message);
  if (existingInvoice) redirect(`/billing/${existingInvoice.id}/edit`);
  const { data: itemRows, error: itemError } = await supabase.from("estimate_items").select("tax_rate").eq("estimate_id", id);
  if (itemError) throw new Error(itemError.message);
  const rates = Array.from(new Set((itemRows ?? []).map((x:any) => Number(x.tax_rate ?? 0))));
  const taxRate = rates.length === 1 ? rates[0] : 0;
  const { data: created, error: invoiceError } = await supabase.from("project_invoices").insert({
    user_id: userId,
    project_id: estimate.project_id,
    company_id: estimate.company_id,
    estimate_id: id,
    title: `${estimate.title} 請求`,
    status: "planned",
    amount: Number(estimate.total_amount ?? 0),
    scheduled_invoice_date: todayJstDate(),
    line_description: estimate.title,
    tax_rate: taxRate,
    billing_name: estimate.billing_name,
    billing_postal_code: estimate.billing_postal_code,
    billing_address: estimate.billing_address,
    memo: `${estimate.estimate_no ? `見積 ${estimate.estimate_no}` : `見積 ${id}`} より引継ぎ${rates.length > 1 ? "（複数税率のため請求書税率は0%で作成。税内訳は見積書を参照）" : ""}${estimate.memo ? `\n${estimate.memo}` : ""}`
  }).select("id").single();
  if (invoiceError) throw new Error(invoiceError.message);
  invalidateBillingMutation(estimate.project_id);
  revalidatePath(`/estimates/${id}`);
  redirect(`/billing/${created.id}/edit`);
}
