import { Bot, webhookCallback } from "grammy";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { settings, projects, analyses } from "@/db/schema";
import { buildProjectUrl } from "./utils";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN;
const SITE_URL = process.env.SITE_URL || process.env.site_url || "http://localhost:3000";

function platformLabel(platform?: string): string {
  switch (platform) {
    case "kwork": return "Kwork";
    case "weblancer": return "Weblancer";
    case "flru": return "FL.ru";
    case "freelancer": return "Freelancer";
    default: return "сайте";
  }
}

export const bot = TOKEN ? new Bot(TOKEN) : null;

if (bot) {
  bot.command("start", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    try {
      const existing = await db.select().from(settings)
        .where(eq(settings.key, "telegram_chat_id"));
      if (existing.length) {
        const current = existing[0].value as unknown as number;
        if (current === chatId) {
          await ctx.reply("✅ Бот уже привязан к этому чату.", {
            link_preview_options: { is_disabled: true },
          });
          return;
        }
        await ctx.reply(
          `⚠️ Бот уже привязан к другому чату (${current}). Используйте /reset для сброса.`,
          { link_preview_options: { is_disabled: true } }
        );
        return;
      }
      await db.insert(settings).values({
        key: "telegram_chat_id",
        value: chatId,
      });
    } catch (e) {
      console.error("Failed to save chat ID:", e);
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

  bot.command("reset", async (ctx) => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;
    try {
      const existing = await db.select().from(settings)
        .where(eq(settings.key, "telegram_chat_id"));
      if (existing.length && (existing[0].value as unknown as number) === chatId) {
        await db.delete(settings).where(eq(settings.key, "telegram_chat_id"));
        await ctx.reply("🔄 Привязка снята. Отправьте /start заново.");
      } else {
        await ctx.reply("❌ Этот чат не привязан к боту.");
      }
    } catch (e) {
      console.error("Failed to reset chat ID:", e);
      await ctx.reply("⚠️ Ошибка при сбросе.");
    }
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
        url: projects.url,
        platform: projects.platform,
      })
      .from(analyses)
      .innerJoin(projects, eq(analyses.projectId, projects.id))
      .where(eq(analyses.projectId, projectId))
      .orderBy(desc(analyses.createdAt))
      .limit(1);

    if (row?.responseText) {
      await ctx.answerCallbackQuery({ text: "📤 Отклик готов" });
      const projectUrl = buildProjectUrl(row.url, row.platform, row.kworkId);
      await ctx.reply(
        `<b>📤 Отклик для "${row.name}"</b>\n\n<code>${row.responseText}</code>`,
        {
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [{ text: `✍️ Откликнуться на Kwork`, url: projectUrl }],
            ],
          },
          link_preview_options: { is_disabled: true },
        }
      );
    } else {
      await ctx.answerCallbackQuery({ text: "❌ Отклик не найден" });
    }
  });
}

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
  responseTimeline?: string | null,
  platform?: string,
  url?: string | null,
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
  const projectUrl = buildProjectUrl(url, platform || "kwork", kworkId);

  const text = `🆕 Новый проект: "${name}"\n`
    + `💰 ${priceStr} | ⏱ ${daysStr}\n`
    + `${emoji} Анализ: ${verdict === "worth" ? "Стоит брать" : verdict === "maybe" ? "Возможно" : "Не стоит"} (${score}/10)`
    + `${costStr}${timelineStr}\n\n`
    + `🔗 ${projectUrl}`;

  try {
    if (!bot) {
      console.warn("Telegram bot not initialized (no TELEGRAM_BOT_TOKEN)");
      return;
    }
    await bot.api.sendMessage(chatId, text, {
      link_preview_options: { is_disabled: true },
      reply_markup: {
        inline_keyboard: [
          [
            { text: `👁 Открыть на ${platformLabel(platform)}`, url: projectUrl },
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
  } catch (e) {
    console.error(`Failed to send TG notification for project ${projectId}:`, e);
  }
}

export const handleTelegramWebhook = bot ? webhookCallback(bot, "std/http") : null;