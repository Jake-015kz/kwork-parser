"use client";

import { useEffect, useState } from "react";
import { buildProjectUrl } from "@/lib/utils";

interface ResponseItem {
  id: number;
  projectId: number;
  content: string;
  status: string;
  kworkOfferId: string | null;
  sent: boolean;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  rejectedAt: string | null;
  rejectReason: string | null;
  createdAt: string;
  projectName: string;
  kworkId: number;
  url: string | null;
  platform: string;
}

const STATUS_FILTERS = [
  { key: "all", label: "Все" },
  { key: "queued", label: "Очередь" },
  { key: "submitted", label: "Отправлено" },
  { key: "viewed", label: "Просмотрено" },
  { key: "responded", label: "Ответили" },
  { key: "rejected", label: "Отклонено" },
];

const STATUS_COLORS: Record<string, string> = {
  queued: "text-yellow-400 bg-yellow-400/10",
  submitted: "text-blue-400 bg-blue-400/10",
  viewed: "text-purple-400 bg-purple-400/10",
  responded: "text-green-400 bg-green-400/10",
  rejected: "text-red-400 bg-red-400/10",
};

const STATUS_LABELS: Record<string, string> = {
  queued: "Очередь",
  submitted: "Отправлено",
  viewed: "Просмотрено",
  responded: "Ответили",
  rejected: "Отклонено",
};

function formatResponseTime(sentAt: string | null, respondedAt: string | null): string | null {
  if (!sentAt || !respondedAt) return null;
  const diff = new Date(respondedAt).getTime() - new Date(sentAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}д ${hours % 24}ч`;
  if (hours > 0) return `${hours}ч`;
  const minutes = Math.floor(diff / (1000 * 60));
  return `${minutes}мин`;
}

function getResponseTimeColor(sentAt: string | null, respondedAt: string | null): string {
  if (!sentAt || !respondedAt) return "";
  const diff = new Date(respondedAt).getTime() - new Date(sentAt).getTime();
  const hours = diff / (1000 * 60 * 60);
  if (hours < 24) return "text-green-400";
  if (hours < 72) return "text-yellow-400";
  return "text-red-400";
}

export default function ResponsesTab() {
  const [responses, setResponses] = useState<ResponseItem[]>([]);
  const [filter, setFilter] = useState("all");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/responses${filter !== "all" ? `?status=${filter}` : ""}`)
      .then((res) => res.json())
      .then((data) => {
        setResponses(data.items || []);
      });
  }, [filter]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const updateStatus = async (id: number, status: string) => {
    await fetch("/api/responses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    // Refetch on filter change
    void fetch(`/api/responses${filter !== "all" ? `?status=${filter}` : ""}`)
      .then((res) => res.json())
      .then((data) => setResponses(data.items || []));
  };

  const handleSubmitToKwork = (response: ResponseItem) => {
    navigator.clipboard.writeText(response.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    window.open(buildProjectUrl(response.url, response.platform, response.kworkId), "_blank");
  };

  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
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

      {responses.length === 0 ? (
        <p className="text-[var(--muted)]">Нет откликов в очереди.</p>
      ) : (
        <div className="space-y-3">
          {responses.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:border-[var(--accent)]/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="font-medium text-sm">{r.projectName}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">
                    {r.projectId && (
                      <span>Проект #{r.projectId} | </span>
                    )}
                    {new Date(r.createdAt).toLocaleString("ru-RU")}
                    {r.sentAt && <span> | Отправлено: {new Date(r.sentAt).toLocaleString("ru-RU")}</span>}
                    {r.sentAt && r.respondedAt && (
                      <span className={`ml-1 ${getResponseTimeColor(r.sentAt, r.respondedAt)}`}>
                        | ⏱ {formatResponseTime(r.sentAt, r.respondedAt)}
                      </span>
                    )}
                    {r.sentAt && r.rejectedAt && (
                      <span className="ml-1 text-red-400">
                        | ❌ {formatResponseTime(r.sentAt, r.rejectedAt)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[r.status] || "text-[var(--muted)]"}`}>
                    {STATUS_LABELS[r.status] || r.status}
                  </span>
                </div>
              </div>

              <pre className="text-sm whitespace-pre-wrap font-sans text-[var(--muted)] line-clamp-3 mb-3">
                {r.content}
              </pre>

              <div className="flex gap-2">
                {r.status === "queued" && (
                  <>
                    <button
                      onClick={() => handleSubmitToKwork(r)}
                      className="px-3 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                      {copied ? "✅ Скопировано" : "📤 Отправить"}
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, "submitted")}
                      className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:border-blue-400 transition-colors"
                    >
                      ✅ Отметить отправленным
                    </button>
                  </>
                )}
                {r.status === "submitted" && (
                  <button
                    onClick={() => updateStatus(r.id, "viewed")}
                    className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:border-purple-400 transition-colors"
                  >
                    👁 Просмотрено
                  </button>
                )}
                {r.status === "viewed" && (
                  <button
                    onClick={() => updateStatus(r.id, "responded")}
                    className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:border-green-400 transition-colors"
                  >
                    ✅ Ответили
                  </button>
                )}
                {r.status !== "rejected" && r.status !== "responded" && (
                  <button
                    onClick={() => updateStatus(r.id, "rejected")}
                    className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:border-red-400 transition-colors"
                  >
                    ❌ Отклонено
                  </button>
                )}
                <button
                  onClick={() => copyToClipboard(r.content)}
                  className="px-3 py-1 text-xs rounded border border-[var(--border)] hover:border-[var(--accent)] transition-colors"
                >
                  📋 Копировать
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
