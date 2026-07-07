import { Bot, webhookCallback } from "grammy";
import { eq, and, desc } from "drizzle-orm";
import { db } from "./db";
import { settings, projects, analyses } from "@/db/schema";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const SITE_URL = process.env.SITE_URL!;

export const bot = new Bot(TOKEN);

bot.command("start", async (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    try {
      const existing = await db.select().from(settings)
        .where(eq(settings.key, "telegram_chat_id"));
      if (existing.length) {
        await db.update(settings)
          .set({ value: chatId } as any)
          .where(eq(settings.key, "telegram_chat_id"));
      } else {
        await db.insert(settings).values({
          key: "telegram_chat_id",
          value: chatId as any,
        });
      }
    } catch (e) {
      console.error("Failed to save chat ID:", e);
    }
  }

  await ctx.reply(
    "👋 Привет! Я бот для мониторинга проектов на Kwork.\n\n"
    + "Я буду присылать тебе новые проекты по твоей специализации.\n\n"
    + "После анализа у каждого проекта будут кнопки:\n"
    + "✅ Взял — отмечаю что ты взял заказ\n"
    + "⏭ Пропустил — проект неинтересен\n"
    + "📤 Отклик — показываю текст готового отклика\n\n"
    + "Открыть дашборд: " + SITE_URL,
    { link_preview_options: { is_disabled: true } }
  );
});

bot.command("stats", async (ctx) => {
  try {
    const { count } = await import("drizzle-orm");
    const [total] = await db.select({ value: count() }).from(projects);
    await ctx.reply(
      `📊 Статистика:\n`
      + `Всего проектов в БД: ${total.value}\n`
      + `Дашборд: ${SITE_URL}`
    );
  } catch {
    await ctx.reply("⚠️ База данных временно недоступна");
  }
});

bot.callbackQuery(/take_(\d+)/, async (ctx) => {
  const projectId = parseInt(ctx.match[1]);
  await db.update(projects)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await ctx.answerCallbackQuery({ text: "✅ Отмечено как «Взял в работу»" });
  try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch {}
});

bot.callbackQuery(/skip_(\d+)/, async (ctx) => {
  const projectId = parseInt(ctx.match[1]);
  await db.update(projects)
    .set({ status: "skipped", skipReason: "Пропущено в Telegram", updatedAt: new Date() })
    .where(eq(projects.id, projectId));
  await ctx.answerCallbackQuery({ text: "⏭ Проект пропущен" });
  try { await ctx.editMessageReplyMarkup({ reply_markup: undefined }); } catch {}
});

bot.callbackQuery(/response_(\d+)/, async (ctx) => {
  const projectId = parseInt(ctx.match[1]);
  const [row] = await db
    .select({
      responseText: analyses.responseText,
      kworkId: projects.kworkId,
      name: projects.name,
    })
    .from(analyses)
    .innerJoin(projects, eq(analyses.projectId, projects.id))
    .where(eq(analyses.projectId, projectId))
    .orderBy(desc(analyses.createdAt))
    .limit(1);

  if (row?.responseText) {
    await ctx.answerCallbackQuery({ text: "📤 Отклик готов" });
    const kworkUrl = `https://kwork.ru/projects/${row.kworkId}/view`;
    await ctx.reply(
      `<b>📤 Отклик для "${row.name}"</b>\n\n<code>${row.responseText}</code>`,
      {
        parse_mode: "HTML",
        reply_markup: {
          inline_keyboard: [
            [{ text: "✍️ Откликнуться на Kwork", url: kworkUrl }],
          ],
        },
        link_preview_options: { is_disabled: true },
      }
    );
  } else {
    await ctx.answerCallbackQuery({ text: "❌ Отклик не найден" });
  }
});

export async function sendProjectNotification(
  projectId: number,
  kworkId: number,
  name: string,
  price: string | null,
  maxDays: number | null,
  verdict: string,
  score: number,
  chatId?: number,
  responseCost?: string | null,
  responseTimeline?: string | null
) {
  if (!chatId) {
    const chatSetting = await db.select().from(settings)
      .where(eq(settings.key, "telegram_chat_id"));
    if (!chatSetting.length) return;
    chatId = chatSetting[0].value as unknown as number;
  }

  const emoji = verdict === "worth" ? "✅" : verdict === "maybe" ? "🤔" : "❌";
  const priceStr = price ? `${price} ₽` : "цена не указана";
  const daysStr = maxDays ? `${maxDays} дней` : "срок не указан";
  const costStr = responseCost ? `\n💰 Отклик: ${responseCost}` : "";
  const timelineStr = responseTimeline ? ` | ⏱ ${responseTimeline}` : "";
  const kworkUrl = `https://kwork.ru/projects/${kworkId}/view`;

  const text = `🆕 Новый проект: "${name}"\n`
    + `💰 ${priceStr} | ⏱ ${daysStr}\n`
    + `${emoji} Анализ: ${verdict === "worth" ? "Стоит брать" : verdict === "maybe" ? "Возможно" : "Не стоит"} (${score}/10)`
    + `${costStr}${timelineStr}\n\n`
    + `🔗 ${kworkUrl}`;

  await bot.api.raw.sendMessage({
    chat_id: chatId,
    text,
    link_preview_options: { is_disabled: true },
    reply_markup: {
      inline_keyboard: [
        [
          { text: "👁 На Kwork", url: kworkUrl },
          { text: "📊 Детали", url: `${SITE_URL}/projects/${projectId}` },
        ],
        [
          { text: "✅ Взял", callback_data: `take_${projectId}` },
          { text: "⏭ Пропустил", callback_data: `skip_${projectId}` },
          { text: "📤 Отклик", callback_data: `response_${projectId}` },
        ],
      ],
    },
  });
}

export const handleTelegramWebhook = webhookCallback(bot, "std/http");