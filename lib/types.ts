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
export type PricingModel = "fixed" | "unit";
export type BillingStatus = "planned" | "invoiced" | "paid" | "cancelled";

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
  dueAt?: string;
  waitingSince?: string;
  followUpAt?: string;
  waitingDays?: number;
  followUpCandidate?: boolean;
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
  waitingSince?: string;
  followUpAt?: string;
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
  pricingModel?: PricingModel;
  unitLabel?: string;
  unitPrice?: number;
  plannedUnits?: number;
  completedUnits?: number;
  winProbability?: number;
  expectedCloseDate?: string;
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


export type PipelineStageSummary = {
  status: ProjectStatus;
  count: number;
  expectedAmount: number;
  weightedAmount: number;
};

export type PipelineMonthSummary = {
  key: string;
  label: string;
  expectedAmount: number;
  weightedAmount: number;
  orderedAmount: number;
};

export type SalesPipelineSnapshot = {
  openCount: number;
  openExpectedAmount: number;
  weightedExpectedAmount: number;
  wonAmount: number;
  realizedAmount: number;
  currentMonthWonAmount: number;
  unbilledAmount: number;
  billedAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  overdueAmount: number;
  stages: PipelineStageSummary[];
  months: PipelineMonthSummary[];
  opportunities: Array<Project & { effectiveProbability: number; weightedAmount: number; calculatedExpectedAmount: number }>;
  wonProjects: Array<Project & { calculatedWonAmount: number; realizedAmount: number; remainingAmount: number }>;
};


export type ProjectInvoice = {
  id: string;
  projectId: string;
  projectName?: string;
  companyId: string;
  companyName?: string;
  title: string;
  status: BillingStatus;
  amount: number;
  unitQuantity?: number;
  unitPrice?: number;
  scheduledInvoiceDate?: string;
  invoiceDate?: string;
  dueDate?: string;
  paidDate?: string;
  referenceNo?: string;
  lineDescription?: string;
  taxRate?: number;
  billingName?: string;
  billingPostalCode?: string;
  billingAddress?: string;
  issuerSnapshot?: InvoicePartySnapshot;
  customerSnapshot?: InvoicePartySnapshot;
  issuedSnapshotAt?: string;
  memo?: string;
  createdAt?: string;
  updatedAt?: string;
  overdue?: boolean;
  daysOverdue?: number;
};


export type InvoiceSettings = {
  issuerName: string;
  issuerPostalCode?: string;
  issuerAddress?: string;
  issuerPhone?: string;
  issuerEmail?: string;
  registrationNumber?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultTaxRate: number;
  paymentNote?: string;
  estimatePrefix?: string;
  nextEstimateNumber?: number;
  defaultEstimateValidDays?: number;
  estimateNote?: string;
};

export type InvoicePartySnapshot = {
  name?: string;
  postalCode?: string;
  address?: string;
  phone?: string;
  email?: string;
  registrationNumber?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  paymentNote?: string;
};

export type InvoiceDocumentData = {
  invoice: ProjectInvoice;
  project: Project;
  issuer: InvoicePartySnapshot;
  customer: InvoicePartySnapshot;
  taxAmount: number;
  subtotal: number;
};

export type ProjectBillingSummary = {
  invoices: ProjectInvoice[];
  projectRevenue: number;
  plannedAmount: number;
  issuedAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  overdueAmount: number;
  overdueCount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  suggestedAmount: number;
  suggestedUnits?: number;
  allocatedUnits?: number;
};

export type BillingSnapshot = {
  plannedAmount: number;
  unbilledAmount: number;
  unbilledReadyAmount: number;
  unbilledReadyCount: number;
  unbilledProjects: Array<{ projectId: string; projectName: string; companyName: string; amount: number; units?: number; unitLabel?: string }>;
  issuedAmount: number;
  outstandingAmount: number;
  paidAmount: number;
  overdueAmount: number;
  overdueCount: number;
  dueSoonAmount: number;
  dueSoonCount: number;
  invoices: ProjectInvoice[];
};

export type EstimateStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export type EstimateItem = {
  id?: string;
  description: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  taxRate: number;
  lineSubtotal: number;
  taxAmount: number;
  sortOrder: number;
};

export type Estimate = {
  id: string;
  companyId: string;
  companyName?: string;
  contactId?: string;
  contactName?: string;
  projectId?: string;
  projectName?: string;
  estimateNo: string;
  title: string;
  status: EstimateStatus;
  issueDate: string;
  validUntil?: string;
  acceptedDate?: string;
  billingName?: string;
  billingPostalCode?: string;
  billingAddress?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  issuerSnapshot?: InvoicePartySnapshot;
  customerSnapshot?: InvoicePartySnapshot;
  issuedSnapshotAt?: string;
  memo?: string;
  terms?: string;
  items: EstimateItem[];
  createdAt?: string;
  updatedAt?: string;
};

export type EstimateSettings = {
  estimatePrefix: string;
  nextEstimateNumber: number;
  defaultEstimateValidDays: number;
  estimateNote?: string;
};

export type EstimateDocumentData = {
  estimate: Estimate;
  issuer: InvoicePartySnapshot;
  customer: InvoicePartySnapshot;
};

export type EstimateFormOptions = {
  companies: Array<{ id: string; name: string; postalCode?: string; address?: string }>;
  contacts: Array<{ id: string; companyId: string; name: string }>;
  projects: Array<{ id: string; companyId: string; name: string }>;
};
