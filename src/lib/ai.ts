import { SYSTEM_PROMPT_BASE, getCategoryName, getCategoryStyle } from "./prompt";

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.AI_MODEL || "qwen/qwen3-32b";
const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 3000;

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
  if (!API_KEY) {
    throw new Error("GROQ_API_KEY is not set");
  }

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
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });

  let lastError: string = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }

    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
        },
        body,
      });

      const data = await res.json();

      if (!res.ok) {
        lastError = `HTTP ${res.status}: ${data.error?.message || JSON.stringify(data)}`;
        if (res.status === 429) {
          const retryAfter = res.headers.get("retry-after");
          const waitMs = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 10000) : RETRY_DELAY_MS;
          await new Promise((r) => setTimeout(r, waitMs));
        }
        continue;
      }

      const raw = data.choices?.[0]?.message?.content;
      if (!raw) {
        lastError = `AI error: no content in response: ${JSON.stringify(data).slice(0, 500)}`;
        continue;
      }

      const result = tryParseJSON(raw);
      if (!result) {
        lastError = `AI returned invalid JSON: ${raw.slice(0, 500)}`;
        continue;
      }

      return result;
    } catch (e) {
      lastError = String(e);
    }
  }

  throw new Error(`AI failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
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
