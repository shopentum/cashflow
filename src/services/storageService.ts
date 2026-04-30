import type { CashflowAppState } from "@/types/finance";
import { createDefaultState, SCHEMA_VERSION } from "@/state/defaultState";

const STORAGE_KEY = "omega-cashflow-mvp-v1";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function parseState(raw: unknown): Partial<CashflowAppState> | null {
  if (!isRecord(raw)) return null;
  if (typeof raw.schemaVersion !== "number" || raw.schemaVersion < 1) return null;
  if (typeof raw.currentBalance !== "number") return null;
  if (!Array.isArray(raw.transactions)) return null;
  if (!Array.isArray(raw.paymentTypes)) return null;
  if (!Array.isArray(raw.debts)) return null;
  if (!Array.isArray(raw.paymentPlanItems)) return null;
  return raw as unknown as Partial<CashflowAppState>;
}

function mergeWithBase(partial: Partial<CashflowAppState>): CashflowAppState {
  const base = createDefaultState();
  return {
    ...base,
    ...partial,
    schemaVersion: SCHEMA_VERSION,
    emergencyFreeze: Boolean(partial.emergencyFreeze),
    safetyBuffer:
      typeof partial.safetyBuffer === "number" ? partial.safetyBuffer : base.safetyBuffer,
    debtBudgetPercent:
      typeof partial.debtBudgetPercent === "number"
        ? partial.debtBudgetPercent
        : base.debtBudgetPercent,
  };
}

export function loadState(): CashflowAppState {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (!s) return createDefaultState();
    const parsed: unknown = JSON.parse(s);
    const partial = parseState(parsed);
    if (!partial) return createDefaultState();
    return mergeWithBase(partial);
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
    const partial = parseState(parsed);
    if (!partial) return null;
    return mergeWithBase(partial);
  } catch {
    return null;
  }
}

export { STORAGE_KEY };
