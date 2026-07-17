import { SYSTEM_PROMPT_BASE, getCategoryName, getCategoryStyle } from "./prompt";
import { db } from "./db";
import { analyses } from "@/db/schema";

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.AI_MODEL || "qwen/qwen3-32b";
const BASE_URL = "https://api.groq.com/openai/v1/chat/completions";

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

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

interface CallGroqOpts {
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
}

/**
 * Единая точка вызова Groq с retry/backoff (429, сетевые ошибки).
 * Возвращает сырой текст ответа модели.
 */
async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  opts: CallGroqOpts = {},
): Promise<string> {
  if (!API_KEY) throw new Error("GROQ_API_KEY is not set");

  const { temperature = 0.8, maxTokens = 512, json = false } = opts;

  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    ...(json ? { response_format: { type: "json_object" } } : {}),
  });

  let lastError = "";

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = Math.min(BASE_DELAY_MS * Math.pow(2, attempt - 1), 10000);
      const jitter = Math.random() * delay * 0.3;
      await new Promise((r) => setTimeout(r, delay + jitter));
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
          const waitMs = retryAfter ? Math.min(parseInt(retryAfter) * 1000, 10000) : BASE_DELAY_MS * 1000;
          await new Promise((r) => setTimeout(r, waitMs));
        }
        continue;
      }

      const raw = data.choices?.[0]?.message?.content;
      if (!raw) {
        lastError = `AI error: no content in response: ${JSON.stringify(data).slice(0, 500)}`;
        continue;
      }

      return raw;
    } catch (e) {
      lastError = String(e);
    }
  }

  throw new Error(`AI failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
}

function extractTimeline(text: string, maxDays: number | null): string | null {
  const m = text.match(/(\d+[-–]\d+\s*дн)/i);
  if (m) return m[1];
  return maxDays ? `${maxDays} дн` : "2-3 дн";
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

  const raw = await callGroq(systemPrompt, userPrompt, {
    temperature: 0.4,
    maxTokens: 4096,
    json: true,
  });

  const result = tryParseJSON(raw);
  if (!result) {
    throw new Error(`AI returned invalid JSON: ${raw.slice(0, 500)}`);
  }
  return result;
}

export type ClientAction = "block" | "skip" | "analyze";

export interface ClientVerdict {
  action: ClientAction;
  reason: string;
  wasteScore: number;
}

/**
 * Классификация заказчика по количеству проектов и % найма.
 *
 * Правила:
 *  - HARD BLOCK (автоблок + чёрный список):
 *      • >10 проектов И 0% найма  (жёсткое правило)
 *      • >=30 проектов И найм <10% (очевидный читер/спамер)
 *  - SOFT SKIP (пропускаем, НЕ блокируем): высокий риск пустой траты отклика.
 *      wasteScore = (100 - hired%) * 0.6 + min(wants, 50) * 1.0
 *      skip при wasteScore >= 65. Чем больше проектов при низком найме —
 *      тем выше риск, что отклик сгорит впустую.
 *  - ANALYZE: нормальный клиент → пускаем на ИИ-анализ.
 *
 * Порог WASTE_THRESHOLD (65) — настраиваемый. Поднять → агрессивнее пропускаем.
 */
export const WASTE_THRESHOLD = 65;

export function classifyClient(
  userWantsCount: number | null,
  userHiredPercent: number | null,
): ClientVerdict {
  if (userWantsCount === null || userHiredPercent === null) {
    return { action: "analyze", reason: "нет данных о заказчике", wasteScore: 0 };
  }

  // ── HARD BLOCK ──
  if (userWantsCount > 10 && userHiredPercent === 0) {
    return {
      action: "block",
      reason: `Спамер: ${userWantsCount} заказов, 0% найма`,
      wasteScore: 100,
    };
  }
  if (userWantsCount >= 30 && userHiredPercent < 10) {
    return {
      action: "block",
      reason: `Спамер: ${userWantsCount} заказов, найм ${userHiredPercent}% (<10%)`,
      wasteScore: 100,
    };
  }

  // ── SOFT SKIP по риску пустой траты ──
  const wasteScore = Math.round(
    (100 - userHiredPercent) * 0.6 + Math.min(userWantsCount, 50) * 1.0,
  );
  if (wasteScore >= WASTE_THRESHOLD) {
    return {
      action: "skip",
      reason: `Высокий риск пустой траты: ${userWantsCount} заказов, найм ${userHiredPercent}%`,
      wasteScore,
    };
  }

  return {
    action: "analyze",
    reason: `Норм: ${userWantsCount} заказов, найм ${userHiredPercent}%`,
    wasteScore,
  };
}

export interface GenerateResponseResult {
  responseText: string;
  responseCost: string | null;
  responseTimeline: string | null;
}

const RESPONSE_SYSTEM_BASE = `Ты — фрилансер. Пиши короткий отклик на проект.

Структура (строго 3-4 предложения):
1. Что понял из задачи (1 предложение)
2. Что сделаю и какой результат получишь (1-2 предложения)
3. Вопрос по деталям (1 предложение)

Правила:
- Пиши на языке результата, не технический жаргон
- Не пиши "буду рад", "с радостью", "обращайтесь", "рассмотрю"
- Не извиняйся
- Максимум 500 символов
- Просто текст, без markdown и нумерации`;

const PROMPT_CONSULTANT = `${RESPONSE_SYSTEM_BASE}

Стиль: Уверенный эксперт. Прямо и по делу.`;

const PROMPT_PARTNER = `${RESPONSE_SYSTEM_BASE}

Стиль: Дружеский, как коллега. С пониманием задачи.

Правила дополнительно:
- Звучать как соавтор, не продавец`;

function buildResponseUserPrompt(
  name: string,
  description: string,
  price: string | null,
  maxDays: number | null,
): string {
  return `Проект: ${name}
Описание: ${description}
Бюджет: ${price ? `${price} ₽` : "не указан"}
Срок: ${maxDays ? `${maxDays} дней` : "не указан"}`;
}

export async function generateResponse(
  name: string,
  description: string,
  price: string | null,
  maxDays: number | null,
): Promise<GenerateResponseResult> {
  const text = await callGroq(
    RESPONSE_SYSTEM_BASE,
    buildResponseUserPrompt(name, description, price, maxDays),
    { temperature: 0.8, maxTokens: 512 },
  );
  const responseText = text.slice(0, 500);
  return {
    responseText,
    responseCost: price ? `${price} ₽` : null,
    responseTimeline: extractTimeline(responseText, maxDays),
  };
}

export interface ABResult {
  variantA: GenerateResponseResult;
  variantB: GenerateResponseResult;
}

export async function generateTwoResponses(
  name: string,
  description: string,
  price: string | null,
  maxDays: number | null,
): Promise<ABResult> {
  const userPrompt = buildResponseUserPrompt(name, description, price, maxDays);

  const [textA, textB] = await Promise.all([
    callGroq(PROMPT_CONSULTANT, userPrompt, { temperature: 0.8, maxTokens: 512 }),
    callGroq(PROMPT_PARTNER, userPrompt, { temperature: 0.8, maxTokens: 512 }),
  ]);

  const a = textA.slice(0, 500);
  const b = textB.slice(0, 500);

  return {
    variantA: {
      responseText: a,
      responseCost: price ? `${price} ₽` : null,
      responseTimeline: extractTimeline(a, maxDays),
    },
    variantB: {
      responseText: b,
      responseCost: price ? `${price} ₽` : null,
      responseTimeline: extractTimeline(b, maxDays),
    },
  };
}

/**
 * Сохраняет сгенерированный отклик в таблицу analyses (verdict="generated").
 * Вынесено из generate-response/route.ts, чтобы не дублировать insert-логику
 * для веток single/both.
 */
export async function saveGeneratedResponse(
  projectId: number,
  result: GenerateResponseResult,
): Promise<void> {
  await db.insert(analyses).values({
    projectId,
    verdict: "generated",
    score: 0,
    reasoning: { match: "", budget: "", timeline: "", client: "", risks: "" },
    responseText: result.responseText,
    responseCost: result.responseCost,
    responseTimeline: result.responseTimeline,
    modelUsed: process.env.AI_MODEL || "qwen/qwen3-32b",
  });
}
