"use client";

import { useState } from "react";

type Result = { text: string; model?: string; generatedAt?: string };

export default function ProjectAiSummary({ projectId, configured }: { projectId: string; configured: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  async function generate() {
    setOpen(true);
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/ai/project-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "生成に失敗しました。");
      setResult(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return <section className="card project-ai-card">
    <div className="project-ai-toolbar">
      <div><strong>🤖 AI案件レビュー</strong><div className="small muted">活動・タスク・最近のGmail・Drive情報から案件の現在地を整理</div></div>
      <div className="row-actions">
        {result && <button className="button" type="button" onClick={() => setOpen((v) => !v)}>{open ? "閉じる" : "表示"}</button>}
        <button className="button soft" type="button" disabled={!configured || loading} onClick={generate}>{!configured ? "AI未設定" : loading ? "生成中…" : result ? "再生成" : "要約を生成"}</button>
      </div>
    </div>
    {open && <div className="project-ai-content">
      <div className="small muted ai-privacy-note">生成時のみ、この案件の概要・活動記録・未完了タスク・Gmailの件名/snippet・Driveファイル名をOpenAI APIへ送信します。</div>
      {error && <div className="notice error-notice ai-result-space">{error}</div>}
      {result && <div className="ai-result ai-result-space"><div className="ai-result-text">{result.text}</div><div className="small muted ai-meta">{result.generatedAt ? new Date(result.generatedAt).toLocaleString("ja-JP") : ""} ・ {result.model}</div></div>}
    </div>}
  </section>;
}
