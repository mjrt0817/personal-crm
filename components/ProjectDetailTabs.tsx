"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type TabKey = "overview" | "activities" | "tasks" | "schedule" | "links" | "drive" | "memo";

type TabDefinition = {
  key: TabKey;
  label: string;
  note: string;
  icon: string;
  count?: number;
  content: ReactNode;
};

type Props = {
  initialTab?: string;
  overview: ReactNode;
  activities: ReactNode;
  tasks: ReactNode;
  schedule: ReactNode;
  links: ReactNode;
  drive: ReactNode;
  memo: ReactNode;
  counts?: Partial<Record<TabKey, number>>;
};

const VALID_TABS: TabKey[] = ["overview", "activities", "tasks", "schedule", "links", "drive", "memo"];

function normalizeTab(value?: string | null): TabKey {
  return VALID_TABS.includes(value as TabKey) ? (value as TabKey) : "overview";
}

export default function ProjectDetailTabs({
  initialTab,
  overview,
  activities,
  tasks,
  schedule,
  links,
  drive,
  memo,
  counts = {}
}: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>(() => normalizeTab(initialTab));

  const tabs = useMemo<TabDefinition[]>(() => [
    { key: "overview", label: "概要", note: "案件・見積・請求の全体像", icon: "▦", content: overview },
    { key: "activities", label: "活動履歴", note: "訪問・メール・Gmail", icon: "◷", count: counts.activities, content: activities },
    { key: "tasks", label: "タスク", note: "やること・回答待ち", icon: "✓", count: counts.tasks, content: tasks },
    { key: "schedule", label: "予定", note: "訪問・打合せ・期限", icon: "□", content: schedule },
    { key: "links", label: "関連リンク", note: "Teams・Web・管理画面", icon: "↗", count: counts.links, content: links },
    { key: "drive", label: "Google Drive", note: "案件フォルダ・資料", icon: "△", count: counts.drive, content: drive },
    { key: "memo", label: "メモ", note: "自由記録", icon: "≡", content: memo }
  ], [activities, counts.activities, counts.drive, counts.links, counts.tasks, drive, links, memo, overview, schedule, tasks]);

  useEffect(() => {
    const applyLocation = () => {
      const url = new URL(window.location.href);
      const fromQuery = url.searchParams.get("tab");
      const fromHash = window.location.hash ? window.location.hash.slice(1) : null;
      const candidate = fromQuery || fromHash;
      if (candidate) setActiveTab(normalizeTab(candidate));
    };

    applyLocation();
    window.addEventListener("popstate", applyLocation);
    window.addEventListener("hashchange", applyLocation);
    return () => {
      window.removeEventListener("popstate", applyLocation);
      window.removeEventListener("hashchange", applyLocation);
    };
  }, []);

  function selectTab(key: TabKey) {
    setActiveTab(key);
    const url = new URL(window.location.href);
    if (key === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", key);
    url.hash = "";
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const active = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];

  return (
    <section className="project-workspace">
      <aside className="project-section-nav desktop-only" aria-label="案件詳細メニュー">
        <div className="project-section-nav-title">案件メニュー</div>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`project-section-button ${activeTab === tab.key ? "active" : ""}`}
            aria-current={activeTab === tab.key ? "page" : undefined}
            onClick={() => selectTab(tab.key)}
          >
            <span className="project-section-icon" aria-hidden="true">{tab.icon}</span>
            <span className="project-section-copy">
              <strong>{tab.label}</strong>
              <small>{tab.note}</small>
            </span>
            {typeof tab.count === "number" && tab.count > 0 ? <span className="project-section-count">{tab.count}</span> : null}
          </button>
        ))}
      </aside>

      <div className="project-workspace-main">
        <div className="project-section-mobile mobile-only">
          <label>
            <span>表示する情報</span>
            <select value={activeTab} onChange={(event) => selectTab(event.target.value as TabKey)}>
              {tabs.map((tab) => <option value={tab.key} key={tab.key}>{tab.label}{typeof tab.count === "number" && tab.count > 0 ? ` (${tab.count})` : ""}</option>)}
            </select>
          </label>
        </div>

        <div className="project-workspace-panel" aria-live="polite">
          <div className="project-workspace-heading">
            <div><div className="small muted">案件詳細</div><h2>{active.label}</h2><p className="small muted">{active.note}</p></div>
          </div>
          {active.content}
        </div>
      </div>
    </section>
  );
}
