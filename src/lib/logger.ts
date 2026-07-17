/**
 * Централизованный логгер. Вместо разбросанных console.error/console.log
 * в роутах — единый вход, чтобы можно было переключить уровень/транспорт
 * (например, внешний сервис) без правок по всему коду.
 */

type LogLevel = "info" | "warn" | "error" | "debug";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const currentLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel) ||
  (process.env.NODE_ENV === "production" ? "info" : "debug");

function emit(level: LogLevel, scope: string, args: unknown[]) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return;
  const prefix = `[${level.toUpperCase()}] ${scope}`;
  if (level === "error") {
    console.error(prefix, ...args);
  } else if (level === "warn") {
    console.warn(prefix, ...args);
  } else {
    console.log(prefix, ...args);
  }
}

export const logger = {
  info: (scope: string, ...args: unknown[]) => emit("info", scope, args),
  warn: (scope: string, ...args: unknown[]) => emit("warn", scope, args),
  error: (scope: string, ...args: unknown[]) => emit("error", scope, args),
  debug: (scope: string, ...args: unknown[]) => emit("debug", scope, args),
};
