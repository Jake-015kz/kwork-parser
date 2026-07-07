"use client";

import { useEffect, useState, useCallback } from "react";
import { use } from "react";

interface ProjectDetail {
  id: number;
  kworkId: number;
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
  createdAt: string;
  analyses: any[];
  responses: any[];
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, []);

  const fetchProject = async () => {
    const res = await fetch(`/api/projects/${id}`);
    const data = await res.json();
    setProject(data);
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: parseInt(id) }),
    });
    await fetchProject();
    setAnalyzing(false);
  };

  const handleGenerate = async () => {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: parseInt(id) }),
    });
    if (res.ok) await fetchProject();
  };

  if (!project) {
    return <p className="text-[var(--muted)]">Загрузка...</p>;
  }

  const latestAnalysis = project.analyses?.[project.analyses.length - 1];
  const latestResponse = project.responses?.[project.responses.length - 1];

  return (
    <div className="max-w-4xl">
      <a href="/projects" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 inline-block">
        ← Назад к проектам
      </a>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-[var(--muted)]">
            {project.priceLimit && <span>💰 {project.priceLimit} ₽</span>}
            {project.maxDays && <span>⏱ {project.maxDays} дней</span>}
            {project.userName && <span>👤 {project.userName}</span>}
            {project.timeLeft && <span>⌛ {project.timeLeft}</span>}
            {project.viewsCount !== null && <span>👁 {project.viewsCount}</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <a
            href={`https://kwork.ru/projects/${project.kworkId}/view`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm inline-flex items-center"
          >
            🔗 На Kwork
          </a>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
          >
            {analyzing ? "Анализ..." : "🤖 Анализировать"}
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2 bg-[var(--accent)] text-black rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium"
          >
            ✏️ Сгенерировать отклик
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
          <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Описание</h2>
          <p className="text-sm whitespace-pre-wrap">{project.description || "Нет описания"}</p>
        </div>

        {project.userBadges && project.userBadges.length > 0 && (
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Бейджи заказчика</h2>
            <div className="flex flex-wrap gap-2">
              {(project.userBadges as string[]).map((badge, i) => (
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
                    onClick={() => copyToClipboard(latestAnalysis.responseText)}
                    className="text-xs px-2 py-1 rounded bg-[var(--accent)] text-black font-medium hover:bg-[var(--accent-hover)] transition-colors"
                  >
                    {copied ? "✅ Скопировано" : "📋 Копировать"}
                  </button>
                </div>
                {latestAnalysis.responseCost && (
                  <div className="text-sm mb-1">
                    <span className="text-[var(--muted)]">💰 Стоимость:</span>{' '}
                    <span className="font-medium">{latestAnalysis.responseCost}</span>
                  </div>
                )}
                {latestAnalysis.responseTimeline && (
                  <div className="text-sm mb-2">
                    <span className="text-[var(--muted)]">⏱ Срок:</span>{' '}
                    <span className="font-medium">{latestAnalysis.responseTimeline}</span>
                  </div>
                )}
                <pre className="text-sm whitespace-pre-wrap font-sans">{latestAnalysis.responseText}</pre>
              </div>
            )}
          </div>
        )}

        {latestResponse && (
          <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <h2 className="text-sm font-semibold text-[var(--muted)] mb-2 uppercase">Отклик</h2>
            <pre className="text-sm whitespace-pre-wrap font-sans">{latestResponse.content}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
