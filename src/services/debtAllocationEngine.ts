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

function debtTargetAmount(d: Debt, incomeThisMonth: number): number {
  if (d.preferredMonthlyAmount > 0) {
    return roundMoney(d.preferredMonthlyAmount);
  }
  if (d.preferredMonthlyPercent != null && Number.isFinite(d.preferredMonthlyPercent)) {
    return roundMoney((incomeThisMonth * d.preferredMonthlyPercent) / 100);
  }
  return 0;
}

/**
 * Rozpočet splátok: strop `incomeThisMonth * debtBudgetPercent / 100`,
 * rozdelenie podľa priority (1 = najvyššia), postupné „čerpanie“ stropu.
 * Manuálne override v stave zatiaľ nie sú — pole `manualOverride` ostáva null.
 */
export function allocateDebts(
  state: CashflowAppState,
  incomeThisMonth: number,
): DebtAllocationResult {
  const cap = roundMoney((incomeThisMonth * state.debtBudgetPercent) / 100);
  const active = state.debts.filter((d: Debt) => d.status === "active");
  const sorted = [...active].sort((a, b) => a.priority - b.priority);

  let remainingCap = cap;
  const lines: DebtAllocationLine[] = sorted.map((d) => {
    const target = debtTargetAmount(d, incomeThisMonth);
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
