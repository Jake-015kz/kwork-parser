"use client";

import { useEffect, useState } from "react";

interface ResponseItem {
  id: number;
  projectId: number;
  content: string;
  sent: boolean;
  createdAt: string;
  project?: { name: string };
}

export default function ResponsesPage() {
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/responses")
      .then((r) => r.json())
      .then((d) => {
        setResponses(d.items || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">✏️ Сгенерированные отклики</h1>

      {loading ? (
        <p className="text-[var(--muted)]">Загрузка...</p>
      ) : responses.length === 0 ? (
        <p className="text-[var(--muted)]">Пока нет сгенерированных откликов.</p>
      ) : (
        <div className="space-y-4">
          {responses.map((r) => (
            <a
              key={r.id}
              href={`/projects/${r.projectId}`}
              className="block p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="text-sm font-medium">
                  Проект #{r.projectId}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
                  r.sent ? "text-green-400 bg-green-400/10" : "text-yellow-400 bg-yellow-400/10"
                }`}>
                  {r.sent ? "Отправлен" : "Не отправлен"}
                </span>
              </div>
              <pre className="text-sm whitespace-pre-wrap font-sans text-[var(--muted)] line-clamp-3">
                {r.content}
              </pre>
              <div className="text-xs text-[var(--muted)] mt-2">
                {new Date(r.createdAt).toLocaleString("ru-RU")}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
