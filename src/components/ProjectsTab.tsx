"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buildProjectUrl } from "@/lib/utils";
import ProjectFilters, { STATUS_FILTERS } from "./ProjectFilters";
import ProjectCard from "./ProjectCard";
import ProjectDetail from "./ProjectDetail";

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
  const [detail, setDetail] = useState<{
    id: number; kworkId: number; platform: string; categoryId: number;
    name: string; description: string; priceLimit: string | null; maxDays: number | null;
    userName: string | null; userBadges: string[]; userHiredPercent: number | null;
    userWantsCount: number | null; status: string; viewsCount: number | null;
    timeLeft: string | null; dateCreate: string | null; dateExpire: string | null;
    url: string | null; createdAt: string;
    analyses: { id: number; verdict: string; score: number; reasoning: Record<string, string> | null;
      responseText: string | null; responseCost: string | null; responseTimeline: string | null; createdAt: string; }[];
  } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchProjects = async () => {
    setLoading(true);
    const isVerdict = STATUS_FILTERS.find((s) => s.key === filter)?.filter === "verdict";
    const params = new URLSearchParams({ limit: "100", offset: "0" });
    if (isVerdict) params.set("verdict", filter);
    else params.set("status", filter);
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
      setDetail(await res.json());
    } catch {
      setDetail(null);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedId) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        toast.error(err.error || "Не удалось проанализировать проект");
        setAnalyzing(false);
        return;
      }
      await openDetail(selectedId);
      fetchProjects();
      toast.success("Проект проанализирован");
    } catch {
      toast.error("Сервер недоступен");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleSubmitToKwork = async (projectId: number, kworkId: number, platform?: string, url?: string | null) => {
    try {
      const res = await fetch(`/api/responses?projectId=${projectId}`);
      if (!res.ok) {
        toast.error("Отклик ещё не сгенерирован. Нажмите «Анализировать»");
        return;
      }
      const data = await res.json();
      if (data.responseText) {
        await navigator.clipboard.writeText(data.responseText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Отклик скопирован в буфер обмена");
        if (platform === "fl" && url) window.open(url, "_blank");
        else window.open(buildProjectUrl(url, platform || "kwork", kworkId), "_blank");
      } else {
        toast.error("Текст отклика пуст. Попробуйте сгенерировать заново");
      }
    } catch {
      toast.error("Не удалось получить отклик");
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
      if (isVerdict) params.set("verdict", filter);
      else params.set("status", filter);
      if (search) params.set("search", search);
      if (minBudget) params.set("minBudget", minBudget);
      if (maxBudget) params.set("maxBudget", maxBudget);
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/projects?${params}`);
      const data = await res.json();
      if (offset === 0) setProjects(data.items || []);
      else setProjects((prev) => [...prev, ...(data.items || [])]);
      setTotal(data.total || 0);
      setHasMore(offset + (data.items?.length || 0) < (data.total || 0));
      setLoading(false);
    };
    load();
  }, [filter, search, minBudget, maxBudget, platform, offset]);

  if (selectedId && detail) {
    return (
      <ProjectDetail
        detail={detail}
        onBack={() => { setSelectedId(null); setDetail(null); }}
        onAnalyze={handleAnalyze}
        analyzing={analyzing}
        onSubmitToKwork={handleSubmitToKwork}
        onCopyToClipboard={copyToClipboard}
        copied={copied}
      />
    );
  }

  return (
    <div>
      <ProjectFilters
        filter={filter} setFilter={setFilter}
        search={search} setSearch={setSearch}
        platform={platform} setPlatform={setPlatform}
        minBudget={minBudget} setMinBudget={setMinBudget}
        maxBudget={maxBudget} setMaxBudget={setMaxBudget}
      />

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
            <ProjectCard
              key={p.id}
              project={p}
              onSelect={openDetail}
              onStatusChange={handleStatusChange}
              onSubmitToKwork={handleSubmitToKwork}
              copied={copied}
            />
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
