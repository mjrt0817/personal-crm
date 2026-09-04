import { NextResponse } from "next/server";
import { buildDailyBriefContext } from "@/lib/ai-context";
import { generateAiText, getAiConfigStatus } from "@/lib/openai-server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });

  try {
    const context = await buildDailyBriefContext();
    const { text, model } = await generateAiText({
      instructions: [
        "あなたは個人事業主向けCRMの業務参謀です。",
        "与えられたCRMデータだけを根拠に、日本語で簡潔に優先順位を整理してください。",
        "事実にない推測・金額・期限を作らないでください。",
        "出力は『今日の最優先』『今週』『注意点』の3見出しで、各3〜5項目以内にしてください。",
        "各項目は、行動→理由の順で書いてください。",
      ].join("\n"),
      input: `以下が現在のCRM情報です。\n${JSON.stringify(context)}`,
      maxOutputTokens: 1200,
    });
    return NextResponse.json({ text, model, generatedAt: new Date().toISOString() });
  } catch (e) {
    const message = e instanceof Error ? e.message : "AIブリーフ生成に失敗しました。";
    return NextResponse.json({ error: message, ...getAiConfigStatus() }, { status: 500 });
  }
}
