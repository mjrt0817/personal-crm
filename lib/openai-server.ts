const DEFAULT_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-5.6-luna";

export function getAiConfigStatus() {
  return {
    configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    model: DEFAULT_MODEL,
  };
}

function extractResponseText(payload: any) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const pieces: string[] = [];
  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if ((content?.type === "output_text" || content?.type === "text") && typeof content?.text === "string") pieces.push(content.text);
    }
  }
  return pieces.join("\n").trim();
}

export async function generateAiText({ instructions, input, maxOutputTokens = 1400 }: { instructions: string; input: string; maxOutputTokens?: number }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OpenAI APIが未設定です。VercelにOPENAI_API_KEYを登録してください。");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      instructions,
      input,
      max_output_tokens: maxOutputTokens,
    }),
    cache: "no-store",
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI API error (${response.status})`;
    throw new Error(message);
  }

  const text = extractResponseText(payload);
  if (!text) throw new Error("AIから本文を取得できませんでした。");
  return { text, model: DEFAULT_MODEL };
}
