import { SYSTEM_PROMPT_BASE, getCategoryName, getCategoryStyle } from "./prompt";

const API_KEY = process.env.OPENROUTER_API_KEY!;
const MODEL = process.env.AI_MODEL || "nvidia/nemotron-3-ultra-550b-a55b:free";

export interface AnalysisResult {
  verdict: "worth" | "not_worth" | "maybe";
  score: number;
  reasoning: {
    match: string;
    budget: string;
    timeline: string;
    client: string;
    risks: string;
  };
  response: {
    title: string;
    cost: string;
    timeline: string;
    body: string;
  } | null;
}

function tryParseJSON(input: string): AnalysisResult | null {
  const trimmed = input.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

  let inStr = false, fixed = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === '"') {
      let bs = 0;
      for (let j = fixed.length - 1; j >= 0 && fixed[j] === "\\"; j--) bs++;
      if (bs % 2 === 0) inStr = !inStr;
    }
    if (inStr && (ch === "\n" || ch === "\r")) { fixed += "\\n"; continue; }
    fixed += ch;
  }

  try { return JSON.parse(fixed) as AnalysisResult; } catch {}
  try { return JSON.parse(trimmed) as AnalysisResult; } catch {}
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (match) try { return JSON.parse(match[0]) as AnalysisResult; } catch {}
  return null;
}

export async function analyzeProject(
  name: string,
  description: string,
  price: string | null,
  maxDays: number | null,
  userName: string | null,
  userBadges: string[],
  userHiredPercent: number | null,
  userWantsCount: number | null,
  categoryId?: number,
): Promise<AnalysisResult> {
  const catName = categoryId ? getCategoryName(categoryId) : "Разработка";
  const catStyle = categoryId ? getCategoryStyle(categoryId) : "";

  const systemPrompt = `${SYSTEM_PROMPT_BASE}

КАТЕГОРИЯ ПРОЕКТА: ${catName}
${catStyle ? `${catStyle}` : ""}`;

  const userPrompt = `Проанализируй проект:

Название: ${name}
Категория: ${catName}
Описание: ${description}
Бюджет: ${price ? `${price} ₽` : "не указан"}
Срок: ${maxDays ? `${maxDays} дней` : "не указан"}
Заказчик: ${userName || "аноним"}
Бейджи заказчика: ${userBadges.join(", ") || "нет"}
Процент найма: ${userHiredPercent !== null ? `${userHiredPercent}%` : "нет данных"}
Количество проектов: ${userWantsCount !== null ? userWantsCount : "нет данных"}`;

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 8192,
  });

  const res = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      "HTTP-Referer": "https://parserkwork.vercel.app",
      "X-Title": "Kwork Parser",
    },
    body,
  });

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error(`AI error: ${data.error?.message || JSON.stringify(data)}`);
  }

  const result = tryParseJSON(raw);
  if (!result) {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 1000)}`);
  }

  return result;
}

export function checkClientSpammer(
  userWantsCount: number | null,
  userHiredPercent: number | null,
): boolean {
  if (userWantsCount === null || userHiredPercent === null) return false;
  if (userWantsCount >= 10 && userHiredPercent < 10) return true;
  if (userWantsCount >= 5 && userHiredPercent === 0) return true;
  if (userWantsCount >= 50 && userHiredPercent < 30) return true;
  return false;
}