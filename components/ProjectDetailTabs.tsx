"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

type TabKey = "overview" | "activities" | "tasks" | "schedule" | "links" | "drive" | "memo";

type TabDefinition = {
  key: TabKey;
  label: string;
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
    { key: "overview", label: "概要", content: overview },
    { key: "activities", label: "活動", count: counts.activities, content: activities },
    { key: "tasks", label: "タスク", count: counts.tasks, content: tasks },
    { key: "schedule", label: "予定", content: schedule },
    { key: "links", label: "関連リンク", count: counts.links, content: links },
    { key: "drive", label: "Drive", count: counts.drive, content: drive },
    { key: "memo", label: "メモ", content: memo }
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
    <section className="project-tab-shell">
      <div className="project-tabs" role="tablist" aria-label="案件詳細メニュー">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`project-panel-${tab.key}`}
            id={`project-tab-${tab.key}`}
            className={`project-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => selectTab(tab.key)}
          >
            <span>{tab.label}</span>
            {typeof tab.count === "number" && tab.count > 0 ? <span className="project-tab-count">{tab.count}</span> : null}
          </button>
        ))}
      </div>

      <div
        className="project-tab-panel"
        role="tabpanel"
        id={`project-panel-${active.key}`}
        aria-labelledby={`project-tab-${active.key}`}
      >
        {active.content}
      </div>
    </section>
  );
}
