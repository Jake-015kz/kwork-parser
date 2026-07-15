"use client";

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
  hasContact: boolean;
  analysis: { verdict: string; score: number; responseCost: string | null } | null;
}

interface Props {
  project: Project;
  onSelect: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
  onSubmitToKwork: (projectId: number, kworkId: number, platform?: string, url?: string | null) => void;
  onGenerateResponse: (projectId: number) => void;
  generatingId: number | null;
  copied: boolean;
}

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

export default function ProjectCard({ project: p, onSelect, onStatusChange, onSubmitToKwork, onGenerateResponse, generatingId, copied }: Props) {
  const verdictBadge = (v: string | undefined, s: number | undefined) => {
    if (!v) return null;
    const color = v === "worth" ? "text-emerald-400" : v === "maybe" ? "text-yellow-400" : "text-red-400";
    return <span className={`text-xs ${color}`}>{v} ({s}/10)</span>;
  };

  return (
    <div className="p-4 rounded-lg border border-[var(--border)] bg-[var(--card)] transition-colors hover:border-[var(--accent)]/30">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelect(p.id)}
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
            {p.hasContact && <span className="text-xs text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">📱 контакты</span>}
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
             onClick={() => onSubmitToKwork(p.id, p.kworkId, p.platform, p.url)}
             className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
           >
             {copied ? "✅ Скопировано" : "📤 Отправить"}
           </button>
         )}
         {p.hasContact && !p.analysis?.verdict && (
           <button
             onClick={() => onGenerateResponse(p.id)}
             disabled={generatingId === p.id}
             className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
           >
             {generatingId === p.id ? "⏳ Генерация..." : "📝 Ответ"}
           </button>
         )}
        <button
          onClick={() => onStatusChange(p.id, "in_progress")}
          className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:border-blue-400 transition-colors"
        >
          ✅ Взял
        </button>
        <button
          onClick={() => onStatusChange(p.id, "skipped")}
          className="px-2 py-1 text-xs rounded border border-[var(--border)] hover:border-[var(--muted)] transition-colors"
        >
          ⏭ Пропустить
        </button>
      </div>
    </div>
  );
}
