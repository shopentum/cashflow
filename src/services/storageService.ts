import type {
  CashflowAppState,
  Debt,
  DebtStatus,
  DueFlexibility,
  PaymentPlanItem,
  PaymentType,
  PaymentTypeKind,
  PlanItemStatus,
  RepeatPattern,
  Transaction,
  TransactionDirection,
  TransactionStatus,
} from "@/types/finance";
import { createDefaultState, SCHEMA_VERSION } from "@/state/defaultState";
import { normalizeISODate, normalizeISODateTime, todayISO } from "@/utils/dateUtils";
import { clampPercent, safeFiniteMoney } from "@/utils/moneyUtils";

/**
 * localStorage kľúč zostáva rovnaký pri bumpnutí SCHEMA_VERSION,
 * aby používatelia nestratili dáta pri upgrade appky (migrácia rieši tvar).
 */
const STORAGE_KEY = "omega-cashflow-mvp-v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function newImportedId(prefix: string): string {
  try {
    return `${prefix}-${crypto.randomUUID()}`;
  } catch {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

const TX_DIR: ReadonlySet<TransactionDirection> = new Set(["income", "expense"]);
const TX_ST: ReadonlySet<TransactionStatus> = new Set([
  "planned",
  "done",
  "skipped",
  "moved",
]);
const PT_KIND: ReadonlySet<PaymentTypeKind> = new Set([
  "income",
  "fixed_expense",
  "flexible_expense",
  "debt",
  "savings",
  "other",
]);
const DEBT_ST: ReadonlySet<DebtStatus> = new Set(["active", "paused", "paid"]);
const DUE_FLEX: ReadonlySet<DueFlexibility> = new Set(["fixed", "flexible"]);
const REPEAT: ReadonlySet<RepeatPattern> = new Set(["none", "monthly", "weekly", "custom"]);
const PLAN_ST: ReadonlySet<PlanItemStatus> = new Set([
  "planned",
  "paid",
  "skipped",
  "moved",
]);

/** Schéma vyššia než v kóde — záloha z budúcej verzie. */
function schemaTooNew(v: number): boolean {
  return v > SCHEMA_VERSION;
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }
  if (typeof value === "string" && /^-?\d+$/.test(value.trim())) {
    return Math.max(0, parseInt(value, 10));
  }
  return Math.max(0, Math.floor(fallback));
}

/**
 * Migrácie surového JSON na aktuálnu SCHEMA_VERSION pred normalizáciou polí.
 * Príliš nová záloha (schema > SCHEMA_VERSION) → null.
 */
function migrateRawToLatest(raw: Record<string, unknown>): Record<string, unknown> | null {
  const vRaw = raw.schemaVersion;
  let v =
    typeof vRaw === "number" && Number.isFinite(vRaw) ? Math.floor(vRaw as number) : 1;
  if (v < 1) v = 1;
  if (schemaTooNew(v)) return null;

  let acc: Record<string, unknown> = { ...raw };

  while (v < SCHEMA_VERSION) {
    if (v === 1) {
      // v1 → v2: rovnaký tvar domény; miesto na budúce mapovanie polí.
      acc = { ...acc, schemaVersion: 2 };
      v = 2;
      continue;
    }
    return null;
  }

  acc.schemaVersion = SCHEMA_VERSION;
  return acc;
}

function parseString(v: unknown, fallback: string): string {
  if (typeof v === "string") return v;
  return fallback;
}

function normalizeTransaction(row: unknown): Transaction | null {
  if (!isRecord(row)) return null;
  const now = new Date().toISOString();
  const fallbackDate = todayISO();
  const title = parseString(row.title, "").trim();
  const amountRaw = safeFiniteMoney(row.amount, NaN);
  if (!Number.isFinite(amountRaw) || amountRaw < 0) return null;
  const direction = parseString(row.direction, "expense") as TransactionDirection;
  if (!TX_DIR.has(direction)) return null;
  const status = parseString(row.status, "planned") as TransactionStatus;
  if (!TX_ST.has(status)) return null;
  const id = typeof row.id === "string" && row.id.length > 0 ? row.id : newImportedId("tx");
  const typeId =
    typeof row.typeId === "string" && row.typeId.length > 0 ? row.typeId : newImportedId("ptype-orphan");
  const date = normalizeISODate(row.date, fallbackDate);
  const note = typeof row.note === "string" ? row.note : "";
  const createdAt = normalizeISODateTime(row.createdAt, now);
  const updatedAt = normalizeISODateTime(row.updatedAt, createdAt);
  return {
    id,
    title: title || "Bez názvu",
    amount: amountRaw,
    direction,
    typeId,
    date,
    status,
    note,
    createdAt,
    updatedAt,
  };
}

function normalizePaymentType(row: unknown): PaymentType | null {
  if (!isRecord(row)) return null;
  const now = new Date().toISOString();
  const name = parseString(row.name, "").trim();
  if (!name) return null;
  const kind = parseString(row.kind, "other") as PaymentTypeKind;
  if (!PT_KIND.has(kind)) return null;
  const id = typeof row.id === "string" && row.id.length > 0 ? row.id : newImportedId("ptype");
  const color = typeof row.color === "string" && row.color.length > 0 ? row.color : "#457b9d";
  const createdAt = normalizeISODateTime(row.createdAt, now);
  return { id, name, kind, color, createdAt };
}

function clampPriority(n: number): 1 | 2 | 3 | 4 | 5 {
  const x = Number.isFinite(n) ? Math.round(n) : 3;
  return (Math.min(5, Math.max(1, x)) || 3) as 1 | 2 | 3 | 4 | 5;
}

function normalizeDebt(row: unknown): Debt | null {
  if (!isRecord(row)) return null;
  const now = new Date().toISOString();
  const name = parseString(row.name, "").trim();
  if (!name) return null;
  const totalAmount = safeFiniteMoney(row.totalAmount, 0);
  if (totalAmount <= 0) return null;
  let remainingAmount = safeFiniteMoney(row.remainingAmount, totalAmount);
  remainingAmount = Math.min(Math.max(0, remainingAmount), totalAmount);
  const preferredMonthlyAmount = Math.max(
    0,
    safeFiniteMoney(row.preferredMonthlyAmount, 0),
  );
  let preferredMonthlyPercent: number | null = null;
  if (row.preferredMonthlyPercent === null || row.preferredMonthlyPercent === undefined) {
    preferredMonthlyPercent = null;
  } else if (typeof row.preferredMonthlyPercent === "number" && Number.isFinite(row.preferredMonthlyPercent)) {
    preferredMonthlyPercent = clampPercent(row.preferredMonthlyPercent, 0, 100);
  }
  const priority = clampPriority(typeof row.priority === "number" ? row.priority : 3);
  const dueFlexibility = parseString(row.dueFlexibility, "flexible") as DueFlexibility;
  if (!DUE_FLEX.has(dueFlexibility)) return null;
  const note = typeof row.note === "string" ? row.note : "";
  const status = parseString(row.status, "active") as DebtStatus;
  if (!DEBT_ST.has(status)) return null;
  const id = typeof row.id === "string" && row.id.length > 0 ? row.id : newImportedId("debt");
  const createdAt = normalizeISODateTime(row.createdAt, now);
  const updatedAt = normalizeISODateTime(row.updatedAt, createdAt);
  return {
    id,
    name,
    totalAmount,
    remainingAmount,
    preferredMonthlyAmount,
    preferredMonthlyPercent,
    priority,
    dueFlexibility,
    note,
    status,
    createdAt,
    updatedAt,
  };
}

function normalizePaymentPlanItem(row: unknown): PaymentPlanItem | null {
  if (!isRecord(row)) return null;
  const title = parseString(row.title, "").trim();
  const amount = safeFiniteMoney(row.amount, NaN);
  if (!Number.isFinite(amount) || amount < 0 || !title) return null;
  const repeat = parseString(row.repeat, "none") as RepeatPattern;
  if (!REPEAT.has(repeat)) return null;
  const status = parseString(row.status, "planned") as PlanItemStatus;
  if (!PLAN_ST.has(status)) return null;
  const id = typeof row.id === "string" && row.id.length > 0 ? row.id : newImportedId("plan");
  const typeId =
    typeof row.typeId === "string" && row.typeId.length > 0 ? row.typeId : newImportedId("ptype-orphan");
  const dueDate = normalizeISODate(row.dueDate, todayISO());
  const isFlexible = Boolean(row.isFlexible);
  const linkedDebtId =
    row.linkedDebtId === null || row.linkedDebtId === undefined
      ? null
      : typeof row.linkedDebtId === "string"
        ? row.linkedDebtId
        : null;
  const plannedOccurrences = parseNonNegativeInt(row.plannedOccurrences, 1);
  const actualOccurrences = parseNonNegativeInt(row.actualOccurrences, 0);
  let actualAmountOverride: number | null = null;
  if (typeof row.actualAmountOverride === "number" && Number.isFinite(row.actualAmountOverride)) {
    actualAmountOverride = safeFiniteMoney(row.actualAmountOverride, 0);
  } else if (row.actualAmountOverride === null || row.actualAmountOverride === undefined) {
    actualAmountOverride = null;
  }
  const note = typeof row.note === "string" ? row.note : "";
  return {
    id,
    title,
    amount,
    typeId,
    dueDate,
    repeat,
    isFlexible,
    linkedDebtId,
    plannedOccurrences,
    actualOccurrences,
    actualAmountOverride,
    status,
    note,
  };
}

function mapArray<T>(arr: unknown, mapRow: (v: unknown) => T | null): T[] {
  if (!Array.isArray(arr)) return [];
  const out: T[] = [];
  for (const item of arr) {
    const m = mapRow(item);
    if (m !== null) out.push(m);
  }
  return out;
}

/**
 * Rozparsuje uložený objekt cez migrácie → normalizuje polia podľa aktuálneho SCHEMA_VERSION.
 * Pri príliš novej zálohe vráti null (import); loadState potom použije default.
 */
function parseNormalizedState(raw: unknown): CashflowAppState | null {
  if (!isRecord(raw)) return null;
  const migrated = migrateRawToLatest(raw);
  if (!migrated) return null;

  const base = createDefaultState();

  const currentBalance = safeFiniteMoney(migrated.currentBalance, base.currentBalance);
  const safetyBuffer = Math.max(0, safeFiniteMoney(migrated.safetyBuffer, base.safetyBuffer));
  const debtBudgetPercent = clampPercent(
    safeFiniteMoney(migrated.debtBudgetPercent, base.debtBudgetPercent),
    0,
    100,
  );
  const emergencyFreeze =
    typeof migrated.emergencyFreeze === "boolean"
      ? migrated.emergencyFreeze
      : Boolean(migrated.emergencyFreeze);

  const transactions = mapArray(migrated.transactions, normalizeTransaction);
  const paymentTypes = mapArray(migrated.paymentTypes, normalizePaymentType);
  const debts = mapArray(migrated.debts, normalizeDebt);
  const paymentPlanItems = mapArray(migrated.paymentPlanItems, normalizePaymentPlanItem);

  return {
    schemaVersion: SCHEMA_VERSION,
    currentBalance,
    safetyBuffer,
    debtBudgetPercent,
    emergencyFreeze,
    transactions,
    paymentTypes,
    debts,
    paymentPlanItems,
  };
}

/** Nové kľúče v budúcom defaultState sa doplnia bez straty uložených dát. */
function mergeWithBase(canonical: CashflowAppState): CashflowAppState {
  const base = createDefaultState();
  return {
    ...base,
    ...canonical,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function loadState(): CashflowAppState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return createDefaultState();
    const parsed: unknown = JSON.parse(s);
    const canonical = parseNormalizedState(parsed);
    if (!canonical) return createDefaultState();
    return mergeWithBase(canonical);
  } catch {
    return createDefaultState();
  }
}

export function saveState(state: CashflowAppState): void {
  const payload: CashflowAppState = {
    ...state,
    schemaVersion: SCHEMA_VERSION,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function exportStateJson(state: CashflowAppState): string {
  return JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }, null, 2);
}

export function importStateJson(json: string): CashflowAppState | null {
  try {
    const parsed: unknown = JSON.parse(json);
    const canonical = parseNormalizedState(parsed);
    if (!canonical) return null;
    return mergeWithBase(canonical);
  } catch {
    return null;
  }
}

export { STORAGE_KEY };
