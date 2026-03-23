import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

export function formatDateInput(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isValidDateString(str: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(str) && !isNaN(Date.parse(str));
}

/**
 * APP_TIMEZONE 환경변수에 지정된 타임존 기준으로 오늘 날짜를 "YYYY-MM-DD" 형식으로 반환한다.
 * 기본값: "Pacific/Auckland" (뉴질랜드)
 * 설정 예시 (.env.local): APP_TIMEZONE=Pacific/Auckland
 *
 * new Date().toISOString()은 항상 UTC 기준이므로 타임존이 다른 환경에서
 * 날짜가 어긋나는 문제를 이 함수로 방지한다.
 */
export function todayKST(): string {
  const tz = process.env.NEXT_PUBLIC_APP_TIMEZONE ?? "Pacific/Auckland";
  // "sv-SE" 로케일은 YYYY-MM-DD 형식을 반환한다
  return new Intl.DateTimeFormat("sv-SE", { timeZone: tz }).format(new Date());
}
