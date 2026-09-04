import Link from "next/link";
import AiDailyBrief from "@/components/AiDailyBrief";
import { getAiConfigStatus } from "@/lib/openai-server";
import { getActionPreferences } from "@/lib/preferences";

export default async function AssistantPage() {
  const [ai, prefs] = await Promise.all([Promise.resolve(getAiConfigStatus()), getActionPreferences()]);
  return <>
    <div className="page-head">
      <div><h1>AI参謀</h1><p className="muted">CRMに登録された事実をもとに、今日の動きや案件の現在地を整理します。</p></div>
      <Link href="/focus" className="button">優先アクションを見る</Link>
    </div>

    <AiDailyBrief configured={ai.configured} model={ai.model}/>

    <section className="card" style={{ marginTop: 18 }}>
      <div className="card-head"><h2>使い方</h2></div>
      <div className="card-body">
        <div className="kv"><div className="k">今日の整理</div><div>この画面の「今日のブリーフを生成」から、優先アクションと予定を要約します。</div></div>
        <div className="kv"><div className="k">案件レビュー</div><div>各案件詳細の「AI案件レビュー」から、その案件だけを要約します。</div></div>
        <div className="kv"><div className="k">自動送信</div><div>なし。AI生成ボタンを押した場合だけAPIへ送信します。</div></div>
        <div className="kv"><div className="k">現在の判定条件</div><div>回答待ち {prefs.waitingFollowupDays}日 / 活動なし {prefs.staleProjectDays}日 / タスク {prefs.taskHorizonDays}日先まで</div></div>
        <div className="row-actions" style={{ marginTop: 14 }}><Link href="/settings#action-rules" className="button soft">優先アクション条件を調整</Link></div>
      </div>
    </section>
  </>;
}
