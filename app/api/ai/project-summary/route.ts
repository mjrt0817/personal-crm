import { NextRequest, NextResponse } from "next/server";
import { buildProjectSummaryContext } from "@/lib/ai-context";
import { generateAiText, getAiConfigStatus } from "@/lib/openai-server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const projectId = typeof body?.projectId === "string" ? body.projectId : "";
  if (!projectId) return NextResponse.json({ error: "案件IDが必要です。" }, { status: 400 });

  try {
    const context = await buildProjectSummaryContext(projectId);
    const { text, model } = await generateAiText({
      instructions: [
        "あなたはSFA/CRMの案件レビュー担当です。",
        "与えられた案件データだけを使い、日本語で案件の現在地を整理してください。",
        "根拠のない推測や新しい事実は作らないでください。不明は不明としてください。",
        "出力は『現状』『最近の動き』『未完了・懸念』『次にやること』『次回打合せ前の確認』の順にしてください。",
        "重要な項目を優先し、冗長にしないでください。",
      ].join("\n"),
      input: `以下が案件データです。\n${JSON.stringify(context)}`,
      maxOutputTokens: 1600,
    });
    return NextResponse.json({ text, model, generatedAt: new Date().toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "案件要約の生成に失敗しました。";
    return NextResponse.json({ error: message, ...getAiConfigStatus() }, { status: 500 });
  }
}
