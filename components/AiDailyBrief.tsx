"use client";

import { useState } from "react";

type Result = { text: string; model?: string; generatedAt?: string };

export default function AiDailyBrief({ configured, model }: { configured: boolean; model: string }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/brief", { method: "POST" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "生成に失敗しました。");
      setResult(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result?.text) return;
    await navigator.clipboard?.writeText(result.text);
  }

  return <section className="card ai-card">
    <div className="card-head">
      <div><h2>今日のAIブリーフ</h2><div className="small muted">優先アクション・予定・タスクをもとに、今日と今週の動きを整理します。</div></div>
      <span className={`badge ${configured ? "green" : ""}`}>{configured ? model : "未設定"}</span>
    </div>
    <div className="card-body">
      {!configured ? <div className="notice">OpenAI APIが未設定です。Vercelに <code>OPENAI_API_KEY</code> を登録すると利用できます。</div> : <>
        <div className="ai-privacy-note small muted">「生成」を押した時だけ、優先アクション・予定等のテキスト情報を設定済みのOpenAI APIへ送信します。自動送信はしません。</div>
        <div className="row-actions ai-buttons">
          <button className="button primary" type="button" onClick={generate} disabled={loading}>{loading ? "生成中…" : result ? "再生成" : "今日のブリーフを生成"}</button>
          {result && <button className="button" type="button" onClick={copy}>コピー</button>}
        </div>
      </>}
      {error && <div className="notice error-notice ai-result-space">{error}</div>}
      {result && <div className="ai-result ai-result-space"><div className="ai-result-text">{result.text}</div><div className="small muted ai-meta">{result.generatedAt ? new Date(result.generatedAt).toLocaleString("ja-JP") : ""} ・ {result.model}</div></div>}
    </div>
  </section>;
}
