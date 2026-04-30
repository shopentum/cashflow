import type { CashflowAppState, Debt } from "@/types/finance";
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

/**
 * Skeleton: rozpočet z % príjmu; manuálne override ešte nie sú v stave.
 * Plná implementácia: docs/mvp_cashflow_spec.md (DEBT ALLOCATION ENGINE).
 */
export function allocateDebts(
  state: CashflowAppState,
  incomeThisMonth: number,
): DebtAllocationResult {
  const cap = roundMoney((incomeThisMonth * state.debtBudgetPercent) / 100);
  const active = state.debts.filter((d: Debt) => d.status === "active");
  const lines: DebtAllocationLine[] = active.map((d) => ({
    debtId: d.id,
    name: d.name,
    fromBudget: Math.min(d.preferredMonthlyAmount, cap / Math.max(active.length, 1)),
    manualOverride: null,
    applied: d.preferredMonthlyAmount,
  }));
  const totalAllocated = roundMoney(lines.reduce((s, l) => s + l.applied, 0));
  return {
    incomeThisMonth,
    debtBudgetCap: cap,
    lines,
    totalAllocated,
};
}
