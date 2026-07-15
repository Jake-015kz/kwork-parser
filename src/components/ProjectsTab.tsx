"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { buildProjectUrl } from "@/lib/utils";

interface Project {
  id: number;
  kworkId: number;
  platform: string;
  name: string;
  priceLimit: string | null;
  maxDays: number | null;
  status: string;
  userName: string | null;
  timeLeft: string | null;
  skipReason: string | null;
  url: string | null;
  createdAt: string;
  analysis: { verdict: string; score: number; responseCost: string | null } | null;
}

interface ProjectDetail {
  id: number;
  kworkId: number;
  platform: string;
  categoryId: number;
  name: string;
  description: string;
  priceLimit: string | null;
  maxDays: number | null;
  userName: string | null;
  userBadges: string[];
  userHiredPercent: number | null;
  userWantsCount: number | null;
  status: string;
  viewsCount: number | null;
  timeLeft: string | null;
  dateCreate: string | null;
  dateExpire: string | null;
  url: string | null;
  createdAt: string;
  analyses: AnalysisItem[];
  responses: ResponseItem[];
}

interface AnalysisItem {
  id: number;
  verdict: string;
  score: number;
  reasoning: Record<string, string> | null;
  responseText: string | null;
  responseCost: string | null;
  responseTimeline: string | null;
  createdAt: string;
}

interface ResponseItem {
  id: number;
  text: string;
  status: string;
  createdAt: string;
}

const STATUS_FILTERS = [
  { key: "all", label: "Все" },
  { key: "analyzed", label: "Готовы" },
  { key: "worth", label: "Стоит взять", filter: "verdict" },
  { key: "maybe", label: "Возможно", filter: "verdict" },
  { key: "in_progress", label: "В работе" },
  { key: "new", label: "Новые" },
  { key: "skipped", label: "Пропущено" },
  { key: "blacklisted", label: "В ч/с" },
  { key: "error", label: "Ошибки" },
];

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [platform, setPlatform] = useState("all");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const prevFilterRef = useRef(`${filter}|${search}|${minBudget}|${maxBudget}|${platform}`);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<ProjectDetail | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const isVerdict = STATUS_FILTERS.find((s) => s.key === filter)?.filter === "verdict";
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (isVerdict) {
      params.set("verdict", filter);
    } else {
      params.set("status", filter);
    }
    if (search) params.set("search", search);
    if (minBudget) params.set("minBudget", minBudget);
    if (maxBudget) params.set("maxBudget", maxBudget);
    if (platform !== "all") params.set("platform", platform);
    const res = await fetch(`/api/projects?${params}`);
    const data = await res.json();
    setProjects(data.items || []);
    setTotal(data.total || 0);
    setHasMore((data.items?.length || 0) < (data.total || 0));
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

  const openDetail = async (id: number) => {
    setSelectedId(id);
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      setDetail(data);
    } catch {
      setDetail(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedId) return;
    setAnalyzing(true);
    await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: selectedId }),
    });
    await openDetail(selectedId);
    fetchProjects();
    setAnalyzing(false);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSubmitToKwork = async (projectId: number, kworkId: number, platform?: string, url?: string | null) => {
    const res = await fetch(`/api/responses?projectId=${projectId}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.responseText) {
      await navigator.clipboard.writeText(data.responseText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (platform === "fl" && url) {
        window.open(url, "_blank");
      } else {
        window.open(buildProjectUrl(url, platform || "kwork", kworkId), "_blank");
      }
    }
  };

  useEffect(() => {
    const currentKey = `${filter}|${search}|${minBudget}|${maxBudget}|${platform}`;
    const filtersChanged = prevFilterRef.current !== currentKey;
    if (filtersChanged) {
      prevFilterRef.current = currentKey;
      setOffset(0);
      setProjects([]);
      setHasMore(false);
      setLoading(true);
      return;
    }

    const load = async () => {
      setLoading(true);
      const isVerdict = STATUS_FILTERS.find((s) => s.key === filter)?.filter === "verdict";
      const params = new URLSearchParams({ limit: "100", offset: String(offset) });
      if (isVerdict) {
        params.set("verdict", filter);
      } else {
        params.set("status", filter);
      }
      if (search) params.set("search", search);
      if (minBudget) params.set("minBudget", minBudget);
      if (maxBudget) params.set("maxBudget", maxBudget);
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      if (offset === 0) {
        setProjects(data.items || []);
      } else {
        setProjects((prev) => [...prev, ...(data.items || [])]);
      }
      setTotal(data.total || 0);
      setHasMore(offset + (data.items?.length || 0) < (data.total || 0));
      setLoading(false);
    };
    load();
  }, [filter, search, minBudget, maxBudget, platform, offset]);

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

  if (selectedId && detail) {
    const latestAnalysis = detail.analyses?.[detail.analyses.length - 1];
    return (
      <div className="max-w-4xl">
        <button
          onClick={() => { setSelectedId(null); setDetail(null); }}
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 inline-block"
        >
          ← Назад к списку
        </button>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{detail.name}</h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-sm text-[var(--muted)]">
              {detail.priceLimit && <span>💰 {detail.priceLimit} ₽</span>}
              {detail.maxDays && <span>⏱ {detail.maxDays} дней</span>}
              {detail.userName && <span>👤 {detail.userName}</span>}
              {detail.timeLeft && <span>⌛ {detail.timeLeft}</span>}
              {detail.viewsCount !== null && <span>👁 {detail.viewsCount}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {latestAnalysis?.responseText && (
              <button
                onClick={() => handleSubmitToKwork(detail.id, detail.kworkId, detail.platform, detail.url)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm inline-flex items-center"
              >
                {copied ? "✅ Скопировано" : "📤 Отправить отклик"}
              </button>
            )}
            <a
              href={buildProjectUrl(detail.url, detail.platform, detail.kworkId)}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] rounded-lg hover:text-[var(--foreground)] transition-colors text-sm inline-flex items-center"
            >
              🔗 {detail.platform === "fl" ? "На FL.ru" : "На Kwork"}
            </a>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              {analyzing ? "Анализ..." : "Анализировать"}
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Описание</h2>
            <p className="text-sm whitespace-pre-wrap">{detail.description || "Нет описания"}</p>
          </div>

          {detail.userBadges && detail.userBadges.length > 0 && (
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Бейджи заказчика</h2>
              <div className="flex flex-wrap gap-2">
                {(detail.userBadges as string[]).map((badge, i) => (
                  <span key={i} className="px-2 py-1 text-xs rounded bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}

          {latestAnalysis && (
            <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
              <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">
                AI-анализ
                <span className="ml-2 text-xs font-normal">
                  {latestAnalysis.verdict === "worth" ? "✅" : latestAnalysis.verdict === "maybe" ? "🤔" : "❌"}
                  {latestAnalysis.verdict} ({latestAnalysis.score}/10)
                </span>
              </h2>
              {latestAnalysis.reasoning && (
                <div className="text-sm space-y-1 mt-2">
                  {Object.entries(latestAnalysis.reasoning as Record<string, string>).map(([key, val]) => (
                    <div key={key} className="flex gap-2">
                      <span className="text-[var(--muted)] capitalize min-w-20">{key}:</span>
                      <span>{val}</span>
                    </div>
                  ))}
                </div>
              )}
              {latestAnalysis.responseText && (
                <div className="mt-3 p-3 rounded bg-[var(--background)] border border-[var(--border)]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-semibold text-[var(--muted)] uppercase">Сгенерированный отклик</h3>
                    <button
                      onClick={() => latestAnalysis.responseText && copyToClipboard(latestAnalysis.responseText)}
                      className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-black font-medium hover:bg-[var(--accent-hover)] transition-colors"
                    >
                      {copied ? "✅ Скопировано" : "📋 Копировать"}
                    </button>
                  </div>
                  {latestAnalysis.responseCost && (
                    <div className="text-sm mb-1">
                      <span className="text-[var(--muted)]">💰 Стоимость:</span>{" "}
                      <span className="font-medium">{latestAnalysis.responseCost}</span>
                    </div>
                  )}
                  {latestAnalysis.responseTimeline && (
                    <div className="text-sm mb-2">
                      <span className="text-[var(--muted)]">⏱ Срок:</span>{" "}
                      <span className="font-medium">{latestAnalysis.responseTimeline}</span>
                    </div>
                  )}
                  <pre className="text-sm whitespace-pre-wrap font-sans">{latestAnalysis.responseText}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
              filter === f.key
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Поиск по названию..."
          className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
        />
        <div className="flex gap-2">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="all">Все платформы</option>
            <option value="kwork">Kwork</option>
            <option value="fl">FL.ru</option>
          </select>
          <input
            type="number"
            value={minBudget}
            onChange={(e) => setMinBudget(e.target.value)}
            placeholder="Бюджет от"
            className="w-full sm:w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            placeholder="до"
            className="w-full sm:w-28 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm focus:outline-none focus:border-[var(--accent)]"
          />
          <Link
            href="/api/projects/export"
            className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)] transition-colors whitespace-nowrap"
          >
            📥 CSV
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] animate-pulse">
              <div className="h-4 bg-[var(--border)] rounded w-1/3 mb-2"></div>
              <div className="h-3 bg-[var(--border)] rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <p className="text-[var(--muted)]">Нет проектов. Запустите парсинг.</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-[var(--muted)]">Всего: {total} | Показано: {projects.length}</p>
          {projects.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[var(--accent)]/30"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openDetail(p.id)}
                      className="font-medium truncate text-left hover:text-[var(--accent)] transition-colors"
                    >
                      {p.name}
                    </button>
                    <a
                      href={buildProjectUrl(p.url, p.platform, p.kworkId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[var(--muted)] hover:text-green-400 transition-colors text-xs"
                      title={`Открыть на ${p.platform === "fl" ? "FL.ru" : "Kwork"}`}
                    >
                      🔗
                    </a>
                  </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-1 text-sm text-[var(--muted)]">
                <span className={`px-2 py-0.5 text-xs rounded ${
                  p.platform === "fl" 
                    ? "bg-blue-400/10 text-blue-400 border border-blue-400/20" 
                    : "bg-green-400/10 text-green-400 border border-green-400/20"
                }`}>
                  {p.platform === "fl" ? "FL.ru" : "Kwork"}
                </span>
                {p.priceLimit && <span>💰 {p.priceLimit} ₽</span>}
                {p.maxDays && <span>⏱ {p.maxDays} дн.</span>}
                {p.userName && <span className="hidden sm:inline">👤 {p.userName}</span>}
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
                {p.analysis?.verdict === "worth" && p.analysis?.responseCost && (
                  <button
                    onClick={() => handleSubmitToKwork(p.id, p.kworkId, p.platform, p.url)}
                    className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    {copied ? "✅ Скопировано" : "📤 Отправить"}
                  </button>
                )}
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
          {hasMore && (
            <button
              onClick={() => setOffset((prev) => prev + 100)}
              disabled={loading}
              className="w-full py-3 text-sm text-[var(--muted)] border border-[var(--border)] rounded-lg hover:text-[var(--foreground)] hover:border-[var(--accent)]/30 transition-colors disabled:opacity-50"
            >
              {loading ? "Загрузка..." : "Загрузить ещё"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
