import { createClient } from "@/lib/supabase/server";
import { companies as demoCompanies, projects as demoProjects, schedules as demoSchedules, tasks as demoTasks } from "@/lib/mock-data";
import type { Activity, ActivityDetail, Company, CompanyDetail, ContactDetail, FormOptions, Project, ProjectHeader, ProjectLink, ProjectLinkDetail, ProjectDriveSummary, ProjectGmailSummary, GmailMessageItem, ScheduleDetail, Task, TaskDetail, SalesPipelineSnapshot } from "@/lib/types";
import { getActionPreferences } from "@/lib/preferences";

const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const PROJECT_BASE_SELECT = `
  id,name,company_id,primary_contact_id,category_id,status,priority,inquiry_date,proposal_date,order_date,start_date,due_date,completed_date,expected_amount,order_amount,win_probability,expected_close_date,next_action,next_action_due,description,memo,
  companies(name),
  contacts:primary_contact_id(name),
  project_categories(name)
`;

type RawProject = {
  id: string;
  name: string;
  status: Project["status"];
  priority: Project["priority"];
  start_date: string | null;
  due_date: string | null;
  next_action: string | null;
  next_action_due: string | null;
  inquiry_date: string | null;
  proposal_date: string | null;
  order_date: string | null;
  completed_date: string | null;
  expected_amount: number | null;
  order_amount: number | null;
  win_probability: number | null;
  expected_close_date: string | null;
  memo: string | null;
  description: string | null;
  company_id: string;
  primary_contact_id: string | null;
  category_id: string | null;
  companies: { name: string } | null;
  contacts: { name: string } | null;
  project_categories: { name: string } | null;
};

function mapProject(row: RawProject): Project {
  return {
    id: row.id,
    name: row.name,
    companyId: row.company_id,
    companyName: row.companies?.name ?? "取引先未設定",
    contactId: row.primary_contact_id ?? undefined,
    contactName: row.contacts?.name ?? undefined,
    categoryId: row.category_id ?? undefined,
    category: row.project_categories?.name ?? "その他",
    status: row.status,
    priority: row.priority,
    inquiryDate: row.inquiry_date ?? undefined,
    proposalDate: row.proposal_date ?? undefined,
    orderDate: row.order_date ?? undefined,
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    completedDate: row.completed_date ?? undefined,
    expectedAmount: row.expected_amount ?? undefined,
    orderAmount: row.order_amount ?? undefined,
    winProbability: row.win_probability ?? undefined,
    expectedCloseDate: row.expected_close_date ?? undefined,
    nextAction: row.next_action ?? undefined,
    nextActionDue: row.next_action_due
      ? new Date(row.next_action_due).toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 16).replace(" ", "T")
      : undefined,
    description: row.description ?? "",
    memo: row.memo ?? undefined,
    links: [],
    activities: [],
    tasks: []
  };
}


function toJstDateTimeLocal(value: string | null | undefined) {
  if (!value) return undefined;
  return new Date(value).toLocaleString("sv-SE", { timeZone: "Asia/Tokyo" }).slice(0, 16).replace(" ", "T");
}

export async function getProjects(): Promise<Project[]> {
  if (demoMode) return demoProjects;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_BASE_SELECT)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as RawProject[]).map(mapProject);
}

/**
 * 編集画面向け。活動・タスク・リンク・予定を取らず、案件本体だけを取得する。
 */
export async function getProjectOptions(): Promise<Array<{ id: string; name: string; companyId: string; companyName: string }>> {
  if (demoMode) return demoProjects.map((p) => ({ id: p.id, name: p.name, companyId: p.companyId ?? "", companyName: p.companyName }));

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,company_id,companies(name)")
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);

  type Row = { id: string; name: string; company_id: string; companies: { name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((p) => ({
    id: p.id, name: p.name, companyId: p.company_id, companyName: p.companies?.name ?? "取引先未設定"
  }));
}

export async function getProjectDriveSummary(projectId: string, limit = 12): Promise<ProjectDriveSummary> {
  if (demoMode) return { folders: [], files: [] };

  const supabase = await createClient();
  const [folderResult, fileResult] = await Promise.all([
    supabase
      .from("project_drive_folders")
      .select("id,project_id,google_folder_id,name,url,last_sync_at,last_sync_error")
      .eq("project_id", projectId)
      .order("created_at", { ascending: true }),
    supabase
      .from("files")
      .select("id,drive_folder_id,name,url,file_type,mime_type,relative_path,external_modified_at,is_folder")
      .eq("project_id", projectId)
      .eq("source", "google_drive")
      .eq("is_folder", false)
      .order("external_modified_at", { ascending: false, nullsFirst: false })
      .limit(limit)
  ]);

  // migration前でも案件詳細画面自体は壊さない。
  if (folderResult.error && ["42P01", "PGRST205"].includes(folderResult.error.code ?? "")) return { folders: [], files: [] };
  if (folderResult.error) throw new Error(folderResult.error.message);
  if (fileResult.error && ["42703", "PGRST204"].includes(fileResult.error.code ?? "")) return { folders: [], files: [] };
  if (fileResult.error) throw new Error(fileResult.error.message);

  return {
    folders: (folderResult.data ?? []).map((x) => ({
      id: x.id,
      projectId: x.project_id,
      googleFolderId: x.google_folder_id,
      name: x.name,
      url: x.url,
      lastSyncAt: x.last_sync_at ?? undefined,
      lastSyncError: x.last_sync_error ?? undefined
    })),
    files: (fileResult.data ?? []).map((x) => ({
      id: x.id,
      driveFolderId: x.drive_folder_id,
      name: x.name,
      url: x.url,
      fileType: x.file_type ?? undefined,
      mimeType: x.mime_type ?? undefined,
      relativePath: x.relative_path ?? undefined,
      modifiedAt: x.external_modified_at ?? undefined,
      isFolder: Boolean(x.is_folder)
    }))
  };
}

export async function getProjectBase(id: string): Promise<Project | null> {
  if (demoMode) return demoProjects.find((p) => p.id === id) ?? null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_BASE_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return mapProject(data as unknown as RawProject);
}

/**
 * タスク・活動・URL・予定の追加画面向け。必要最小限の3項目だけ取得する。
 */
export async function getProjectHeader(id: string): Promise<ProjectHeader | null> {
  if (demoMode) {
    const project = demoProjects.find((p) => p.id === id);
    if (!project) return null;
    return { id: project.id, name: project.name, companyId: project.companyId ?? "", companyName: project.companyName };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id,name,company_id,companies(name)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }

  const row = data as unknown as { id: string; name: string; company_id: string; companies: { name: string } | null };
  return { id: row.id, name: row.name, companyId: row.company_id, companyName: row.companies?.name ?? "取引先未設定" };
}

/**
 * 案件詳細。案件本体を先に待たず、関連5クエリを同時に開始して往復待ちを減らす。
 */
export async function getProject(id: string): Promise<Project | null> {
  if (demoMode) return demoProjects.find((p) => p.id === id) ?? null;

  const [supabase, prefs] = await Promise.all([createClient(), getActionPreferences()]);
  const now = new Date().toISOString();

  const [baseResult, linksResult, activitiesResult, tasksResult, schedulesResult] = await Promise.all([
    supabase.from("projects").select(PROJECT_BASE_SELECT).eq("id", id).single(),
    supabase.from("project_links").select("id,name,url,link_type,is_pinned,pin_order").eq("project_id", id).order("sort_order"),
    supabase.from("activities").select("id,activity_at,activity_type,title,content").eq("project_id", id).order("activity_at", { ascending: false }).limit(50),
    supabase.from("tasks").select("id,title,status,priority,due_at,waiting_since,follow_up_at").eq("project_id", id).order("due_at", { ascending: true, nullsFirst: false }),
    supabase.from("schedules").select("start_at,title").eq("project_id", id).gte("start_at", now).order("start_at", { ascending: true }).limit(1)
  ]);

  if (baseResult.error) {
    if (baseResult.error.code === "PGRST116") return null;
    throw new Error(baseResult.error.message);
  }
  if (linksResult.error) throw new Error(linksResult.error.message);
  if (activitiesResult.error) throw new Error(activitiesResult.error.message);
  if (tasksResult.error) throw new Error(tasksResult.error.message);
  if (schedulesResult.error) throw new Error(schedulesResult.error.message);

  const project = mapProject(baseResult.data as unknown as RawProject);

  project.links = ((linksResult.data ?? []) as Array<{id:string;name:string;url:string;link_type:string;is_pinned:boolean;pin_order:number|null}>).map((l): ProjectLink => ({
    id: l.id, name: l.name, url: l.url, linkType: l.link_type, pinned: l.is_pinned, pinOrder: l.pin_order ?? undefined
  }));

  project.activities = ((activitiesResult.data ?? []) as Array<{id:string;activity_at:string;activity_type:string;title:string|null;content:string}>).map((a): Activity => ({
    id: a.id,
    date: new Date(a.activity_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }),
    type: a.activity_type,
    title: a.title ?? "活動記録",
    content: a.content
  }));

  const taskNow = Date.now();
  project.tasks = ((tasksResult.data ?? []) as Array<{id:string;title:string;status:Task["status"];priority:Task["priority"];due_at:string|null;waiting_since:string|null;follow_up_at:string|null}>).map((t): Task => {
    const waitingSinceMs = t.waiting_since ? new Date(t.waiting_since).getTime() : null;
    const waitingDays = waitingSinceMs ? Math.max(0, Math.floor((taskNow - waitingSinceMs) / (24 * 60 * 60 * 1000))) : undefined;
    const followUpCandidate = t.status === "waiting" && (
      (t.follow_up_at ? new Date(t.follow_up_at).getTime() <= taskNow : false) ||
      (!t.follow_up_at && waitingSinceMs !== null && taskNow - waitingSinceMs >= prefs.waitingFollowupDays * 24 * 60 * 60 * 1000)
    );
    return {
      id: t.id, title: t.title, projectId: project.id, projectName: project.name, companyName: project.companyName,
      status: t.status, priority: t.priority,
      due: t.due_at ? new Date(t.due_at).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" }) : "—",
      dueAt: t.due_at ?? undefined, waitingSince: t.waiting_since ?? undefined, followUpAt: t.follow_up_at ?? undefined,
      waitingDays, followUpCandidate
    };
  });

  const nextSchedule = (schedulesResult.data ?? [])[0] as {start_at:string;title:string} | undefined;
  if (nextSchedule) {
    project.nextSchedule = `${new Date(nextSchedule.start_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}　${nextSchedule.title}`;
  }

  return project;
}

export async function getTaskDetail(id: string): Promise<TaskDetail | null> {
  if (demoMode) {
    const task = demoTasks.find((t) => t.id === id);
    if (!task) return null;
    return { id: task.id, title: task.title, projectId: task.projectId, status: task.status, priority: task.priority };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,description,memo,project_id,company_id,status,priority,start_date,due_at,waiting_since,follow_up_at")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return {
    id: data.id,
    title: data.title,
    description: data.description ?? undefined,
    memo: data.memo ?? undefined,
    projectId: data.project_id ?? undefined,
    companyId: data.company_id ?? undefined,
    status: data.status,
    priority: data.priority,
    startDate: data.start_date ?? undefined,
    dueAt: toJstDateTimeLocal(data.due_at),
    waitingSince: toJstDateTimeLocal(data.waiting_since),
    followUpAt: toJstDateTimeLocal(data.follow_up_at)
  } as TaskDetail;
}

export async function getProjectLinkDetail(id: string): Promise<ProjectLinkDetail | null> {
  if (demoMode) {
    for (const project of demoProjects) {
      const link = project.links.find((x) => x.id === id);
      if (link) return { ...link, projectId: project.id };
    }
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_links")
    .select("id,project_id,name,url,link_type,memo,is_pinned,pin_order")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return {
    id: data.id, projectId: data.project_id, name: data.name, url: data.url, linkType: data.link_type,
    memo: data.memo ?? undefined, pinned: data.is_pinned, pinOrder: data.pin_order ?? undefined
  };
}

export async function getActivityDetail(id: string): Promise<ActivityDetail | null> {
  if (demoMode) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("activities")
    .select("id,company_id,project_id,contact_id,activity_type,activity_at,title,content,next_action")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return {
    id: data.id, companyId: data.company_id, projectId: data.project_id ?? undefined, contactId: data.contact_id ?? undefined,
    activityType: data.activity_type, activityAt: toJstDateTimeLocal(data.activity_at) ?? "", title: data.title ?? undefined,
    content: data.content, nextAction: data.next_action ?? undefined
  };
}

export async function getScheduleDetail(id: string): Promise<ScheduleDetail | null> {
  if (demoMode) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("id,company_id,project_id,title,schedule_type,start_at,end_at,all_day,location,description,google_event_id,google_sync_status,google_sync_error,google_html_link")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return {
    id: data.id, companyId: data.company_id ?? undefined, projectId: data.project_id ?? undefined, title: data.title,
    scheduleType: data.schedule_type, startAt: toJstDateTimeLocal(data.start_at) ?? "", endAt: toJstDateTimeLocal(data.end_at),
    allDay: data.all_day, location: data.location ?? undefined, description: data.description ?? undefined,
    googleEventId: data.google_event_id ?? undefined,
    googleSyncStatus: data.google_sync_status ?? "not_synced",
    googleSyncError: data.google_sync_error ?? undefined,
    googleHtmlLink: data.google_html_link ?? undefined
  };
}

export async function getTasks(): Promise<Task[]> {
  if (demoMode) return demoTasks;
  const [supabase, prefs] = await Promise.all([createClient(), getActionPreferences()]);
  const { data, error } = await supabase
    .from("tasks")
    .select("id,title,status,priority,due_at,waiting_since,follow_up_at,project_id,projects(name,companies(name))")
    .order("due_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);

  type RawTask = {
    id:string; title:string; status:Task["status"]; priority:Task["priority"]; due_at:string|null; waiting_since:string|null; follow_up_at:string|null; project_id:string|null;
    projects:{name:string;companies:{name:string}|null}|null
  };
  const now = Date.now();
  const followupMs = prefs.waitingFollowupDays * 24 * 60 * 60 * 1000;
  return ((data ?? []) as unknown as RawTask[]).map((t) => {
    const waitingSinceMs = t.waiting_since ? new Date(t.waiting_since).getTime() : null;
    const waitingDays = waitingSinceMs ? Math.max(0, Math.floor((now - waitingSinceMs) / (24 * 60 * 60 * 1000))) : undefined;
    const followUpCandidate = t.status === "waiting" && (
      (t.follow_up_at ? new Date(t.follow_up_at).getTime() <= now : false) ||
      (!t.follow_up_at && waitingSinceMs !== null && now - waitingSinceMs >= followupMs)
    );
    return {
      id:t.id, title:t.title, status:t.status, priority:t.priority,
      due:t.due_at ? new Date(t.due_at).toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"}) : "—",
      dueAt:t.due_at ?? undefined,
      waitingSince:t.waiting_since ?? undefined,
      followUpAt:t.follow_up_at ?? undefined,
      waitingDays, followUpCandidate,
      projectId:t.project_id ?? undefined,
      projectName:t.projects?.name, companyName:t.projects?.companies?.name
    };
  });
}

export async function getCompanies(): Promise<Company[]> {
  if (demoMode) return demoCompanies;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,industry,activities(activity_at),projects(id,status)")
    .eq("is_archived", false)
    .order("name");
  if (error) throw new Error(error.message);

  type RawCompany = {
    id:string; name:string; industry:string|null;
    activities:Array<{activity_at:string}>;
    projects:Array<{id:string;status:string}>
  };
  return ((data ?? []) as unknown as RawCompany[]).map((c) => ({
    id:c.id,
    name:c.name,
    industry:c.industry ?? "—",
    activeProjects:c.projects.filter((p) => !["completed","lost"].includes(p.status)).length,
    lastContact:c.activities.length
      ? c.activities.reduce((latest, a) => a.activity_at > latest ? a.activity_at : latest, c.activities[0].activity_at).slice(0,10)
      : "—"
  }));
}

export async function getSchedules() {
  if (demoMode) return demoSchedules;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("schedules")
    .select("id,start_at,end_at,title,project_id,all_day,location,description,google_event_id,google_sync_status,google_sync_error,google_html_link,companies(name)")
    .order("start_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);

  type RawSchedule = {id:string;start_at:string;end_at:string|null;title:string;project_id:string|null;all_day:boolean;location:string|null;description:string|null;google_event_id:string|null;google_sync_status:string;google_sync_error:string|null;google_html_link:string|null;companies:{name:string}|null};
  return ((data ?? []) as unknown as RawSchedule[]).map((s) => {
    const start = new Date(s.start_at);
    const end = s.end_at ? new Date(s.end_at) : null;
    const time = s.all_day ? "終日" : start.toLocaleTimeString("ja-JP",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit"})
      + (end ? `–${end.toLocaleTimeString("ja-JP",{timeZone:"Asia/Tokyo",hour:"2-digit",minute:"2-digit"})}` : "");
    return {
      id:s.id,
      date:start.toLocaleDateString("ja-JP",{timeZone:"Asia/Tokyo"}),
      time,
      title:s.title,
      company:s.companies?.name ?? "—",
      projectId:s.project_id ?? "",
      startAt:s.start_at,
      endAt:s.end_at,
      allDay:s.all_day,
      location:s.location ?? "",
      description:s.description ?? "",
      googleEventId:s.google_event_id ?? "",
      googleSyncStatus:s.google_sync_status ?? "not_synced",
      googleSyncError:s.google_sync_error ?? "",
      googleHtmlLink:s.google_html_link ?? ""
    };
  });
}

export async function getGoogleCalendarConnectionStatus() {
  if (demoMode) return { connected: false };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("google_email,connected_at,last_sync_at,last_sync_error")
    .maybeSingle();
  if (error) {
    // Ver.1.4 migration前でも設定画面自体は表示できるようにする。
    if (error.code === "42P01" || error.code === "PGRST205") return { connected: false };
    throw new Error(error.message);
  }
  if (!data) return { connected: false };
  return {
    connected: true,
    googleEmail: data.google_email ?? undefined,
    connectedAt: data.connected_at ?? undefined,
    lastSyncAt: data.last_sync_at ?? undefined,
    lastSyncError: data.last_sync_error ?? undefined
  };
}

export async function getFormOptions(): Promise<FormOptions> {
  if (demoMode) {
    return {
      companies: demoCompanies.map((c) => ({ id: c.id, name: c.name })),
      contacts: [
        { id: "contact-logistech", companyId: "c1", name: "祝 俊輔" },
        { id: "contact-sample", companyId: "c2", name: "佐藤 太郎" }
      ],
      categories: [
        { id: "cat-dx", name: "DX支援" },
        { id: "cat-it", name: "ITコンサルティング" },
        { id: "cat-web", name: "Webサイト制作" },
        { id: "cat-other", name: "その他" }
      ]
    };
  }
  const supabase = await createClient();
  const [{ data: companies, error: companyError }, { data: contacts, error: contactError }, { data: categories, error: categoryError }] = await Promise.all([
    supabase.from("companies").select("id,name").eq("is_archived", false).order("name"),
    supabase.from("contacts").select("id,company_id,name").order("name"),
    supabase.from("project_categories").select("id,name").eq("is_active", true).order("sort_order").order("name")
  ]);
  if (companyError) throw new Error(companyError.message);
  if (contactError) throw new Error(contactError.message);
  if (categoryError) throw new Error(categoryError.message);
  return {
    companies: (companies ?? []).map((x) => ({ id: x.id, name: x.name })),
    contacts: (contacts ?? []).map((x) => ({ id: x.id, companyId: x.company_id, name: x.name })),
    categories: (categories ?? []).map((x) => ({ id: x.id, name: x.name }))
  };
}

/** 取引先編集画面向け。担当者・案件一覧を取らない。 */
export async function getCompanyBase(id: string): Promise<CompanyDetail | null> {
  if (demoMode) {
    const base = demoCompanies.find((x) => x.id === id);
    if (!base) return null;
    return { id: base.id, name: base.name, industry: base.industry, contacts: [], projects: [] };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,company_type,industry,postal_code,address,phone,email,website_url,memo")
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  const c = data as { id:string; name:string; company_type:string|null; industry:string|null; postal_code:string|null; address:string|null; phone:string|null; email:string|null; website_url:string|null; memo:string|null };
  return {
    id:c.id, name:c.name, companyType:c.company_type ?? undefined, industry:c.industry ?? undefined,
    postalCode:c.postal_code ?? undefined, address:c.address ?? undefined, phone:c.phone ?? undefined,
    email:c.email ?? undefined, websiteUrl:c.website_url ?? undefined, memo:c.memo ?? undefined,
    contacts: [], projects: []
  };
}

export async function getContactDetail(id: string, companyId?: string): Promise<ContactDetail | null> {
  if (demoMode) {
    if (id === "contact-logistech") return { id, companyId: "c1", companyName: "有限会社ロジステック", name: "祝 俊輔", position: "代表取締役" };
    return null;
  }
  const supabase = await createClient();
  let query = supabase
    .from("contacts")
    .select("id,company_id,name,department,position,email,phone,mobile,memo,companies(name)")
    .eq("id", id);
  if (companyId) query = query.eq("company_id", companyId);
  const { data, error } = await query.single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  const row = data as unknown as {
    id:string; company_id:string; name:string; department:string|null; position:string|null; email:string|null; phone:string|null; mobile:string|null; memo:string|null; companies:{name:string}|null;
  };
  return {
    id: row.id, companyId: row.company_id, companyName: row.companies?.name ?? "取引先", name: row.name,
    department: row.department ?? undefined, position: row.position ?? undefined, email: row.email ?? undefined,
    phone: row.phone ?? undefined, mobile: row.mobile ?? undefined, memo: row.memo ?? undefined
  };
}

export async function getCompany(id: string): Promise<CompanyDetail | null> {
  if (demoMode) {
    const base = demoCompanies.find((x) => x.id === id);
    if (!base) return null;
    return {
      id: base.id,
      name: base.name,
      industry: base.industry,
      contacts: base.id === "c1" ? [{ id: "contact-logistech", name: "祝 俊輔", position: "代表取締役" }] : [],
      projects: demoProjects.filter((p) => p.companyName === base.name).map((p) => ({ id: p.id, name: p.name, status: p.status, nextAction: p.nextAction }))
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("companies")
    .select(`
      id,name,company_type,industry,postal_code,address,phone,email,website_url,memo,
      contacts(id,name,department,position,email,phone),
      projects(id,name,status,next_action,is_archived)
    `)
    .eq("id", id)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  type Row = {
    id:string; name:string; company_type:string|null; industry:string|null; postal_code:string|null; address:string|null; phone:string|null; email:string|null; website_url:string|null; memo:string|null;
    contacts:Array<{id:string;name:string;department:string|null;position:string|null;email:string|null;phone:string|null}>;
    projects:Array<{id:string;name:string;status:Project["status"];next_action:string|null;is_archived:boolean}>;
  };
  const c = data as unknown as Row;
  return {
    id:c.id, name:c.name, companyType:c.company_type ?? undefined, industry:c.industry ?? undefined,
    postalCode:c.postal_code ?? undefined, address:c.address ?? undefined, phone:c.phone ?? undefined,
    email:c.email ?? undefined, websiteUrl:c.website_url ?? undefined, memo:c.memo ?? undefined,
    contacts:c.contacts.map((x) => ({ id:x.id, name:x.name, department:x.department ?? undefined, position:x.position ?? undefined, email:x.email ?? undefined, phone:x.phone ?? undefined })),
    projects:c.projects.filter((x) => !x.is_archived).map((x) => ({ id:x.id, name:x.name, status:x.status, nextAction:x.next_action ?? undefined }))
  };
}

/** Ver.1.6 ダッシュボード専用。必要な列・件数だけをまとめて取得する。 */
export async function getDashboardSnapshot() {
  if (demoMode) {
    const today = new Date().toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" });
    return {
      activeProjectCount: demoProjects.filter((p) => !["completed", "lost"].includes(p.status)).length,
      unfinishedTaskCount: demoTasks.filter((t) => t.status !== "completed").length,
      todayScheduleCount: demoSchedules.filter((s) => s.date === today).length,
      overdueTaskCount: 0,
      waitingFollowupCount: demoTasks.filter((t) => t.status === "waiting").length,
      todaySchedules: demoSchedules.filter((s) => s.date === today).slice(0, 6),
      upcomingSchedules: demoSchedules.slice(0, 8),
      overdueTasks: [],
      waitingFollowupTasks: demoTasks.filter((t) => t.status === "waiting").map((t) => ({ ...t, waitingDays: 4, dueAt: undefined })),
      staleProjects: [],
      noNextProjects: demoProjects.filter((p) => !["completed", "lost"].includes(p.status) && !p.nextAction).slice(0, 4),
      recentProjects: demoProjects.slice(0, 8),
      recentDriveFiles: [] as Array<{ id: string; name: string; url: string; fileType?: string; modifiedAt?: string; projectId?: string; projectName?: string; companyName?: string }>
    };
  }

  const [supabase, prefs] = await Promise.all([createClient(), getActionPreferences()]);
  const now = Date.now();
  const jstNow = new Date(now + 9 * 60 * 60 * 1000);
  const date = jstNow.toISOString().slice(0, 10);
  const todayStart = new Date(`${date}T00:00:00+09:00`).toISOString();
  const tomorrowStart = new Date(new Date(`${date}T00:00:00+09:00`).getTime() + 24 * 60 * 60 * 1000).toISOString();
  const staleCutoff = new Date(now - prefs.staleProjectDays * 24 * 60 * 60 * 1000).toISOString();
  const activeStatuses: Project["status"][] = ["consultation", "hearing", "preparing", "proposed", "considering", "ordered", "in_progress", "on_hold"];

  const [scheduleResult, taskResult, projectResult, activityResult, driveResult] = await Promise.all([
    supabase
      .from("schedules")
      .select("id,start_at,end_at,title,project_id,all_day,location,description,google_sync_status,google_html_link,companies(name)")
      .gte("start_at", todayStart)
      .order("start_at", { ascending: true })
      .limit(40),
    supabase
      .from("tasks")
      .select("id,title,status,priority,due_at,waiting_since,follow_up_at,project_id,projects(name,companies(name))")
      .neq("status", "completed")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(300),
    supabase
      .from("projects")
      .select("id,name,status,priority,next_action,next_action_due,created_at,updated_at,company_id,companies(name),project_categories(name)")
      .eq("is_archived", false)
      .in("status", activeStatuses)
      .order("updated_at", { ascending: false })
      .limit(200),
    supabase
      .from("activities")
      .select("project_id,activity_at")
      .not("project_id", "is", null)
      .gte("activity_at", staleCutoff)
      .limit(1000),
    supabase
      .from("files")
      .select("id,name,url,file_type,relative_path,external_modified_at,project_id,projects(name,companies(name))")
      .eq("source", "google_drive")
      .eq("is_folder", false)
      .order("external_modified_at", { ascending: false, nullsFirst: false })
      .limit(8)
  ]);

  for (const result of [scheduleResult, taskResult, projectResult, activityResult, driveResult]) {
    if (result.error) {
      // Drive migration前だけは最近ファイルを空扱いにする。
      if (result === driveResult && ["42703", "PGRST204"].includes(result.error.code ?? "")) continue;
      throw new Error(result.error.message);
    }
  }

  type S = { id:string;start_at:string;end_at:string|null;title:string;project_id:string|null;all_day:boolean;location:string|null;description:string|null;google_sync_status:string;google_html_link:string|null;companies:{name:string}|null };
  const schedules = ((scheduleResult.data ?? []) as unknown as S[]).map((s) => {
    const start = new Date(s.start_at);
    const end = s.end_at ? new Date(s.end_at) : null;
    return {
      id:s.id,
      date:start.toLocaleDateString("ja-JP", { timeZone:"Asia/Tokyo" }),
      time:s.all_day ? "終日" : start.toLocaleTimeString("ja-JP", { timeZone:"Asia/Tokyo", hour:"2-digit", minute:"2-digit" }) + (end ? `–${end.toLocaleTimeString("ja-JP", { timeZone:"Asia/Tokyo", hour:"2-digit", minute:"2-digit" })}` : ""),
      title:s.title,
      company:s.companies?.name ?? "—",
      projectId:s.project_id ?? "",
      startAt:s.start_at,
      googleSyncStatus:s.google_sync_status ?? "not_synced",
      googleHtmlLink:s.google_html_link ?? ""
    };
  });

  type T = { id:string;title:string;status:Task["status"];priority:Task["priority"];due_at:string|null;waiting_since:string|null;follow_up_at:string|null;project_id:string|null;projects:{name:string;companies:{name:string}|null}|null };
  const tasks = ((taskResult.data ?? []) as unknown as T[]).map((t) => ({
    id:t.id, title:t.title, status:t.status, priority:t.priority, dueAt:t.due_at, waitingSince:t.waiting_since, followUpAt:t.follow_up_at,
    projectId:t.project_id ?? undefined, projectName:t.projects?.name, companyName:t.projects?.companies?.name
  }));

  type P = { id:string;name:string;status:Project["status"];priority:Project["priority"];next_action:string|null;next_action_due:string|null;created_at:string;updated_at:string;company_id:string;companies:{name:string}|null;project_categories:{name:string}|null };
  const projects = ((projectResult.data ?? []) as unknown as P[]).map((p) => ({
    id:p.id, name:p.name, companyId:p.company_id, companyName:p.companies?.name ?? "取引先未設定",
    category:p.project_categories?.name ?? "その他", status:p.status, priority:p.priority,
    nextAction:p.next_action ?? undefined, nextActionDue:p.next_action_due ?? undefined,
    createdAt:p.created_at, updatedAt:p.updated_at
  }));

  const recentlyActive = new Set(((activityResult.data ?? []) as Array<{ project_id:string|null }>).map((a) => a.project_id).filter(Boolean));
  const overdueAll = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < new Date(todayStart));
  const overdueTasks = overdueAll.slice(0, 6);
  const waitingFollowupAll = tasks.filter((t) => {
    if (t.status !== "waiting" || !t.waitingSince) return false;
    if (t.followUpAt) return new Date(t.followUpAt).getTime() <= now;
    return now - new Date(t.waitingSince).getTime() >= prefs.waitingFollowupDays * 24 * 60 * 60 * 1000;
  }).map((t) => ({ ...t, waitingDays: Math.max(0, Math.floor((now - new Date(t.waitingSince!).getTime()) / (24 * 60 * 60 * 1000))) }));
  const waitingFollowupTasks = waitingFollowupAll.slice(0, 6);
  const staleProjects = projects.filter((p) => new Date(p.createdAt) < new Date(staleCutoff) && !recentlyActive.has(p.id)).slice(0, 6);
  const noNextProjects = projects.filter((p) => !p.nextAction).slice(0, 5);
  const todayAll = schedules.filter((s) => new Date(s.startAt) < new Date(tomorrowStart));

  type D = { id:string;name:string;url:string;file_type:string|null;relative_path:string|null;external_modified_at:string|null;project_id:string|null;projects:{name:string;companies:{name:string}|null}|null };
  const recentDriveFiles = ((driveResult.data ?? []) as unknown as D[]).map((f) => ({
    id:f.id, name:f.name, url:f.url, fileType:f.file_type ?? undefined, relativePath:f.relative_path ?? undefined,
    modifiedAt:f.external_modified_at ?? undefined, projectId:f.project_id ?? undefined,
    projectName:f.projects?.name, companyName:f.projects?.companies?.name
  }));

  return {
    activeProjectCount: projects.length,
    unfinishedTaskCount: tasks.length,
    todayScheduleCount: todayAll.length,
    overdueTaskCount: overdueAll.length,
    waitingFollowupCount: waitingFollowupAll.length,
    todaySchedules: todayAll.slice(0, 6),
    upcomingSchedules: schedules.slice(0, 8),
    overdueTasks,
    waitingFollowupTasks,
    staleProjects,
    noNextProjects,
    recentProjects: projects.slice(0, 8),
    recentDriveFiles
  };
}

export async function getProjectGmailMessage(projectId: string, gmailRowId: string): Promise<GmailMessageItem | null> {
  if (demoMode) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gmail_messages")
    .select("id,project_id,company_id,gmail_message_id,gmail_thread_id,subject,from_text,to_text,cc_text,sent_at,snippet,gmail_url,is_outgoing,activity_id,task_id")
    .eq("id", gmailRowId)
    .eq("project_id", projectId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw new Error(error.message);
  }
  return {
    id: data.id, projectId: data.project_id, companyId: data.company_id ?? undefined,
    gmailMessageId: data.gmail_message_id, gmailThreadId: data.gmail_thread_id, subject: data.subject || "(件名なし)",
    fromText: data.from_text ?? undefined, toText: data.to_text ?? undefined, ccText: data.cc_text ?? undefined,
    sentAt: data.sent_at ?? undefined, snippet: data.snippet ?? undefined, gmailUrl: data.gmail_url, outgoing: Boolean(data.is_outgoing),
    activityId: data.activity_id ?? undefined, taskId: data.task_id ?? undefined
  };
}

export async function getProjectGmailSummary(projectId: string, limit = 8): Promise<ProjectGmailSummary> {
  if (demoMode) return { messages: [] };
  const supabase = await createClient();

  const [messageResult, syncResult] = await Promise.all([
    supabase
      .from("gmail_messages")
      .select("id,project_id,company_id,gmail_message_id,gmail_thread_id,subject,from_text,to_text,cc_text,sent_at,snippet,gmail_url,is_outgoing,activity_id,task_id")
      .eq("project_id", projectId)
      .order("sent_at", { ascending: false, nullsFirst: false })
      .limit(limit),
    supabase
      .from("project_gmail_syncs")
      .select("last_sync_at,last_sync_error")
      .eq("project_id", projectId)
      .maybeSingle()
  ]);

  const tableMissing = (error: any) => error?.code === "42P01" || error?.code === "PGRST205";
  if (messageResult.error && !tableMissing(messageResult.error)) throw new Error(messageResult.error.message);
  if (syncResult.error && !tableMissing(syncResult.error)) throw new Error(syncResult.error.message);

  const messages: GmailMessageItem[] = (messageResult.data ?? []).map((m: any) => ({
    id: m.id,
    projectId: m.project_id,
    companyId: m.company_id ?? undefined,
    gmailMessageId: m.gmail_message_id,
    gmailThreadId: m.gmail_thread_id,
    subject: m.subject || "(件名なし)",
    fromText: m.from_text ?? undefined,
    toText: m.to_text ?? undefined,
    ccText: m.cc_text ?? undefined,
    sentAt: m.sent_at ?? undefined,
    snippet: m.snippet ?? undefined,
    gmailUrl: m.gmail_url,
    outgoing: Boolean(m.is_outgoing),
    activityId: m.activity_id ?? undefined,
    taskId: m.task_id ?? undefined
  }));

  return {
    messages,
    lastSyncAt: syncResult.data?.last_sync_at ?? undefined,
    lastSyncError: syncResult.data?.last_sync_error ?? undefined
  };
}

export async function getArchivedItems() {
  if (demoMode) return { projects: [], companies: [] };
  const supabase = await createClient();
  const [projectsResult, companiesResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,status,updated_at,company_id,companies(name)")
      .eq("is_archived", true)
      .order("updated_at", { ascending: false }),
    supabase
      .from("companies")
      .select("id,name,industry,updated_at")
      .eq("is_archived", true)
      .order("updated_at", { ascending: false })
  ]);
  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (companiesResult.error) throw new Error(companiesResult.error.message);
  return {
    projects: (projectsResult.data ?? []).map((p: any) => ({
      id: p.id,
      name: p.name,
      status: p.status as Project["status"],
      companyName: p.companies?.name ?? "取引先未設定",
      archivedAt: p.updated_at
    })),
    companies: (companiesResult.data ?? []).map((c: any) => ({
      id: c.id,
      name: c.name,
      industry: c.industry ?? "—",
      archivedAt: c.updated_at
    }))
  };
}

export async function getProjectListWithActivity() {
  if (demoMode) return demoProjects.map((p) => ({ ...p, lastActivityAt: undefined as string | undefined }));
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select(`${PROJECT_BASE_SELECT},activities(activity_at)`)
    .eq("is_archived", false)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row) => {
    const project = mapProject(row as RawProject);
    const dates = (row.activities ?? []).map((a: { activity_at: string }) => a.activity_at).filter(Boolean).sort().reverse();
    return { ...project, lastActivityAt: dates[0] as string | undefined };
  });
}


const DEFAULT_WIN_PROBABILITY: Record<Project["status"], number> = {
  consultation: 10,
  hearing: 20,
  preparing: 35,
  proposed: 50,
  considering: 70,
  ordered: 100,
  in_progress: 100,
  on_hold: 25,
  completed: 100,
  lost: 0
};

export function getEffectiveWinProbability(project: Project) {
  return project.winProbability ?? DEFAULT_WIN_PROBABILITY[project.status] ?? 0;
}

function monthKeyJst(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit" }).format(date);
}

function monthLabelFromKey(key: string) {
  const [year, month] = key.split("-");
  return `${Number(year)}年${Number(month)}月`;
}

export async function getSalesPipelineSnapshot(): Promise<SalesPipelineSnapshot> {
  const projects = await getProjects();
  const openStatuses = new Set<Project["status"]>(["consultation","hearing","preparing","proposed","considering","on_hold"]);
  const wonStatuses = new Set<Project["status"]>(["ordered","in_progress","completed"]);
  const open = projects.filter((p) => openStatuses.has(p.status));
  const won = projects.filter((p) => wonStatuses.has(p.status));

  const opportunities = open
    .map((p) => {
      const effectiveProbability = getEffectiveWinProbability(p);
      const weightedAmount = Math.round((p.expectedAmount ?? 0) * effectiveProbability / 100);
      return { ...p, effectiveProbability, weightedAmount };
    })
    .sort((a,b) => b.weightedAmount - a.weightedAmount || (a.expectedCloseDate ?? "9999-12-31").localeCompare(b.expectedCloseDate ?? "9999-12-31"));

  const stageOrder: Project["status"][] = ["consultation","hearing","preparing","proposed","considering","on_hold"];
  const stages = stageOrder.map((status) => {
    const rows = opportunities.filter((p) => p.status === status);
    return {
      status,
      count: rows.length,
      expectedAmount: rows.reduce((sum,p) => sum + (p.expectedAmount ?? 0), 0),
      weightedAmount: rows.reduce((sum,p) => sum + p.weightedAmount, 0)
    };
  });

  const now = new Date();
  const currentKey = monthKeyJst(now);
  const currentJst = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const monthKeys: string[] = [];
  for (let i=0;i<6;i++) {
    const d = new Date(currentJst.getFullYear(), currentJst.getMonth()+i, 1);
    monthKeys.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);
  }

  const months = monthKeys.map((key) => {
    const openRows = opportunities.filter((p) => p.expectedCloseDate?.slice(0,7) === key);
    const wonRows = won.filter((p) => p.orderDate?.slice(0,7) === key);
    return {
      key,
      label: monthLabelFromKey(key),
      expectedAmount: openRows.reduce((sum,p) => sum + (p.expectedAmount ?? 0), 0),
      weightedAmount: openRows.reduce((sum,p) => sum + p.weightedAmount, 0),
      orderedAmount: wonRows.reduce((sum,p) => sum + (p.orderAmount ?? 0), 0)
    };
  });

  return {
    openCount: open.length,
    openExpectedAmount: open.reduce((sum,p) => sum + (p.expectedAmount ?? 0), 0),
    weightedExpectedAmount: opportunities.reduce((sum,p) => sum + p.weightedAmount, 0),
    wonAmount: won.reduce((sum,p) => sum + (p.orderAmount ?? 0), 0),
    currentMonthWonAmount: won.filter((p) => p.orderDate?.slice(0,7) === currentKey).reduce((sum,p) => sum + (p.orderAmount ?? 0), 0),
    stages,
    months,
    opportunities
  };
}
