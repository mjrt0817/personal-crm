import { getActionCenterSnapshot } from "@/lib/action-center";
import { getDashboardSnapshot, getProject, getProjectDriveSummary, getProjectGmailSummary } from "@/lib/data";

function clean(value: unknown, max = 700) {
  if (typeof value !== "string") return value;
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export async function buildDailyBriefContext() {
  const [actions, dashboard] = await Promise.all([getActionCenterSnapshot(), getDashboardSnapshot()]);
  return {
    generatedAt: new Date().toISOString(),
    actionCandidates: actions.all.slice(0, 30).map((x) => ({
      bucket: x.bucket,
      kind: x.kind,
      badge: x.badge,
      title: clean(x.title, 200),
      reason: clean(x.reason, 260),
      company: clean(x.companyName, 120),
      project: clean(x.projectName, 160),
      dueAt: x.dueAt,
    })),
    upcomingSchedules: dashboard.upcomingSchedules.slice(0, 10).map((x: any) => ({
      date: x.date,
      time: x.time,
      title: clean(x.title, 180),
      company: clean(x.company, 120),
    })),
    counts: {
      unfinishedTasks: dashboard.unfinishedTaskCount,
      overdueTasks: dashboard.overdueTaskCount,
      waitingFollowups: dashboard.waitingFollowupCount,
      todaySchedules: dashboard.todayScheduleCount,
      activeProjects: dashboard.activeProjectCount,
    },
  };
}

export async function buildProjectSummaryContext(projectId: string) {
  const [project, gmail, drive] = await Promise.all([
    getProject(projectId),
    getProjectGmailSummary(projectId, 6),
    getProjectDriveSummary(projectId, 8),
  ]);
  if (!project) throw new Error("案件が見つかりません。");

  return {
    project: {
      name: clean(project.name, 200),
      company: clean(project.companyName, 160),
      category: clean(project.category, 120),
      status: project.status,
      priority: project.priority,
      description: clean(project.description, 1200),
      memo: clean(project.memo, 1200),
      dueDate: project.dueDate,
      nextAction: clean(project.nextAction, 400),
      nextActionDue: project.nextActionDue,
      nextSchedule: clean(project.nextSchedule, 300),
    },
    recentActivities: project.activities.slice(0, 12).map((x) => ({
      date: x.date,
      type: x.type,
      title: clean(x.title, 240),
      content: clean(x.content, 900),
    })),
    openTasks: project.tasks.filter((x) => x.status !== "completed").slice(0, 15).map((x) => ({
      title: clean(x.title, 240),
      status: x.status,
      priority: x.priority,
      due: x.due,
      waitingDays: x.waitingDays,
    })),
    recentMail: gmail.messages.slice(0, 6).map((x) => ({
      sentAt: x.sentAt,
      direction: x.outgoing ? "outgoing" : "incoming",
      subject: clean(x.subject, 260),
      snippet: clean(x.snippet, 500),
      taskized: Boolean(x.taskId),
      activityized: Boolean(x.activityId),
    })),
    recentDriveFiles: drive.files.slice(0, 8).map((x) => ({
      name: clean(x.name, 220),
      fileType: x.fileType,
      relativePath: clean(x.relativePath, 300),
      modifiedAt: x.modifiedAt,
    })),
  };
}
