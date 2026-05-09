const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Dátum transakcií / dueDate — YYYY-MM-DD alebo fallback. */
export function normalizeISODate(value: unknown, fallback: string): string {
  if (typeof value === "string" && ISO_DATE.test(value)) return value;
  return fallback;
}

/** ISO časová pečiatka do uloženia (createdAt/updatedAt). */
export function normalizeISODateTime(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return fallback;
  return new Date(t).toISOString();
}

export function addDaysISO(isoDate: string, days: number): string {
  const d = new Date(isoDate + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Lokálny dátum v tvare YYYY-MM-DD (bez časových pásov UTC). */
export function dateToLocalISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Inkluzívny kalendárny mesiac lokálnej časovej zóny. */
export function calendarMonthBoundsLocal(ref: Date = new Date()): {
  start: string;
  end: string;
} {
  const y = ref.getFullYear();
  const m = ref.getMonth();
  const start = `${y}-${pad(m + 1)}-01`;
  const last = new Date(y, m + 1, 0).getDate();
  const end = `${y}-${pad(m + 1)}-${pad(last)}`;
  return { start, end };
}

/** Inkluzívne okno [today, today + days - 1] v lokálnom kalendári. */
export function rollingWindowBoundsInclusive(
  ref: Date = new Date(),
  days: number,
): { start: string; end: string } {
  const clamped = Math.max(1, Math.floor(days));
  const today = dateToLocalISO(ref);
  const end = addDaysISO(today, clamped - 1);
  return { start: today, end };
}

export function isDateInInclusiveRange(
  date: string,
  start: string,
  end: string,
): boolean {
  return date >= start && date <= end;
}

/** YYYY-MM pre aktuálny (alebo zadaný) lokálny kalendárny mesiac. */
export function yearMonthLocal(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** Lokálny stred mesiaca pre `YYYY-MM` (fallback: dnes). */
export function anchorDateFromYearMonth(yearMonth: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim());
  if (!match) return new Date();
  const y = Number(match[1]);
  const mo = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) {
    return new Date();
  }
  return new Date(y, mo - 1, 15);
}

/** Slovenský názov kalendárneho mesiaca a roka pre `YYYY-MM`. */
export function formatYearMonthLabelSk(yearMonth: string): string {
  const d = anchorDateFromYearMonth(yearMonth);
  const raw = new Intl.DateTimeFormat("sk-SK", {
    month: "long",
    year: "numeric",
  }).format(d);
  return raw.charAt(0).toLocaleUpperCase("sk-SK") + raw.slice(1);
}

/** Posun `YYYY-MM` o `deltaMonths` v lokálnom kalendári. */
export function shiftYearMonth(yearMonth: string, deltaMonths: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(yearMonth.trim());
  if (!match) return yearMonthLocal();
  const y = Number(match[1]);
  const mo = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) {
    return yearMonthLocal();
  }
  const d = new Date(y, mo - 1 + deltaMonths, 15);
  return yearMonthLocal(d);
}

/**
 * Konkrétny kalendárny deň `dayOfMonth` v mesiaci určenom začiatkom (napr. 2026-05-01).
 * Ak deň vyjde mimo počtu dní v mesiaci, použije sa posledný deň mesiaca.
 */
export function dayInCalendarMonth(monthStartISO: string, dayOfMonth: number): string {
  const match = /^(\d{4})-(\d{2})-\d{2}$/.exec(monthStartISO);
  if (!match) return monthStartISO;
  const y = Number(match[1]);
  const mo = Number(match[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo)) return monthStartISO;
  const lastDay = new Date(y, mo, 0).getDate();
  const day = Math.min(Math.max(1, Math.floor(dayOfMonth)), lastDay);
  return `${match[1]}-${match[2]}-${pad(day)}`;
}
