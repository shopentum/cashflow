import type { CashflowAppState } from "@/types/finance";
import { roundMoney } from "@/utils/moneyUtils";

/** Dashboard + engine outputs — rozšíri sa podľa špecifikácie. */
export interface CashflowSummary {
  totalIncomeThisMonth: number;
  totalFixedExpensesThisMonth: number;
  totalFlexibleExpensesThisMonth: number;
  totalPlannedDebtPayments: number;
  availableCash: number;
  safeToUseCash: number;
  remainingAfterPlan: number;
  /** Days until balance hits safety buffer at current burn — skeleton (null = nedá sa vypočítať). */
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

/**
 * Skeleton: používa aktuálny zostatok a bezpečnú rezervu.
 * Plná implementácia: docs/mvp_cashflow_spec.md (CASHFLOW ENGINE).
 */
export function summarizeCashflow(state: CashflowAppState): CashflowSummary {
  const buffer = state.safetyBuffer;
  const available = roundMoney(state.currentBalance - buffer);
  const safe = roundMoney(Math.max(0, available));
  return {
    totalIncomeThisMonth: 0,
    totalFixedExpensesThisMonth: 0,
    totalFlexibleExpensesThisMonth: 0,
    totalPlannedDebtPayments: 0,
    availableCash: roundMoney(state.currentBalance),
    safeToUseCash: safe,
    remainingAfterPlan: safe,
    daysToZero: null,
  };
}

export function summarizeHorizon(state: CashflowAppState): CashflowHorizon {
  const base = summarizeCashflow(state);
  return { days7: base, days14: base, days30: base };
}

export function buildTimeline(state: CashflowAppState): CashflowTimelinePoint[] {
  void state;
  return [];
}

export function evaluateRiskWarnings(state: CashflowAppState): RiskWarning[] {
  void state;
  return [];
}

/** Simulácia bez mutácie stavu — skeleton vracia kopy súhrnu. */
export function simulateCashflow(
  draft: CashflowAppState,
): CashflowSummary {
  return summarizeCashflow(draft);
}
