"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

function invalidateProject(projectId?: string | null) {
  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/tasks");
  revalidatePath("/schedule");
  revalidatePath("/companies");
  if (projectId) revalidatePath(`/projects/${projectId}`);
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
  const { data, error } = await supabase.from("projects").insert({
    user_id: userId,
    company_id: required(formData, "company_id", "取引先"),
    primary_contact_id: optional(formData, "primary_contact_id"),
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
    expected_amount: numberOrNull(formData, "expected_amount"),
    order_amount: numberOrNull(formData, "order_amount"),
    next_action: optional(formData, "next_action"),
    next_action_due: jstDateTimeOrNull(formData, "next_action_due"),
    memo: optional(formData, "memo")
  }).select("id").single();
  if (error) throw new Error(error.message);
  invalidateProject(data.id);
  redirect(`/projects/${data.id}`);
}

export async function updateProject(formData: FormData) {
  const id = required(formData, "id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${id}`);
  const { supabase } = await authed();
  const status = text(formData, "status") || "consultation";
  const { error } = await supabase.from("projects").update({
    company_id: required(formData, "company_id", "取引先"),
    primary_contact_id: optional(formData, "primary_contact_id"),
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
    expected_amount: numberOrNull(formData, "expected_amount"),
    order_amount: numberOrNull(formData, "order_amount"),
    next_action: optional(formData, "next_action"),
    next_action_due: jstDateTimeOrNull(formData, "next_action_due"),
    memo: optional(formData, "memo")
  }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProject(id);
  redirect(`/projects/${id}`);
}

export async function archiveProject(formData: FormData) {
  const id = required(formData, "id", "案件ID");
  if (demoMode) demoReturn(formData, "/projects");
  const { supabase } = await authed();
  const { error } = await supabase.from("projects").update({ is_archived: true }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProject(id);
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
  invalidateProject(projectId);
  redirect(`/projects/${projectId}#links`);
}

export async function deleteProjectLink(formData: FormData) {
  const id = required(formData, "id", "リンクID");
  const projectId = required(formData, "project_id", "案件ID");
  if (demoMode) demoReturn(formData, `/projects/${projectId}`);
  const { supabase } = await authed();
  const { error } = await supabase.from("project_links").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProject(projectId);
  redirect(`/projects/${projectId}#links`);
}

export async function createTask(formData: FormData) {
  const projectId = optional(formData, "project_id");
  const companyId = optional(formData, "company_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/tasks");
  const { supabase, userId } = await authed();
  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    company_id: companyId,
    project_id: projectId,
    title: required(formData, "title", "タスク名"),
    description: optional(formData, "description"),
    status: text(formData, "status") || "todo",
    priority: text(formData, "priority") || "medium",
    start_date: optional(formData, "start_date"),
    due_at: jstDateTimeOrNull(formData, "due_at"),
    memo: optional(formData, "memo")
  });
  if (error) throw new Error(error.message);
  invalidateProject(projectId);
  redirect(projectId ? `/projects/${projectId}#tasks` : "/tasks");
}

export async function setTaskStatus(formData: FormData) {
  const id = required(formData, "id", "タスクID");
  const status = required(formData, "status", "ステータス");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/tasks");
  const { supabase } = await authed();
  const { error } = await supabase.from("tasks").update({
    status,
    completed_at: status === "completed" ? new Date().toISOString() : null
  }).eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProject(projectId);
  redirect(projectId ? `/projects/${projectId}#tasks` : "/tasks");
}

export async function deleteTask(formData: FormData) {
  const id = required(formData, "id", "タスクID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/tasks");
  const { supabase } = await authed();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProject(projectId);
  redirect(projectId ? `/projects/${projectId}#tasks` : "/tasks");
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

  invalidateProject(projectId);
  redirect(projectId ? `/projects/${projectId}#activities` : "/dashboard");
}

export async function deleteActivity(formData: FormData) {
  const id = required(formData, "id", "活動ID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/dashboard");
  const { supabase } = await authed();
  const { error } = await supabase.from("activities").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProject(projectId);
  redirect(projectId ? `/projects/${projectId}#activities` : "/dashboard");
}

export async function createSchedule(formData: FormData) {
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/schedule");
  const { supabase, userId } = await authed();
  const { error } = await supabase.from("schedules").insert({
    user_id: userId,
    company_id: optional(formData, "company_id"),
    project_id: projectId,
    title: required(formData, "title", "件名"),
    schedule_type: text(formData, "schedule_type") || "other",
    start_at: jstDateTimeOrNull(formData, "start_at") ?? (() => { throw new Error("開始日時は必須です。"); })(),
    end_at: jstDateTimeOrNull(formData, "end_at"),
    all_day: checkbox(formData, "all_day"),
    location: optional(formData, "location"),
    description: optional(formData, "description")
  });
  if (error) throw new Error(error.message);
  invalidateProject(projectId);
  redirect(projectId ? `/projects/${projectId}#schedule` : "/schedule");
}

export async function deleteSchedule(formData: FormData) {
  const id = required(formData, "id", "予定ID");
  const projectId = optional(formData, "project_id");
  if (demoMode) demoReturn(formData, projectId ? `/projects/${projectId}` : "/schedule");
  const { supabase } = await authed();
  const { error } = await supabase.from("schedules").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateProject(projectId);
  redirect(projectId ? `/projects/${projectId}#schedule` : "/schedule");
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
