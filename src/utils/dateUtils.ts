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
