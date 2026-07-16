"use client";

import { useEffect, useState, useCallback } from "react";
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
  hasContact: boolean;
  createdAt: string;
  analysis: { verdict: string; score: number; responseCost: string | null; responseText: string | null } | null;
}

export default function ProjectsTab() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [minBudget, setMinBudget] = useState("");
  const [maxBudget, setMaxBudget] = useState("");
  const [platform, setPlatform] = useState("all");
  const [hasContact, setHasContact] = useState(false);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
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
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [generatingAB, setGeneratingAB] = useState(false);
  const [abResult, setAbResult] = useState<{ variantA: { responseText: string; responseCost: string | null; responseTimeline: string | null }; variantB: { responseText: string; responseCost: string | null; responseTimeline: string | null } } | null>(null);
  const [latestGenerated, setLatestGenerated] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchProjects = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const isVerdict = STATUS_FILTERS.find((s) => s.key === filter)?.filter === "verdict";
      const params = new URLSearchParams({ limit: "100", offset: String(reset ? 0 : offset) });
      if (hasContact) {
        params.set("hasContact", "true");
      } else if (filter === "all") {
        // No status/verdict filter - fetch all
      } else if (isVerdict) {
        params.set("verdict", filter);
      } else {
        params.set("status", filter);
      }
      if (search) params.set("search", search);
      if (minBudget) params.set("minBudget", minBudget);
      if (maxBudget) params.set("maxBudget", maxBudget);
      if (platform !== "all") params.set("platform", platform);
      const res = await fetch(`/api/projects?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (reset) setProjects(data.items || []);
      else setProjects((prev) => [...prev, ...(data.items || [])]);
      setTotal(data.total || 0);
      setHasMore(offset + (data.items?.length || 0) < (data.total || 0));
      if (reset) setOffset(0);
    } catch (err) {
      console.error("Failed to load projects:", err);
      toast.error("Не удалось загрузить проекты");
      if (reset) {
        setProjects([]);
        setTotal(0);
        setHasMore(false);
      }
    } finally {
      setLoading(false);
    }
  }, [filter, search, minBudget, maxBudget, platform, hasContact, offset]);

  const handleStatusChange = async (id: number, status: string) => {
    await fetch("/api/projects/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchProjects(true);
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
      fetchProjects(true);
      toast.success("Проект проанализирован");
    } catch {
      toast.error("Сервер недоступен");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerateResponse = async (projectId: number) => {
    setGeneratingId(projectId);
    try {
      const res = await fetch("/api/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        toast.error(err.error || "Не удалось сгенерировать ответ");
        setGeneratingId(null);
        return;
      }
      const data = await res.json();
      if (data.responseText) {
        setLatestGenerated(data.responseText);
        await navigator.clipboard.writeText(data.responseText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        await openDetail(projectId);
        toast.success("Ответ сгенерирован и скопирован");
      }
    } catch {
      toast.error("Сервер недоступен");
    } finally {
      setGeneratingId(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleGenerateAB = async (projectId: number) => {
    setGeneratingAB(true);
    setAbResult(null);
    try {
      const res = await fetch("/api/generate-response", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, variant: "both" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Ошибка сервера" }));
        toast.error(err.error || "Не удалось сгенерировать A/B тест");
        setGeneratingAB(false);
        return;
      }
      const data = await res.json();
      if (data.variantA && data.variantB) {
        setAbResult(data);
        toast.success("A/B тест сгенерирован");
      }
    } catch {
      toast.error("Сервер недоступен");
    } finally {
      setGeneratingAB(false);
    }
  };

  const handleSelectVariant = async (variant: "a" | "b", text: string) => {
    if (!selectedId) return;
    try {
      await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedId, content: text, status: "queued", variant }),
      });
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success(`Вариант ${variant.toUpperCase()} выбран и скопирован`);
      setAbResult(null);
    } catch {
      toast.error("Не удалось сохранить вариант");
    }
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

  // Reset offset when filters change via wrappers
  const resetAndSetFilter = useCallback((f: string) => {
    setOffset(0);
    setProjects([]);
    setHasMore(false);
    setFilter(f);
  }, []);

  const resetAndSetSearch = useCallback((s: string) => {
    setOffset(0);
    setProjects([]);
    setHasMore(false);
    setSearch(s);
  }, []);

  const resetAndSetMinBudget = useCallback((v: string) => {
    setOffset(0);
    setProjects([]);
    setHasMore(false);
    setMinBudget(v);
  }, []);

  const resetAndSetMaxBudget = useCallback((v: string) => {
    setOffset(0);
    setProjects([]);
    setHasMore(false);
    setMaxBudget(v);
  }, []);

  const resetAndSetPlatform = useCallback((p: string) => {
    setOffset(0);
    setProjects([]);
    setHasMore(false);
    setPlatform(p);
  }, []);

  // Load projects when offset or filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProjects();
  }, [filter, search, minBudget, maxBudget, platform, hasContact, offset, fetchProjects]);

  if (selectedId && detail) {
    return (
      <ProjectDetail
        detail={detail}
        onBack={() => { setSelectedId(null); setDetail(null); setAbResult(null); setLatestGenerated(null); }}
        onAnalyze={handleAnalyze}
        onGenerateResponse={handleGenerateResponse}
        onGenerateAB={handleGenerateAB}
        analyzing={analyzing}
        abResult={abResult}
        onSelectVariant={handleSelectVariant}
        generating={generatingId !== null}
        generatingAB={generatingAB}
        latestGenerated={latestGenerated}
        onSubmitToKwork={handleSubmitToKwork}
        onCopyToClipboard={copyToClipboard}
        copied={copied}
      />
    );
  }

  return (
    <div>
      <ProjectFilters
        filter={filter} setFilter={resetAndSetFilter}
        search={search} setSearch={resetAndSetSearch}
        platform={platform} setPlatform={resetAndSetPlatform}
        minBudget={minBudget} setMinBudget={resetAndSetMinBudget}
        maxBudget={maxBudget} setMaxBudget={resetAndSetMaxBudget}
        hasContact={hasContact} setHasContact={setHasContact}
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
             onGenerateResponse={handleGenerateResponse}
             generatingId={generatingId}
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
