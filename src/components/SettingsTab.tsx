"use client";

import { useEffect, useState } from "react";
import { authedFetch, getAdminToken, setAdminToken } from "@/lib/utils";

interface BlacklistItem {
  id: number;
  userName: string;
  reason: string | null;
  autoBlocked: boolean;
  blockCount: number;
  createdAt: string;
}

const PARSE_CATEGORIES = [
  { id: 37, name: "Создание сайта (сайты под ключ)" },
  { id: 38, name: "Доработка и настройка сайта" },
  { id: 39, name: "Мобильные приложения (iOS, Android)" },
  { id: 73, name: "Тексты и наполнение сайта" },
  { id: 79, name: "Верстка" },
  { id: 41, name: "Скрипты, боты и mini apps" },
] as const;

export default function SettingsTab() {
  const [chatId, setChatId] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [saved, setSaved] = useState(false);
  const [blItems, setBlItems] = useState<BlacklistItem[]>([]);
  const [newUserName, setNewUserName] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adminToken, setAdminTokenState] = useState(() => getAdminToken());
  const fetchBlacklist = async () => {
    const res = await fetch("/api/blacklist");
    const d = await res.json();
    setBlItems(d.items || []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [settingsRes, blacklistRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/blacklist"),
        ]);
        const settings = await settingsRes.json();
        const blacklist = await blacklistRes.json();
        if (settings.chatId) setChatId(settings.chatId);
        if (settings.minBudget) setMinBudget(settings.minBudget);
        setBlItems(blacklist.items || []);
      } catch {}
    };
    load();
  }, []);

  const handleSave = async () => {
    try {
      const res = await authedFetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, minBudget }),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  const addToBlacklist = async () => {
    if (!newUserName.trim()) return;
    try {
      const res = await authedFetch("/api/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userName: newUserName.trim(), reason: newReason.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add to blacklist");
      setNewUserName("");
      setNewReason("");
      fetchBlacklist();
    } catch (err) {
      console.error("Failed to add to blacklist:", err);
    }
  };

  const removeFromBlacklist = async (id: number) => {
    try {
      const res = await authedFetch("/api/blacklist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to remove from blacklist");
      fetchBlacklist();
    } catch (err) {
      console.error("Failed to remove from blacklist:", err);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-semibold mb-3">Telegram</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--muted)] mb-1">
              ID чата для уведомлений
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="Например: 123456789"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
            />
            <p className="text-xs text-[var(--muted)] mt-1">
              Отправьте /start боту, затем напишите /id боту @getidsbot чтобы узнать ваш ID
            </p>
          </div>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm"
          >
            {saved ? "✅ Сохранено" : "💾 Сохранить"}
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-semibold mb-3">🔐 Admin-токен</h2>
        <p className="text-sm text-[var(--muted)] mb-2">
          Нужен для сохранения настроек и управления чёрным списком. Совпадает с переменной ADMIN_TOKEN на Vercel. Хранится только в этом браузере (localStorage).
        </p>
        <input
          type="password"
          value={adminToken}
          onChange={(e) => setAdminTokenState(e.target.value)}
          placeholder="ADMIN_TOKEN"
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
        />
        <button
          onClick={() => { setAdminToken(adminToken); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className="mt-2 px-4 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm"
        >
          {saved ? "✅ Токен сохранён" : "💾 Сохранить токен"}
        </button>
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-semibold mb-3">💰 Фильтр бюджета</h2>
        <p className="text-sm text-[var(--muted)] mb-2">
          Проекты с бюджетом ниже указанной суммы будут автоматически пропускаться.
        </p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            placeholder="0"
            className="w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <span className="text-sm text-[var(--muted)]">₽</span>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm"
          >
            {saved ? "✅ Сохранено" : "💾 Сохранить"}
          </button>
        </div>
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-semibold mb-3">🚫 Чёрный список</h2>
        <p className="text-sm text-[var(--muted)] mb-3">
          Заказчики из чёрного списка автоматически пропускаются при парсинге.
          Также сюда автоматически попадают спамеры (много проектов — 0% найма).
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            type="text"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            placeholder="Имя заказчика (username)"
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="text"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
            placeholder="Причина"
            className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <button
            onClick={addToBlacklist}
            className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
          >
            ➕
          </button>
        </div>

        {blItems.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Чёрный список пуст</p>
        ) : (
          <div className="space-y-2">
            {blItems.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-2 rounded border border-[var(--border)]">
                <div>
                  <span className="text-sm font-medium">{item.userName}</span>
                  {item.reason && <span className="text-xs text-[var(--muted)] ml-2">— {item.reason}</span>}
                  <span className="text-xs text-[var(--muted)] ml-2">
                    {item.autoBlocked ? "🤖 авто" : "👤 ручной"} · {item.blockCount}×
                  </span>
                </div>
                <button
                  onClick={() => removeFromBlacklist(item.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-semibold mb-3">Категории для парсинга</h2>
        <div className="space-y-2 text-sm">
          {PARSE_CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center gap-2 text-[var(--muted)]">
              <span className="text-[var(--accent)]">✓</span> {cat.id} — {cat.name}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <h2 className="text-lg font-semibold mb-3">Интеграции</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>OpenRouter API</span>
            <span className="text-[var(--accent)]">✅ Подключен</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Модель</span>
            <span className="text-[var(--muted)]">deepseek-chat-v3-0324:free</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Telegram Bot</span>
            <span className="text-[var(--accent)]">✅ Подключен</span>
          </div>
        </div>
      </div>
    </div>
  );
}
