import type { CashflowAppState, PaymentTypeKind, Transaction } from "@/types/finance";
import { allocateDebts } from "@/services/debtAllocationEngine";
import {
  calendarMonthBoundsLocal,
  dateToLocalISO,
  isDateInInclusiveRange,
  rollingWindowBoundsInclusive,
} from "@/utils/dateUtils";
import { roundMoney } from "@/utils/moneyUtils";

/** Dashboard výstupy — viz docs/mvp_cashflow_spec.md (CASHFLOW ENGINE). */
export interface CashflowSummary {
  totalIncomeThisMonth: number;
  totalFixedExpensesThisMonth: number;
  totalFlexibleExpensesThisMonth: number;
  totalPlannedDebtPayments: number;
  availableCash: number;
  safeToUseCash: number;
  remainingAfterPlan: number;
  daysToZero: number | null;
}

export interface CashflowHorizon {
  days7: CashflowSummary;
  days14: CashflowSummary;
  days30: CashflowSummary;
}

export interface CashflowTimelinePoint {
  date: string;
  label: string;
  balanceAfter: number;
}

export interface RiskWarning {
  id: string;
  severity: "info" | "caution" | "critical";
  message: string;
}

export interface SummarizeOptions {
  at?: Date;
}

const FLEX_KINDS = new Set<PaymentTypeKind>([
  "flexible_expense",
  "savings",
  "other",
]);

function kindOfType(
  state: CashflowAppState,
  typeId: string,
): PaymentTypeKind {
  const pt = state.paymentTypes.find((p) => p.id === typeId);
  return pt?.kind ?? "other";
}

function isCountedForCashflow(t: Transaction): boolean {
  return t.status !== "skipped" && t.status !== "moved";
}

function deltaForTxn(t: Transaction): number {
  return t.direction === "income" ? t.amount : -t.amount;
}

function incomeInRange(
  state: CashflowAppState,
  start: string,
  end: string,
): number {
  let s = 0;
  for (const t of state.transactions) {
    if (!isCountedForCashflow(t)) continue;
    if (t.direction !== "income") continue;
    if (!isDateInInclusiveRange(t.date, start, end)) continue;
    s += t.amount;
  }
  return roundMoney(s);
}

function rollupRangeParts(
  state: CashflowAppState,
  start: string,
  end: string,
  anchor: Date,
  emergencyFreeze: boolean,
): {
  income: number;
  fixed: number;
  flex: number;
  debtLedger: number;
  plannedDebt: number;
} {
  let income = 0;
  let fixed = 0;
  let flex = 0;
  let debtLedger = 0;

  for (const t of state.transactions) {
    if (!isCountedForCashflow(t)) continue;
    if (!isDateInInclusiveRange(t.date, start, end)) continue;
    const k = kindOfType(state, t.typeId);

    if (t.direction === "income") {
      income += t.amount;
      continue;
    }
    if (t.direction !== "expense") continue;

    if (k === "debt") {
      debtLedger += t.amount;
      continue;
    }

    if (k === "fixed_expense") {
      fixed += t.amount;
      continue;
    }

    if (FLEX_KINDS.has(k)) {
      if (
        emergencyFreeze &&
        (k === "flexible_expense" || k === "savings")
      ) {
        continue;
      }
      flex += t.amount;
      continue;
    }

    flex += t.amount;
  }

  income = roundMoney(income);
  fixed = roundMoney(fixed);
  flex = roundMoney(flex);
  debtLedger = roundMoney(debtLedger);

  const anchorBounds = calendarMonthBoundsLocal(anchor);
  const monthKey = anchorBounds.start.slice(0, 7);
  const incomeAnchorMonth = incomeInRange(
    state,
    anchorBounds.start,
    anchorBounds.end,
  );

  let plannedDebt =
    debtLedger > 0
      ? debtLedger
      : allocateDebts(state, incomeAnchorMonth, monthKey).totalAllocated;

  if (
    debtLedger === 0 &&
    plannedDebt > 0 &&
    (start !== anchorBounds.start || end !== anchorBounds.end)
  ) {
    const d0 = new Date(start + "T12:00:00");
    const d1 = new Date(end + "T12:00:00");
    const inclusiveDays =
      Math.floor((d1.getTime() - d0.getTime()) / (86400 * 1000)) + 1;
    const factor = Math.max(0, Math.min(1, inclusiveDays / 30));
    plannedDebt = roundMoney(plannedDebt * factor);
  }

  return {
    income,
    fixed,
    flex,
    debtLedger,
    plannedDebt,
  };
}

function summaryFromParts(
  state: CashflowAppState,
  r: ReturnType<typeof rollupRangeParts>,
  includeDaysToZero: boolean,
  anchorForBurn: Date,
): CashflowSummary {
  const outflows = roundMoney(r.fixed + r.flex + r.plannedDebt);
  const remainingAfterPlan = roundMoney(
    state.currentBalance + r.income - outflows,
  );
  const availableCash = roundMoney(remainingAfterPlan - state.safetyBuffer);
  const safeToUseCash = roundMoney(Math.max(0, availableCash));

  let daysToZero: number | null = null;
  if (includeDaysToZero) {
    const m = calendarMonthBoundsLocal(anchorForBurn);
    const mp = rollupRangeParts(
      state,
      m.start,
      m.end,
      anchorForBurn,
      state.emergencyFreeze,
    );
    const burnMonthly = roundMoney(mp.fixed + mp.flex + mp.plannedDebt);
    const dailyBurnApprox = burnMonthly > 0 ? burnMonthly / 30 : 0;
    const cushionExcess = roundMoney(
      state.currentBalance - state.safetyBuffer,
    );
    if (dailyBurnApprox > 1e-4 && cushionExcess > 0) {
      daysToZero = Math.floor(cushionExcess / dailyBurnApprox);
    } else if (cushionExcess <= 0 && dailyBurnApprox > 0) {
      daysToZero = 0;
    }
  }

  return {
    totalIncomeThisMonth: r.income,
    totalFixedExpensesThisMonth: r.fixed,
    totalFlexibleExpensesThisMonth: r.flex,
    totalPlannedDebtPayments: r.plannedDebt,
    availableCash,
    safeToUseCash,
    remainingAfterPlan,
    daysToZero,
  };
}

/**
 * Mesačný summar (lokálny kalendár).
 * `skipped` / `moved`: nezarátajú sa do pohybu peňazí.
 * `emergencyFreeze`: nevypínajú sa fixné a dlhy; nevypúsťajú flex + sporenie.
 */
export function summarizeCashflow(
  state: CashflowAppState,
  options?: SummarizeOptions,
): CashflowSummary {
  const anchor = options?.at ?? new Date();
  const { start, end } = calendarMonthBoundsLocal(anchor);
  const r = rollupRangeParts(state, start, end, anchor, state.emergencyFreeze);
  return summaryFromParts(state, r, true, anchor);
}

function summarizeRolling(
  state: CashflowAppState,
  anchor: Date,
  days: number,
): CashflowSummary {
  const { start, end } = rollingWindowBoundsInclusive(anchor, days);
  const r = rollupRangeParts(state, start, end, anchor, state.emergencyFreeze);
  return summaryFromParts(state, r, false, anchor);
}

export function summarizeHorizon(state: CashflowAppState): CashflowHorizon {
  const anchor = new Date();
  return {
    days7: summarizeRolling(state, anchor, 7),
    days14: summarizeRolling(state, anchor, 14),
    days30: summarizeRolling(state, anchor, 30),
  };
}

/** Od „dnes“ nahor chronologicky; zostatok po každej pohybu. */
export function buildTimeline(state: CashflowAppState): CashflowTimelinePoint[] {
  const today = dateToLocalISO(new Date());
  const future = state.transactions
    .filter((t) => isCountedForCashflow(t) && t.date >= today)
    .slice()
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      const ia = a.direction === "income" ? 0 : 1;
      const ib = b.direction === "income" ? 0 : 1;
      if (ia !== ib) return ia - ib;
      return a.id.localeCompare(b.id);
    });

  let balance = roundMoney(state.currentBalance);
  const pts: CashflowTimelinePoint[] = [];

  for (const t of future) {
    balance = roundMoney(balance + deltaForTxn(t));
    const sign = t.direction === "income" ? "+" : "−";
    pts.push({
      date: t.date,
      label: `${sign}${t.amount.toLocaleString("sk-SK")} € · ${t.title}`,
      balanceAfter: balance,
    });
  }

  return pts;
}

export function evaluateRiskWarnings(state: CashflowAppState): RiskWarning[] {
  const s = summarizeCashflow(state);
  const out: RiskWarning[] = [];

  if (s.availableCash < 0) {
    out.push({
      id: "deficit-after-buffer",
      severity: "critical",
      message:
        "Po zarátaní mesačného plánu ostáva menej než rezerva — dostupná hotovosť vyzerá v mínuse.",
    });
  }

  if (
    s.remainingAfterPlan < state.safetyBuffer &&
    s.remainingAfterPlan >= 0 &&
    !out.some((w) => w.id === "deficit-after-buffer")
  ) {
    out.push({
      id: "below-buffer-soft",
      severity: "caution",
      message: `Zostáva po pláne ${s.remainingAfterPlan.toLocaleString("sk-SK")} € pod nastaveným bufferom ${state.safetyBuffer.toLocaleString("sk-SK")} €.`,
    });
  }

  const totalSchedule =
    s.totalFixedExpensesThisMonth +
    s.totalFlexibleExpensesThisMonth +
    s.totalPlannedDebtPayments;
  if (
    totalSchedule >
    roundMoney(s.totalIncomeThisMonth + Math.max(state.currentBalance, 0))
  ) {
    out.push({
      id: "heavy-outflows",
      severity: "caution",
      message:
        "Mesačné výdavky a splátky zo zápisov prevyšujú spočítateľný rámec (zostatok + príjem v mesiaci) — uprav alebo rozložiť platby.",
    });
  }

  const anchor = new Date();
  const rw = rollingWindowBoundsInclusive(anchor, 7);
  const rwParts = rollupRangeParts(
    state,
    rw.start,
    rw.end,
    anchor,
    state.emergencyFreeze,
  );
  const netWeek = roundMoney(
    rwParts.income - rwParts.fixed - rwParts.flex - rwParts.plannedDebt,
  );
  if (netWeek < -1 && s.remainingAfterPlan >= state.safetyBuffer) {
    out.push({
      id: "seven-day-soft",
      severity: "info",
      message: `Nasledujúcich sedem dní v kalendári ukazuje čistý výdaj približne ${Math.abs(netWeek).toLocaleString("sk-SK")} €.`,
    });
  }

  return out;
}

export function simulateCashflow(draft: CashflowAppState): CashflowSummary {
  return summarizeCashflow(draft);
}
