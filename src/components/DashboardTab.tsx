"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Stats {
  total: number;
  new: number;
  analyzed: number;
  worth: number;
  maybe: number;
  skipped: number;
  blacklisted: number;
  inProgress: number;
}

interface Log {
  id: number;
  type: string;
  status: string;
  projectsFound: number;
  projectsNew: number;
  projectsAnalyzed: number;
  createdAt: string;
}

interface ProjectItem {
  status: string;
  analysis?: { verdict?: string };
}

interface KworkStatus {
  connected: boolean;
  username?: string;
  rating?: number;
  balance?: number;
  activeConnects?: number;
  totalConnects?: number;
  completedOrders?: number;
}

const STATUS_COLORS: Record<string, string> = {
  "Новых": "#eab308",
  "Анализ": "#22c55e",
  "Пропущено": "#6b7280",
  "В ч/с": "#ef4444",
  "В работе": "#3b82f6",
};

const VERDICT_COLORS: Record<string, string> = {
  "Стоит взять": "#34d399",
  "Возможно": "#facc15",
  "Пропущено": "#6b7280",
};

export default function DashboardTab() {
  const [stats, setStats] = useState<Stats>({
    total: 0, new: 0, analyzed: 0, worth: 0, maybe: 0,
    skipped: 0, blacklisted: 0, inProgress: 0,
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [kworkStatus, setKworkStatus] = useState<KworkStatus | null>(null);

  useEffect(() => {
    fetch("/api/projects?limit=1000&status=all")
      .then((r) => r.json())
      .then((data) => {
        if (data?.items) {
          const items: ProjectItem[] = data.items;
          setStats({
            total: data.total,
            new: items.filter((p) => p.status === "new").length,
            analyzed: items.filter((p) => p.status === "analyzed").length,
            worth: items.filter((p) => p.analysis?.verdict === "worth").length,
            maybe: items.filter((p) => p.analysis?.verdict === "maybe").length,
            skipped: items.filter((p) => p.status === "skipped").length,
            blacklisted: items.filter((p) => p.status === "blacklisted").length,
            inProgress: items.filter((p) => p.status === "in_progress").length,
          });
        }
      })
      .catch(() => {});

    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => { if (d?.logs) setLogs(d.logs); })
      .catch(() => {});

    fetch("/api/kwork-status")
      .then((r) => r.json())
      .then((d) => { if (d?.connected !== undefined) setKworkStatus(d); })
      .catch(() => {});
  }, []);

  const cards = [
    { label: "Всего", value: stats.total, color: "text-blue-400" },
    { label: "Новых", value: stats.new, color: "text-yellow-400" },
    { label: "Стоит взять", value: stats.worth, color: "text-emerald-400" },
    { label: "Возможно", value: stats.maybe, color: "text-yellow-400" },
    { label: "В работе", value: stats.inProgress, color: "text-blue-400" },
    { label: "Пропущено", value: stats.skipped, color: "text-[var(--muted)]" },
    { label: "В ч/списке", value: stats.blacklisted, color: "text-red-400" },
    { label: "Проанализировано", value: stats.analyzed, color: "text-green-400" },
  ];

  const statusData = [
    { name: "Новых", value: stats.new },
    { name: "Анализ", value: stats.analyzed },
    { name: "Пропущено", value: stats.skipped },
    { name: "В ч/с", value: stats.blacklisted },
    { name: "В работе", value: stats.inProgress },
  ].filter((d) => d.value > 0);

  const verdictData = [
    { name: "Стоит взять", value: stats.worth },
    { name: "Возможно", value: stats.maybe },
    { name: "Пропущено", value: stats.skipped },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <div className="text-sm text-[var(--muted)] mb-1">{card.label}</div>
          <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}

      {kworkStatus && (
        <div className="col-span-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
          <h2 className="text-lg font-semibold mb-3">Kwork API</h2>
          <div className="flex items-center gap-4 text-sm">
            <span className={kworkStatus.connected ? "text-green-400" : "text-red-400"}>
              {kworkStatus.connected ? "🟢 Подключено" : "🔴 Не настроено"}
            </span>
            {kworkStatus.connected && (
              <>
                {kworkStatus.username && <span>👤 {kworkStatus.username}</span>}
                {kworkStatus.rating !== undefined && <span>⭐ {kworkStatus.rating}</span>}
                {kworkStatus.balance !== undefined && <span>💰 {kworkStatus.balance} ₽</span>}
                {kworkStatus.activeConnects !== undefined && (
                  <span>🔗 {kworkStatus.activeConnects}/{kworkStatus.totalConnects} коннектов</span>
                )}
                {kworkStatus.completedOrders !== undefined && (
                  <span>✅ {kworkStatus.completedOrders} заказов</span>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="col-span-full md:col-span-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold mb-3">По статусам</h2>
        {statusData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {statusData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--muted)]">Нет данных</p>
        )}
      </div>

      <div className="col-span-full md:col-span-1 rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold mb-3">По вердиктам</h2>
        {verdictData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={verdictData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                labelStyle={{ color: "var(--foreground)" }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {verdictData.map((entry) => (
                  <Cell key={entry.name} fill={VERDICT_COLORS[entry.name] || "#6b7280"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--muted)]">Нет данных</p>
        )}
      </div>

      <div className="col-span-full rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
        <h2 className="text-lg font-semibold mb-3">Последние синхронизации</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Нет данных. Запустите парсинг.</p>
        ) : (
          <div className="space-y-2">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-sm border-b border-[var(--border)] pb-2">
                <span className={log.status === "success" ? "text-green-400" : "text-red-400"}>
                  {log.status === "success" ? "✅" : "❌"}
                </span>
                <span className="text-[var(--muted)]">
                  {new Date(log.createdAt).toLocaleString("ru-RU")}
                </span>
                <span>
                  Найдено: {log.projectsFound} | Новых: {log.projectsNew} | Анализ: {log.projectsAnalyzed}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
