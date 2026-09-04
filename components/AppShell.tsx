import Link from "next/link";

const navSections = [
  {
    label: "日常業務",
    items: [
      ["🏠", "ホーム", "/dashboard"],
      ["🎯", "優先アクション", "/focus"],
      ["📁", "案件", "/projects"],
      ["✅", "タスク", "/tasks"],
      ["📅", "スケジュール", "/schedule"],
    ],
  },
  {
    label: "営業・売上",
    items: [
      ["🧾", "見積", "/estimates"],
      ["📊", "売上・見込", "/pipeline"],
      ["💴", "請求・入金", "/billing"],
      ["🏢", "取引先", "/companies"],
    ],
  },
  {
    label: "補助機能",
    items: [["🤖", "AI参謀", "/assistant"]],
  },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand">業務管理</div>
      <nav className="side-nav">
        {navSections.map((section) => <div className="side-section" key={section.label}>
          <div className="side-section-label">{section.label}</div>
          {section.items.map(([icon, label, href]) => <Link href={href} key={href}>{icon} {label}</Link>)}
        </div>)}
        <div className="side-sep"/>
        <Link href="/search">🔍 全体検索</Link>
        <Link href="/settings">⚙ 設定</Link>
      </nav>
    </aside>

    <div className="main-wrap">
      <header className="topbar">
        <Link className="search-box" href="/search">🔍　取引先・案件・担当者・活動を検索</Link>
        <div className="top-actions">
          <Link className="button" href="/tasks/new">＋ タスク</Link>
          <Link className="button primary" href="/projects/new">＋ 案件</Link>
          <span className="user-label small muted">Googleアカウント</span>
        </div>
      </header>
      <main className="content">{children}</main>
    </div>

    <nav className="mobile-nav">
      <Link href="/dashboard">🏠<br/>ホーム</Link>
      <Link href="/projects">📁<br/>案件</Link>
      <Link href="/projects/new"><span className="fab">＋</span></Link>
      <Link href="/tasks">✅<br/>タスク</Link>
      <Link href="/schedule">📅<br/>予定</Link>
      <Link href="/more">•••<br/>その他</Link>
    </nav>
  </div>;
}
