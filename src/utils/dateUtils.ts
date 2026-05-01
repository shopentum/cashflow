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
