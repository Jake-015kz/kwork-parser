import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "Kwork Parser — Dashboard",
  description: "Мониторинг и анализ проектов Kwork с ИИ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <nav className="border-b border-[var(--border)] px-4 py-3 md:px-6">
          <div className="max-w-7xl mx-auto flex items-center gap-4 md:gap-6">
            <Link href="/" className="text-lg font-bold text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors">
              Kwork Parser
            </Link>
            <span className="text-xs text-[var(--muted)] hidden sm:inline">DeepSeek V3</span>
          </div>
        </nav>
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </body>
    </html>
  );
}
