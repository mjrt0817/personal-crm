export type ProjectStatus =
  | "consultation"
  | "hearing"
  | "preparing"
  | "proposed"
  | "considering"
  | "ordered"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "lost";

export type Priority = "high" | "medium" | "low";
export type TaskStatus = "todo" | "doing" | "waiting" | "completed";

export type ProjectLink = {
  id: string;
  name: string;
  url: string;
  linkType: string;
  memo?: string;
  pinned: boolean;
  pinOrder?: number;
};

export type Activity = {
  id: string;
  date: string;
  type: string;
  title: string;
  content: string;
};

export type Task = {
  id: string;
  title: string;
  projectId?: string;
  projectName?: string;
  companyName?: string;
  status: TaskStatus;
  priority: Priority;
  due: string;
};

export type TaskDetail = {
  id: string;
  title: string;
  description?: string;
  memo?: string;
  projectId?: string;
  companyId?: string;
  status: TaskStatus;
  priority: Priority;
  startDate?: string;
  dueAt?: string;
};

export type ProjectLinkDetail = ProjectLink & {
  projectId: string;
  memo?: string;
};

export type ActivityDetail = {
  id: string;
  companyId: string;
  projectId?: string;
  contactId?: string;
  activityType: string;
  activityAt: string;
  title?: string;
  content: string;
  nextAction?: string;
};

export type ScheduleDetail = {
  id: string;
  companyId?: string;
  projectId?: string;
  title: string;
  scheduleType: string;
  startAt: string;
  endAt?: string;
  allDay: boolean;
  location?: string;
  description?: string;
  googleEventId?: string;
  googleSyncStatus?: "not_synced" | "synced" | "error";
  googleSyncError?: string;
  googleHtmlLink?: string;
};


export type ProjectDriveFolder = {
  id: string;
  projectId: string;
  googleFolderId: string;
  name: string;
  url: string;
  lastSyncAt?: string;
  lastSyncError?: string;
};

export type ProjectDriveFile = {
  id: string;
  driveFolderId: string;
  name: string;
  url: string;
  fileType?: string;
  mimeType?: string;
  relativePath?: string;
  modifiedAt?: string;
  isFolder: boolean;
};

export type ProjectDriveSummary = {
  folders: ProjectDriveFolder[];
  files: ProjectDriveFile[];
};

export type GoogleCalendarConnectionStatus = {
  connected: boolean;
  googleEmail?: string;
  connectedAt?: string;
  lastSyncAt?: string;
  lastSyncError?: string;
};


export type ProjectHeader = {
  id: string;
  name: string;
  companyId: string;
  companyName: string;
};

export type Project = {
  id: string;
  name: string;
  companyId?: string;
  companyName: string;
  contactId?: string;
  contactName?: string;
  categoryId?: string;
  category: string;
  status: ProjectStatus;
  priority: Priority;
  inquiryDate?: string;
  proposalDate?: string;
  orderDate?: string;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  expectedAmount?: number;
  orderAmount?: number;
  nextAction?: string;
  nextActionDue?: string;
  nextSchedule?: string;
  description: string;
  memo?: string;
  links: ProjectLink[];
  activities: Activity[];
  tasks: Task[];
};

export type Company = {
  id: string;
  name: string;
  industry: string;
  activeProjects: number;
  lastContact: string;
};

export type CompanyDetail = {
  id: string;
  name: string;
  companyType?: string;
  industry?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  memo?: string;
  contacts: Array<{ id: string; name: string; department?: string; position?: string; email?: string; phone?: string }>;
  projects: Array<{ id: string; name: string; status: ProjectStatus; nextAction?: string }>;
};

export type ContactDetail = {
  id: string;
  companyId: string;
  companyName: string;
  name: string;
  department?: string;
  position?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  memo?: string;
};

export type FormOptions = {
  companies: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; companyId: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
};

export type GmailMessageItem = {
  id: string;
  projectId: string;
  companyId?: string;
  gmailMessageId: string;
  gmailThreadId: string;
  subject: string;
  fromText?: string;
  toText?: string;
  ccText?: string;
  sentAt?: string;
  snippet?: string;
  gmailUrl: string;
  outgoing: boolean;
  activityId?: string;
  taskId?: string;
};

export type ProjectGmailSummary = {
  messages: GmailMessageItem[];
  lastSyncAt?: string;
  lastSyncError?: string;
};
