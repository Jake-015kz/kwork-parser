"use client";

import { useEffect, useState } from "react";

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

export default function Home() {
  const [stats, setStats] = useState<Stats>({
    total: 0, new: 0, analyzed: 0, worth: 0, maybe: 0,
    skipped: 0, blacklisted: 0, inProgress: 0,
  });
  const [logs, setLogs] = useState<Log[]>([]);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/projects?limit=1000&status=all");
      const data = await res.json();
      if (data?.items) {
        const items = data.items;
        setStats({
          total: data.total,
          new: items.filter((p: any) => p.status === "new").length,
          analyzed: items.filter((p: any) => p.status === "analyzed").length,
          worth: items.filter((p: any) => p.analysis?.verdict === "worth").length,
          maybe: items.filter((p: any) => p.analysis?.verdict === "maybe").length,
          skipped: items.filter((p: any) => p.status === "skipped").length,
          blacklisted: items.filter((p: any) => p.status === "blacklisted").length,
          inProgress: items.filter((p: any) => p.status === "in_progress").length,
        });
      }
    };
    load();

    fetch("/api/stats").then(async (res) => {
      const d = await res.json();
      if (d?.logs) setLogs(d.logs);
    }).catch(() => {});
  }, []);

  const handleParse = async () => {
    setParsing(true);
    await fetch("/api/parse", { method: "POST" });
    setParsing(false);
    window.location.reload();
  };

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📊 Дашборд</h1>
        <button
          onClick={handleParse}
          disabled={parsing}
          className="px-4 py-2 bg-[var(--accent)] text-black font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50"
        >
          {parsing ? "Парсинг..." : "🔄 Запустить парсинг"}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)]">
            <div className="text-sm text-[var(--muted)] mb-1">{card.label}</div>
            <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4">
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