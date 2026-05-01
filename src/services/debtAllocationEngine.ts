import type { CashflowAppState, Debt } from "@/types/finance";
import { yearMonthLocal } from "@/utils/dateUtils";
import { roundMoney } from "@/utils/moneyUtils";

export interface DebtAllocationLine {
  debtId: string;
  name: string;
  fromBudget: number;
  manualOverride: number | null;
  applied: number;
}

export interface DebtAllocationResult {
  incomeThisMonth: number;
  debtBudgetCap: number;
  lines: DebtAllocationLine[];
  totalAllocated: number;
}

/** Základná preferovaná splátka zo záznamu dlhu (% alebo nominál). */
export function basePreferredInstallment(d: Debt, incomeThisMonth: number): number {
  if (d.preferredMonthlyAmount > 0) {
    return roundMoney(d.preferredMonthlyAmount);
  }
  if (d.preferredMonthlyPercent != null && Number.isFinite(d.preferredMonthlyPercent)) {
    return roundMoney((incomeThisMonth * d.preferredMonthlyPercent) / 100);
  }
  return 0;
}

/**
 * Cieľová suma zo stropu rozpočtu na dlhy pre jeden záväzok v danom YYYY-MM.
 * Pevné (`fixed`) záväzky ignorujú `debtMonthlyPlans`. Flexibilné berú mesačný plán používateľa.
 */
export function debtPlannedAmountForMonth(
  state: CashflowAppState,
  d: Debt,
  incomeThisMonth: number,
  calendarMonthKey: string,
): number {
  if (d.dueFlexibility === "fixed") {
    return basePreferredInstallment(d, incomeThisMonth);
  }
  const plans = state.debtMonthlyPlans ?? [];
  const row = plans.find(
    (p) => p.debtId === d.id && p.month === calendarMonthKey,
  );
  if (!row) {
    return basePreferredInstallment(d, incomeThisMonth);
  }
  if (row.mode === "skip") {
    return 0;
  }
  return roundMoney(Math.max(0, row.customAmount ?? 0));
}

/**
 * Rozpočet splátok podľa priority (1 = najvyššia), strop ako % mesačného príjmu.
 * `manualOverride` v riadku zatiaľ nie je v dátach — pole ostáva null.
 */
export function allocateDebts(
  state: CashflowAppState,
  incomeThisMonth: number,
  calendarMonthKey: string = yearMonthLocal(),
): DebtAllocationResult {
  const cap = roundMoney((incomeThisMonth * state.debtBudgetPercent) / 100);
  const active = state.debts.filter((d: Debt) => d.status === "active");
  const sorted = [...active].sort((a, b) => a.priority - b.priority);

  let remainingCap = cap;
  const lines: DebtAllocationLine[] = sorted.map((d) => {
    const target = debtPlannedAmountForMonth(
      state,
      d,
      incomeThisMonth,
      calendarMonthKey,
    );
    const applied = roundMoney(Math.min(target, Math.max(0, remainingCap)));
    remainingCap = roundMoney(remainingCap - applied);
    return {
      debtId: d.id,
      name: d.name,
      fromBudget: target,
      manualOverride: null,
      applied,
    };
  });

  const totalAllocated = roundMoney(lines.reduce((s, l) => s + l.applied, 0));
  return {
    incomeThisMonth,
    debtBudgetCap: cap,
    lines,
    totalAllocated,
  };
}
