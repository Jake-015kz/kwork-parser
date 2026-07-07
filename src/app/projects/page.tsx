"use client";

import { useEffect, useState } from "react";

interface Project {
  id: number;
  kworkId: number;
  name: string;
  priceLimit: string | null;
  maxDays: number | null;
  status: string;
  userName: string | null;
  timeLeft: string | null;
  skipReason: string | null;
  createdAt: string;
  analysis: { verdict: string; score: number; responseCost: string | null } | null;
}

const STATUSES = [
  { key: "all", label: "Все" },
  { key: "analyzed", label: "Готовы" },
  { key: "worth" as const, label: "Стоит взять", filter: "verdict" },
  { key: "maybe" as const, label: "Возможно", filter: "verdict" },
  { key: "in_progress", label: "В работе" },
  { key: "skipped", label: "Пропущено" },
  { key: "blacklisted", label: "В ч/с" },
  { key: "new", label: "Новые" },
  { key: "error", label: "Ошибки" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchProjects = async () => {
    setLoading(true);
    const isVerdict = STATUSES.find((s) => s.key === filter)?.filter === "verdict";
    const params = new URLSearchParams({ limit: "100" });
    if (isVerdict) {
      params.set("verdict", filter);
    } else {
      params.set("status", filter);
    }
    if (search) params.set("search", search);
    if (minBudget) params.set("minBudget", minBudget);
    if (maxBudget) params.set("maxBudget", maxBudget);
    const res = await fetch(`/api/projects?${params}`);
    const data = await res.json();
    setProjects(data.items || []);
    setTotal(data.total || 0);
    setLoading(false);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch("/api/projects/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchProjects();
  };

  useEffect(() => {
    fetchProjects();
  }, [filter, search, minBudget, maxBudget]);

  const statusColor = (s: string) => {
    switch (s) {
      case "new": return "text-yellow-400 bg-yellow-400/10";
      case "analyzed": return "text-green-400 bg-green-400/10";
      case "in_progress": return "text-blue-400 bg-blue-400/10";
      case "skipped": return "text-[var(--muted)] bg-[var(--border)]";
      case "blacklisted": return "text-red-400 bg-red-400/10";
      case "error": return "text-red-400 bg-red-400/10";
      default: return "text-[var(--muted)] bg-[var(--border)]";
    }
  };

  const statusLabel = (s: string) => {
    switch (s) {
      case "in_progress": return "в работе";
      case "skipped": return "пропущено";
      case "blacklisted": return "в ч/с";
      default: return s;
    }
  };

  const verdictBadge = (v: string | undefined, s: number | undefined) => {
    if (!v) return null;
    const color = v === "worth" ? "text-emerald-400" : v === "maybe" ? "text-yellow-400" : "text-red-400";
    return <span className={`text-xs ${color}`}>{v} ({s}/10)</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">📋 Проекты</h1>
        <a
          href="/api/projects/export"
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          📥 CSV
        </a>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUSES.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              filter === f.key
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Поиск по названию..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          type="number"
          value={minBudget}
          onChange={(e) => setMinBudget(e.target.value)}
          placeholder="Бюджет от"
          className="w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
        />
        <input
          type="number"
          value={maxBudget}
          onChange={(e) => setMaxBudget(e.target.value)}
          placeholder="до"
          className="w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
        />
      </div>

      {loading ? (
        <p className="text-[var(--muted)]">Загрузка...</p>
      ) : projects.length === 0 ? (
        <p className="text-[var(--muted)]">Нет проектов. Запустите парсинг.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">Всего: {total}</p>
          {projects.map((p) => (
            <div
              key={p.id}
              className="block p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{p.name}</h3>
                    <a
                      href={`https://kwork.ru/projects/${p.kworkId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[var(--muted)] hover:text-green-400 transition-colors text-xs"
                      title="Открыть на Kwork"
                    >
                      🔗
                    </a>
                    <a
                      href={`/projects/${p.id}`}
                      className="shrink-0 text-[var(--muted)] hover:text-[var(--accent)] transition-colors text-xs"
                      title="Детали"
                    >
                      📊
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted)]">
                    {p.priceLimit && <span>💰 {p.priceLimit} ₽</span>}
                    {p.maxDays && <span>⏱ {p.maxDays} дн.</span>}
                    {p.userName && <span>👤 {p.userName}</span>}
                    {p.timeLeft && <span>⌛ {p.timeLeft}</span>}
                    {p.analysis?.responseCost && <span>📤 {p.analysis.responseCost}</span>}
                  </div>
                  {p.skipReason && (
                    <div className="mt-1 text-xs text-[var(--muted)]">{p.skipReason}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {verdictBadge(p.analysis?.verdict, p.analysis?.score)}
                  <span className={`px-2 py-0.5 text-xs rounded ${statusColor(p.status)}`}>
                    {statusLabel(p.status)}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleStatusChange(p.id, "in_progress")}
                  className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:border-blue-400 transition-colors"
                >
                  ✅ Взял
                </button>
                <button
                  onClick={() => handleStatusChange(p.id, "skipped")}
                  className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
                >
                  ⏭ Пропустить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}