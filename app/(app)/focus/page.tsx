import Link from "next/link";
import ActionCandidateRow from "@/components/ActionCandidateRow";
import { getActionCenterSnapshot, type ActionBucket } from "@/lib/action-center";

const views = [
  ["today", "今日優先"],
  ["week", "今週"],
  ["watch", "要確認"],
  ["all", "すべて"]
] as const;

export default async function FocusPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const query = await searchParams;
  const view = ["today","week","watch","all"].includes(query.view ?? "") ? (query.view as ActionBucket | "all") : "today";
  const snapshot = await getActionCenterSnapshot();
  const items = view === "all" ? snapshot.all : snapshot[view];

  return <>
    <div className="page-head">
      <div>
        <h1>優先アクション</h1>
        <p className="muted">タスク・回答待ち・案件・予定・Gmailを横断し、「次に何をするか」を自動整理します。</p>
      </div>
      <Link href="/tasks/new" className="button primary">＋ タスク</Link>
    </div>

    <div className="grid-4 action-metrics">
      <div className="metric"><div className="label">今日優先</div><div className="value">{snapshot.today.length}</div><div className="small muted">今すぐ確認</div></div>
      <div className="metric"><div className="label">今週</div><div className="value">{snapshot.week.length}</div><div className="small muted">7日以内</div></div>
      <div className="metric"><div className="label">要確認</div><div className="value">{snapshot.watch.length}</div><div className="small muted">放置・次回未設定等</div></div>
      <div className="metric"><div className="label">合計候補</div><div className="value">{snapshot.all.length}</div><div className="small muted">重複を整理済み</div></div>
    </div>

    <div className="filter-chips action-filter-chips">
      {views.map(([key,label]) => <Link key={key} href={`/focus?view=${key}`} className={`filter-chip ${view===key?"active":""}`}>{label} {key === "today" ? snapshot.today.length : key === "week" ? snapshot.week.length : key === "watch" ? snapshot.watch.length : snapshot.all.length}</Link>)}
    </div>

    <section className="card">
      <div className="card-head">
        <div><h2>{view === "today" ? "今日優先すること" : view === "week" ? "今週やること" : view === "watch" ? "要確認" : "すべての候補"}</h2><div className="small muted action-center-note">期限・優先度・回答待ち・予定・未処理メールなどをルールで評価しています。</div></div>
        <span className="badge blue">自動整理</span>
      </div>
      <div className="list">
        {items.length ? items.map((item) => <ActionCandidateRow key={item.id} item={item}/>) : <div className="empty">この区分にアクション候補はありません。</div>}
      </div>
    </section>

    <div className="action-logic-note small muted">※ AIによる推測ではなく、登録済みの期限・優先度・活動履歴・予定・Gmail状態をもとにしたルールベースの優先順位です。</div>
  </>;
}
