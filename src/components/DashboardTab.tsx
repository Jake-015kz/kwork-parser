"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface Stats {
  total: number;
  new: number;
  analyzed: number;
  worth: number;
  maybe: number;
  skipped: number;
  blacklisted: number;
  inProgress: number;
  withContacts: number;
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

const CHART_COLORS = ["var(--warning)", "var(--accent)", "var(--muted)", "var(--destructive)", "#3b82f6"];
const VERDICT_COLORS = ["var(--accent)", "var(--warning)", "var(--muted)"];

function PulseRing() {
  return (
    <span className="relative flex h-3 w-3">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
    </span>
  );
}

function StatCard({ label, value, accent, icon, delay }: { label: string; value: number; accent: string; icon: string; delay: number }) {
  return (
    <div
      className="relative overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 animate-fade-in"
      style={{ ["--delay" as string]: `${delay}ms` }}
    >
      <div className="absolute -right-4 -top-4 text-6xl opacity-[0.03]">{icon}</div>
      <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-2">{label}</div>
      <div className={`text-4xl font-bold tracking-tight ${accent}`}>{value}</div>
    </div>
  );
}

function ChartCard({ title, data, colors }: { title: string; data: { name: string; value: number }[]; colors: string[] }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-4">{title}</div>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[180px] text-sm text-[var(--muted)]">
          Нет данных
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.02)" }}
              contentStyle={{ background: "#18181b", border: "1px solid var(--border)", borderRadius: "8px", fontSize: 12 }}
              labelStyle={{ color: "#a1a1aa" }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i % colors.length]} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

export default function DashboardTab() {
  const [stats, setStats] = useState<Stats>({
    total: 0, new: 0, analyzed: 0, worth: 0, maybe: 0,
    skipped: 0, blacklisted: 0, inProgress: 0, withContacts: 0,
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [kworkStatus, setKworkStatus] = useState<KworkStatus | null>(null);
  const [conversion, setConversion] = useState<{ submitted: number; viewed: number; responded: number; rejected: number; conversionRate: number } | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [projectsRes, statsRes, kworkRes] = await Promise.all([
          fetch("/api/projects?limit=1000&status=all"),
          fetch("/api/stats"),
          fetch("/api/kwork-status"),
        ]);

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          if (data?.items) {
            const items: ProjectItem[] = data.items;
            setStats((prev) => ({
              total: data.total,
              new: items.filter((p) => p.status === "new").length,
              analyzed: items.filter((p) => p.status === "analyzed").length,
              worth: items.filter((p) => p.analysis?.verdict === "worth").length,
              maybe: items.filter((p) => p.analysis?.verdict === "maybe").length,
              skipped: items.filter((p) => p.status === "skipped").length,
              blacklisted: items.filter((p) => p.status === "blacklisted").length,
              inProgress: items.filter((p) => p.status === "in_progress").length,
              withContacts: prev.withContacts,
            }));
          }
        }

        if (statsRes.ok) {
          const d = await statsRes.json();
          if (d?.logs) setLogs(d.logs);
          if (d?.stats?.withContacts !== undefined) {
            setStats((prev) => ({ ...prev, withContacts: d.stats.withContacts }));
          }
          if (d?.conversion) setConversion(d.conversion);
        }

        if (kworkRes.ok) {
          const d = await kworkRes.json();
          if (d?.connected !== undefined) setKworkStatus(d);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    };

    fetchAll();
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="space-y-6">
      {/* Hero: opportunity score */}
      <div
        className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/10 bg-gradient-to-br from-[var(--accent)]/[0.07] via-transparent to-transparent p-6 md:p-8 animate-fade-in"
      >
        <div className="flex items-center gap-3 mb-1">
          <PulseRing />
          <span className="text-xs font-medium uppercase tracking-widest text-[var(--accent)]/70">Сканирование активно</span>
        </div>
        <div className="flex items-end gap-4 mt-4">
          <span className="text-6xl md:text-7xl font-bold tracking-tighter text-[var(--accent)]">{stats.worth}</span>
          <div className="pb-2">
            <div className="text-sm text-[var(--muted)]">горячих проектов</div>
            <div className="text-xs text-[var(--muted)]/70">готовы к отправке отклика</div>
          </div>
        </div>
        {stats.worth === 0 && (
          <div className="mt-4 text-xs text-[var(--muted)]">
            Появятся сразу после ИИ-анализа новых заказов (каждые 5 мин).
          </div>
        )}
        <div className="flex gap-6 mt-6 text-sm">
          <div><span className="text-[var(--muted)]">Всего в базе </span><span className="font-semibold text-[var(--foreground)]">{stats.total}</span></div>
          <div><span className="text-[var(--muted)]">Новых </span><span className="font-semibold text-[var(--accent)]">{stats.new}</span></div>
          <div><span className="text-[var(--muted)]">С контактами </span><span className="font-semibold text-emerald-400">{stats.withContacts}</span></div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Возможно" value={stats.maybe} accent="text-[var(--warning)]" icon="?" delay={0} />
        <StatCard label="В работе" value={stats.inProgress} accent="text-blue-400" icon=">" delay={60} />
        <StatCard label="Проанализировано" value={stats.analyzed} accent="text-[var(--accent)]" icon="+" delay={120} />
        <StatCard label="В ч/списке" value={stats.blacklisted} accent="text-[var(--destructive)]" icon="x" delay={180} />
      </div>

      {/* Kwork status */}
      {kworkStatus && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 animate-fade-in" style={{ ["--delay" as string]: "240ms" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">Kwork</span>
            <span className={`w-1.5 h-1.5 rounded-full ${kworkStatus.connected ? "bg-emerald-500" : "bg-red-500"}`} />
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {kworkStatus.connected ? (
              <>
                {kworkStatus.username && <span className="text-[var(--foreground)]">{kworkStatus.username}</span>}
                {kworkStatus.rating !== undefined && <span className="text-[var(--warning)]">{kworkStatus.rating} ★</span>}
                {kworkStatus.balance !== undefined && <span className="text-[var(--muted)]">{kworkStatus.balance} ₽</span>}
                {kworkStatus.activeConnects !== undefined && (
                  <span className="text-[var(--muted)]">
                    <span className="text-blue-400 font-semibold">{kworkStatus.activeConnects}</span>/{kworkStatus.totalConnects} коннектов
                  </span>
                )}
                {kworkStatus.completedOrders !== undefined && (
                  <span className="text-[var(--muted)]">{kworkStatus.completedOrders} заказов</span>
                )}
              </>
            ) : (
              <span className="text-red-400">Не подключено</span>
            )}
          </div>
        </div>
      )}

      {/* Conversion funnel */}
      {conversion && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 animate-fade-in" style={{ ["--delay" as string]: "300ms" }}>
          <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-4">Воронка откликов</div>
          <div className="flex items-center gap-1 md:gap-2 overflow-x-auto pb-2">
            {[
              { label: "Отправлено", value: conversion.submitted, color: "bg-blue-500" },
              { label: "Просмотрено", value: conversion.viewed, color: "bg-violet-500" },
              { label: "Ответили", value: conversion.responded, color: "bg-emerald-500" },
              { label: "Отклонено", value: conversion.rejected, color: "bg-red-500" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-1 md:gap-2">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div className={`w-full h-2 rounded-full ${step.color} opacity-80`} style={{ width: `${Math.max(20, (step.value / Math.max(conversion.submitted, 1)) * 100)}%` }} />
                  <div className="text-[10px] text-[var(--muted)] mt-1 whitespace-nowrap">{step.label}</div>
                  <div className="text-lg font-bold text-[var(--foreground)]">{step.value}</div>
                </div>
                {i < 3 && <span className="text-[var(--muted)] text-lg">→</span>}
              </div>
            ))}
            <div className="ml-4 pl-4 border-l border-[var(--border)]">
              <div className="text-[10px] text-[var(--muted)]">Конверсия</div>
              <div className={`text-2xl font-bold ${conversion.conversionRate >= 10 ? "text-emerald-400" : conversion.conversionRate >= 5 ? "text-[var(--warning)]" : "text-red-400"}`}>
                {conversion.conversionRate}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="animate-fade-in" style={{ ["--delay" as string]: "360ms" }}>
          <ChartCard title="По статусам" data={statusData} colors={CHART_COLORS} />
        </div>
        <div className="animate-fade-in" style={{ ["--delay" as string]: "420ms" }}>
          <ChartCard title="По вердиктам" data={verdictData} colors={VERDICT_COLORS} />
        </div>
      </div>

      {/* Sync logs */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5 animate-fade-in" style={{ ["--delay" as string]: "480ms" }}>
        <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)] mb-4">Синхронизации</div>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Нет данных. Запустите парсинг.</p>
        ) : (
          <div className="space-y-1">
            {logs.slice(0, 8).map((log) => (
              <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/[0.03] last:border-0">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.status === "success" ? "bg-emerald-500" : "bg-red-500"}`} />
                <span className="text-[var(--muted)] font-mono tabular-nums">
                  {new Date(log.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="text-[var(--foreground)]">
                  {log.projectsFound} найдено · {log.projectsNew} новых · {log.projectsAnalyzed} анализ
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
