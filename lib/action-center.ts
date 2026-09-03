import { createClient } from "@/lib/supabase/server";
import type { Priority, ProjectStatus, TaskStatus } from "@/lib/types";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export type ActionBucket = "today" | "week" | "watch";
export type ActionTone = "red" | "orange" | "blue" | "green" | "neutral";

export type ActionCandidate = {
  id: string;
  kind: "task" | "followup" | "project" | "schedule" | "gmail";
  bucket: ActionBucket;
  score: number;
  badge: string;
  tone: ActionTone;
  title: string;
  reason: string;
  companyName?: string;
  projectName?: string;
  projectId?: string;
  href: string;
  dueAt?: string;
};

export type ActionCenterSnapshot = {
  generatedAt: string;
  today: ActionCandidate[];
  week: ActionCandidate[];
  watch: ActionCandidate[];
  all: ActionCandidate[];
};

const DAY = 24 * 60 * 60 * 1000;

function priorityBonus(priority: Priority) {
  return priority === "high" ? 12 : priority === "medium" ? 6 : 0;
}

function daysUntil(value: string, now: number) {
  return Math.floor((new Date(value).getTime() - now) / DAY);
}

function daysSince(value: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(value).getTime()) / DAY));
}

function bucketFor(score: number): ActionBucket {
  if (score >= 80) return "today";
  if (score >= 60) return "week";
  return "watch";
}

function pushCandidate(list: ActionCandidate[], candidate: Omit<ActionCandidate, "bucket">) {
  list.push({ ...candidate, bucket: bucketFor(candidate.score) });
}

function sortActions(items: ActionCandidate[]) {
  return [...items].sort((a, b) => b.score - a.score || (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
}

export async function getActionCenterSnapshot(): Promise<ActionCenterSnapshot> {
  const now = Date.now();
  if (demoMode) {
    const all: ActionCandidate[] = [
      { id:"demo-1", kind:"task", bucket:"today", score:100, badge:"期限超過", tone:"red", title:"第2回支援資料を仕上げる", reason:"期限を過ぎています", companyName:"有限会社ロジステック", projectName:"DXコンシェルジュ支援", projectId:"logistech-dx", href:"/tasks" },
      { id:"demo-2", kind:"followup", bucket:"today", score:96, badge:"回答待ち", tone:"orange", title:"見積回答をフォロー", reason:"先方待ちが4日続いています", companyName:"△△事務所", href:"/tasks?filter=followup" },
      { id:"demo-3", kind:"schedule", bucket:"week", score:72, badge:"予定準備", tone:"blue", title:"第2回訪問の準備", reason:"3日以内に予定があります", companyName:"有限会社ロジステック", projectName:"DXコンシェルジュ支援", projectId:"logistech-dx", href:"/projects/logistech-dx" }
    ];
    return { generatedAt:new Date().toISOString(), today:all.filter((x)=>x.bucket==="today"), week:all.filter((x)=>x.bucket==="week"), watch:all.filter((x)=>x.bucket==="watch"), all };
  }

  const supabase = await createClient();
  const activeStatuses: ProjectStatus[] = ["consultation","hearing","preparing","proposed","considering","ordered","in_progress","on_hold"];
  const nowIso = new Date(now).toISOString();
  const weekEndIso = new Date(now + 7 * DAY).toISOString();
  const gmailCutoffIso = new Date(now - 7 * DAY).toISOString();
  const staleCutoffIso = new Date(now - 14 * DAY).toISOString();

  const [taskResult, projectResult, scheduleResult, activityResult, gmailResult] = await Promise.all([
    supabase.from("tasks")
      .select("id,title,status,priority,due_at,waiting_since,follow_up_at,project_id,projects(name,companies(name))")
      .neq("status", "completed")
      .limit(400),
    supabase.from("projects")
      .select("id,name,status,priority,next_action,next_action_due,due_date,created_at,updated_at,companies(name)")
      .eq("is_archived", false)
      .in("status", activeStatuses)
      .limit(250),
    supabase.from("schedules")
      .select("id,title,start_at,project_id,companies(name),projects(name)")
      .gte("start_at", nowIso)
      .lte("start_at", weekEndIso)
      .order("start_at", { ascending:true })
      .limit(120),
    supabase.from("activities")
      .select("project_id,activity_at")
      .not("project_id", "is", null)
      .gte("activity_at", staleCutoffIso)
      .limit(1500),
    supabase.from("gmail_messages")
      .select("id,project_id,subject,sent_at,gmail_url,is_outgoing,activity_id,task_id,projects(name,companies(name))")
      .eq("is_outgoing", false)
      .is("activity_id", null)
      .is("task_id", null)
      .gte("sent_at", gmailCutoffIso)
      .order("sent_at", { ascending:false })
      .limit(80)
  ]);

  for (const result of [taskResult, projectResult, scheduleResult, activityResult, gmailResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const actions: ActionCandidate[] = [];

  type TaskRow = {
    id:string; title:string; status:TaskStatus; priority:Priority; due_at:string|null; waiting_since:string|null; follow_up_at:string|null; project_id:string|null;
    projects:{name:string;companies:{name:string}|null}|null;
  };
  for (const task of (taskResult.data ?? []) as unknown as TaskRow[]) {
    const companyName = task.projects?.companies?.name ?? undefined;
    const projectName = task.projects?.name ?? undefined;
    const href = `/tasks/${task.id}/edit?return_to=${encodeURIComponent("/focus")}`;
    const bonus = priorityBonus(task.priority);

    if (task.status === "waiting" && task.waiting_since) {
      const waitingDays = daysSince(task.waiting_since, now);
      const followDue = task.follow_up_at ? new Date(task.follow_up_at).getTime() <= now : waitingDays >= 3;
      if (followDue) {
        pushCandidate(actions, {
          id:`follow-${task.id}`, kind:"followup", score:94 + Math.min(waitingDays, 10) + bonus,
          badge:"回答待ち", tone:"orange", title:task.title,
          reason:task.follow_up_at ? "設定したフォロー予定日時を過ぎています" : `先方待ちが${waitingDays}日続いています`,
          companyName, projectName, projectId:task.project_id ?? undefined, href, dueAt:task.follow_up_at ?? task.due_at ?? undefined
        });
        continue;
      }
    }

    if (task.due_at) {
      const days = daysUntil(task.due_at, now);
      if (days < 0) {
        pushCandidate(actions, { id:`task-${task.id}`, kind:"task", score:100 + Math.min(Math.abs(days), 10) + bonus, badge:"期限超過", tone:"red", title:task.title, reason:`期限を${Math.abs(days)}日過ぎています`, companyName, projectName, projectId:task.project_id ?? undefined, href, dueAt:task.due_at });
      } else if (days <= 1) {
        pushCandidate(actions, { id:`task-${task.id}`, kind:"task", score:88 + bonus, badge:"今日期限", tone:"red", title:task.title, reason:"今日〜24時間以内が期限です", companyName, projectName, projectId:task.project_id ?? undefined, href, dueAt:task.due_at });
      } else if (days <= 7) {
        pushCandidate(actions, { id:`task-${task.id}`, kind:"task", score:70 + bonus - days, badge:"今週期限", tone:"blue", title:task.title, reason:`${days}日以内に期限が来ます`, companyName, projectName, projectId:task.project_id ?? undefined, href, dueAt:task.due_at });
      }
    }
  }

  type ProjectRow = { id:string;name:string;status:ProjectStatus;priority:Priority;next_action:string|null;next_action_due:string|null;due_date:string|null;created_at:string;updated_at:string;companies:{name:string}|null };
  const activeRecently = new Set(((activityResult.data ?? []) as Array<{project_id:string|null}>).map((x)=>x.project_id).filter(Boolean));
  for (const project of (projectResult.data ?? []) as unknown as ProjectRow[]) {
    const companyName = project.companies?.name ?? undefined;
    const bonus = priorityBonus(project.priority);
    const href = `/projects/${project.id}`;

    if (project.next_action && project.next_action_due) {
      const days = daysUntil(project.next_action_due, now);
      if (days < 0) {
        pushCandidate(actions, { id:`next-${project.id}`, kind:"project", score:92 + Math.min(Math.abs(days), 8) + bonus, badge:"次回アクション超過", tone:"red", title:project.next_action, reason:`「${project.name}」の次回アクション期限を過ぎています`, companyName, projectName:project.name, projectId:project.id, href, dueAt:project.next_action_due });
      } else if (days <= 1) {
        pushCandidate(actions, { id:`next-${project.id}`, kind:"project", score:84 + bonus, badge:"次回アクション", tone:"blue", title:project.next_action, reason:`「${project.name}」で今日〜24時間以内に対応予定です`, companyName, projectName:project.name, projectId:project.id, href, dueAt:project.next_action_due });
      } else if (days <= 7) {
        pushCandidate(actions, { id:`next-${project.id}`, kind:"project", score:66 + bonus - days, badge:"今週アクション", tone:"blue", title:project.next_action, reason:`「${project.name}」の次回アクションが${days}日以内です`, companyName, projectName:project.name, projectId:project.id, href, dueAt:project.next_action_due });
      }
    } else if (!project.next_action && ["hearing","preparing","proposed","considering","ordered","in_progress"].includes(project.status)) {
      pushCandidate(actions, { id:`nonext-${project.id}`, kind:"project", score:48 + bonus, badge:"次回未設定", tone:"neutral", title:`${project.name}の次の一手を決める`, reason:"進行中ですが次回アクションが設定されていません", companyName, projectName:project.name, projectId:project.id, href });
    }

    if (project.due_date) {
      const due = new Date(`${project.due_date}T23:59:59+09:00`).toISOString();
      const days = daysUntil(due, now);
      if (days >= 0 && days <= 7) {
        pushCandidate(actions, { id:`due-${project.id}`, kind:"project", score:64 + bonus - days, badge:"納期接近", tone:"orange", title:`${project.name}の納期確認`, reason:`案件納期まで${days}日です`, companyName, projectName:project.name, projectId:project.id, href, dueAt:due });
      }
    }

    if (new Date(project.created_at).getTime() < new Date(staleCutoffIso).getTime() && !activeRecently.has(project.id)) {
      pushCandidate(actions, { id:`stale-${project.id}`, kind:"project", score:44 + bonus, badge:"14日活動なし", tone:"orange", title:`${project.name}の状況を確認`, reason:"14日以上、活動履歴が記録されていません", companyName, projectName:project.name, projectId:project.id, href });
    }
  }

  type ScheduleRow = { id:string;title:string;start_at:string;project_id:string|null;companies:{name:string}|null;projects:{name:string}|null };
  for (const schedule of (scheduleResult.data ?? []) as unknown as ScheduleRow[]) {
    const hours = (new Date(schedule.start_at).getTime() - now) / (60 * 60 * 1000);
    const score = hours <= 24 ? 83 : hours <= 72 ? 72 : 58;
    pushCandidate(actions, {
      id:`schedule-${schedule.id}`, kind:"schedule", score, badge:"予定準備", tone:"blue",
      title:`${schedule.title}の準備`, reason:hours <= 24 ? "24時間以内に予定があります" : hours <= 72 ? "3日以内に予定があります" : "今週の予定です",
      companyName:schedule.companies?.name ?? undefined, projectName:schedule.projects?.name ?? undefined, projectId:schedule.project_id ?? undefined,
      href:schedule.project_id ? `/projects/${schedule.project_id}?tab=schedule` : "/schedule", dueAt:schedule.start_at
    });
  }

  type GmailRow = { id:string;project_id:string;subject:string|null;sent_at:string|null;gmail_url:string;is_outgoing:boolean;activity_id:string|null;task_id:string|null;projects:{name:string;companies:{name:string}|null}|null };
  for (const mail of (gmailResult.data ?? []) as unknown as GmailRow[]) {
    if (!mail.sent_at) continue;
    const age = daysSince(mail.sent_at, now);
    const score = age <= 1 ? 82 : age <= 3 ? 74 : 62;
    pushCandidate(actions, {
      id:`mail-${mail.id}`, kind:"gmail", score, badge:"未処理メール", tone:"green", title:mail.subject || "(件名なし)",
      reason:age === 0 ? "今日届いた関連メールが未処理です" : `${age}日前の関連メールが活動・タスク化されていません`,
      companyName:mail.projects?.companies?.name ?? undefined, projectName:mail.projects?.name ?? undefined, projectId:mail.project_id,
      href:`/projects/${mail.project_id}?tab=activities`
    });
  }

  const deduped = new Map<string, ActionCandidate>();
  for (const item of sortActions(actions)) {
    // 同じ案件で「次回未設定」と「14日活動なし」が重なった場合は、より高い方を優先する。
    const key = item.kind === "project" && item.projectId && (item.id.startsWith("nonext-") || item.id.startsWith("stale-")) ? `project-watch-${item.projectId}` : item.id;
    if (!deduped.has(key)) deduped.set(key, item);
  }
  const all = sortActions([...deduped.values()]);
  return {
    generatedAt:new Date().toISOString(),
    today:all.filter((x)=>x.bucket === "today"),
    week:all.filter((x)=>x.bucket === "week"),
    watch:all.filter((x)=>x.bucket === "watch"),
    all
  };
}
