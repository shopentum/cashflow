import type { CashflowAppState } from "@/types/finance";

/** Zvýš pri zmene tvaru ukladaného stavu; migrácia v `storageService`. */
export const SCHEMA_VERSION = 3;

export function createDefaultState(): CashflowAppState {
  const now = new Date().toISOString();
  return {
    schemaVersion: SCHEMA_VERSION,
    currentBalance: 0,
    safetyBuffer: 200,
    debtBudgetPercent: 25,
    emergencyFreeze: false,
    transactions: [],
    paymentTypes: [
      {
        id: "type-income-default",
        name: "Výplata",
        kind: "income",
        color: "#2d6a4f",
        createdAt: now,
      },
      {
        id: "type-fixed-default",
        name: "Fixné výdavky",
        kind: "fixed_expense",
        color: "#1d3557",
        createdAt: now,
      },
    ],
    debts: [],
    paymentPlanItems: [],
    debtMonthlyPlans: [],
  };
}
