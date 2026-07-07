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
  skipReason: string | null;
  createdAt: string;
  analysis: { verdict: string; score: number; responseCost: string | null } | null;
}

export default function RejectedPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"skipped" | "blacklisted">("skipped");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/projects?status=${tab}&limit=100`)
      .then((r) => r.json())
      .then((d) => { setProjects(d.items || []); setLoading(false); });
  }, [tab]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">🗑 Отклонённые проекты</h1>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("skipped")}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            tab === "skipped"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
              : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          Пропущенные
        </button>
        <button
          onClick={() => setTab("blacklisted")}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            tab === "blacklisted"
              ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
              : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          В чёрном списке
        </button>
      </div>

      {loading ? (
        <p className="text-[var(--muted)]">Загрузка...</p>
      ) : projects.length === 0 ? (
        <p className="text-[var(--muted)]">Нет отклонённых проектов.</p>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium truncate">{p.name}</h3>
                    <a
                      href={`https://kwork.ru/projects/${p.kworkId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-[var(--muted)] hover:text-green-400 text-xs"
                    >
                      🔗
                    </a>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-sm text-[var(--muted)]">
                    {p.priceLimit && <span>💰 {p.priceLimit} ₽</span>}
                    {p.userName && <span>👤 {p.userName}</span>}
                  </div>
                  {p.skipReason && (
                    <div className="mt-1 text-xs text-red-400">{p.skipReason}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}