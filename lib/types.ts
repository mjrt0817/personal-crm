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

export type FormOptions = {
  companies: Array<{ id: string; name: string }>;
  contacts: Array<{ id: string; companyId: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
};
