import type { Company, Project, Task } from "./types";

export const statusLabel: Record<string, string> = {
  consultation: "相談",
  hearing: "ヒアリング",
  preparing: "提案準備",
  proposed: "提案済",
  considering: "検討中",
  ordered: "受注",
  in_progress: "対応中",
  on_hold: "保留",
  completed: "完了",
  lost: "失注"
};

export const priorityLabel = {
  high: "高",
  medium: "中",
  low: "低"
} as const;

export const projects: Project[] = [
  {
    id: "logistech-dx",
    name: "DXコンシェルジュ支援",
    companyName: "有限会社ロジステック",
    contactName: "祝 俊輔",
    category: "DX支援",
    status: "in_progress",
    priority: "high",
    startDate: "2026-08-28",
    nextAction: "第2回支援資料・ツール候補を整理",
    nextActionDue: "2026-09-14",
    nextSchedule: "2026-09-15 16:00　第2回訪問",
    description: "DXコンシェルジュ全3回支援。課題整理、候補ツールの比較、導入ロードマップ策定。",
    links: [
      { id: "l1", name: "Teams報告", url: "https://teams.microsoft.com/", linkType: "teams", pinned: true, pinOrder: 1 },
      { id: "l2", name: "Google Drive", url: "https://drive.google.com/", linkType: "google_drive", pinned: true, pinOrder: 2 },
      { id: "l3", name: "先方Web", url: "https://example.com/", linkType: "website", pinned: true, pinOrder: 3 }
    ],
    activities: [
      { id: "a1", date: "2026-09-03", type: "メール", title: "議事録送付", content: "第1回打合せ議事録を送付。次回訪問日時を案内。" },
      { id: "a2", date: "2026-08-28", type: "訪問", title: "初回ヒアリング", content: "給与・勤怠、社内コミュニケーション、実費管理等の課題を整理。" }
    ],
    tasks: [
      { id: "t1", title: "第2回支援資料作成", projectId: "logistech-dx", projectName: "DXコンシェルジュ支援", companyName: "有限会社ロジステック", status: "doing", priority: "high", due: "2026-09-14" },
      { id: "t2", title: "候補ツールの費用情報確認", projectId: "logistech-dx", projectName: "DXコンシェルジュ支援", companyName: "有限会社ロジステック", status: "todo", priority: "medium", due: "2026-09-10" },
      { id: "t3", title: "第1回議事録作成", projectId: "logistech-dx", projectName: "DXコンシェルジュ支援", companyName: "有限会社ロジステック", status: "completed", priority: "medium", due: "2026-09-01" }
    ]
  },
  {
    id: "web-renewal",
    name: "Webサイト改善",
    companyName: "株式会社サンプル",
    contactName: "佐藤 太郎",
    category: "Webサイト制作",
    status: "proposed",
    priority: "medium",
    nextAction: "見積内容について確認",
    nextActionDue: "2026-09-08",
    nextSchedule: "2026-09-08 10:00　オンライン打合せ",
    description: "既存WordPressサイトのUI改善と問い合わせ導線の見直し。",
    links: [
      { id: "l4", name: "WordPress", url: "https://wordpress.org/", linkType: "management_system", pinned: true, pinOrder: 1 }
    ],
    activities: [
      { id: "a3", date: "2026-09-01", type: "提案", title: "改善案提出", content: "トップページと問い合わせ導線の改善案を提出。" }
    ],
    tasks: [
      { id: "t4", title: "見積フォロー", projectId: "web-renewal", projectName: "Webサイト改善", companyName: "株式会社サンプル", status: "todo", priority: "medium", due: "2026-09-08" }
    ]
  },
  {
    id: "it-consult",
    name: "業務管理ツール相談",
    companyName: "△△事務所",
    category: "ITコンサルティング",
    status: "hearing",
    priority: "low",
    nextAction: "現行Excelのサンプル受領待ち",
    nextActionDue: "2026-09-12",
    description: "Excel中心の案件管理をクラウド化するための初期相談。",
    links: [],
    activities: [],
    tasks: [
      { id: "t5", title: "現行Excel受領確認", projectId: "it-consult", projectName: "業務管理ツール相談", companyName: "△△事務所", status: "waiting", priority: "low", due: "2026-09-12", waitingSince: "2026-08-30T01:00:00Z", waitingDays: 4, followUpCandidate: true }
    ]
  }
];

export const tasks: Task[] = projects.flatMap((p) => p.tasks);

export const companies: Company[] = [
  { id: "c1", name: "有限会社ロジステック", industry: "福祉", activeProjects: 1, lastContact: "2026-09-03" },
  { id: "c2", name: "株式会社サンプル", industry: "サービス", activeProjects: 1, lastContact: "2026-09-01" },
  { id: "c3", name: "△△事務所", industry: "士業", activeProjects: 1, lastContact: "2026-08-25" }
];

export const schedules = [
  { id: "s1", date: "2026-09-15", time: "16:00–17:30", title: "第2回訪問", company: "有限会社ロジステック", projectId: "logistech-dx", startAt: "2026-09-15T07:00:00.000Z", endAt: "2026-09-15T08:30:00.000Z", allDay: false, location: "", description: "DXコンシェルジュ支援", googleEventId: "", googleSyncStatus: "not_synced", googleSyncError: "", googleHtmlLink: "" },
  { id: "s2", date: "2026-09-08", time: "10:00–11:00", title: "Web改善打合せ", company: "株式会社サンプル", projectId: "web-renewal", startAt: "2026-09-08T01:00:00.000Z", endAt: "2026-09-08T02:00:00.000Z", allDay: false, location: "", description: "", googleEventId: "", googleSyncStatus: "not_synced", googleSyncError: "", googleHtmlLink: "" }
];
