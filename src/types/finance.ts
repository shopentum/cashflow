/** Core domain types — docs/mvp_cashflow_spec.md */

export type TransactionDirection = "income" | "expense";

export type TransactionStatus = "planned" | "done" | "skipped" | "moved";

export type PaymentTypeKind =
  | "income"
  | "fixed_expense"
  | "flexible_expense"
  | "debt"
  | "savings"
  | "other";

export type DebtStatus = "active" | "paused" | "paid";

export type DueFlexibility = "fixed" | "flexible";

export type RepeatPattern = "none" | "monthly" | "weekly" | "custom";

export type PlanItemStatus = "planned" | "paid" | "skipped" | "moved";

export interface Transaction {
  id: string;
  title: string;
  amount: number;
  direction: TransactionDirection;
  typeId: string;
  date: string;
  status: TransactionStatus;
  note: string;
  /** Ak je nastavené: príjem v danom mesiaci „splní“ projekciu šablóny pravidelného príjmu — motor nezaráta plán druhýkrát. */
  fulfillsRecurringIncomeId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Mesačne opakovaný príjem (náhľad v motore bez ďalšieho kliknutia mesiac čo mesiac).
 * Jednorázový príjem = obyčajná transakcia bez `fulfillsRecurringIncomeId`.
 */
export interface RecurringIncome {
  id: string;
  title: string;
  amount: number;
  /** Typ platby s `kind: income`. */
  typeId: string;
  /** Kalendárny deň výplaty (1–31, pri neplatných dňoch v mesiaci sa zráta na posledný deň mesiaca). */
  dayOfMonth: number;
  active: boolean;
  note: string;
  createdAt: string;
}

export interface PaymentType {
  id: string;
  name: string;
  kind: PaymentTypeKind;
  color: string;
  createdAt: string;
}

export interface Debt {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  preferredMonthlyAmount: number;
  preferredMonthlyPercent: number | null;
  priority: 1 | 2 | 3 | 4 | 5;
  dueFlexibility: DueFlexibility;
  note: string;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentPlanItem {
  id: string;
  title: string;
  amount: number;
  typeId: string;
  dueDate: string;
  repeat: RepeatPattern;
  isFlexible: boolean;
  linkedDebtId: string | null;
  plannedOccurrences: number;
  actualOccurrences: number;
  actualAmountOverride: number | null;
  status: PlanItemStatus;
  note: string;
}

/**
 * Mesačný zámer k flexibilnému dlhu (YYYY-MM).
 * Pevné dlhy (`dueFlexibility: fixed`) plán ignorujú — vždy sa berie preferovaná splátka.
 */
export type DebtMonthlyPlan =
  | { debtId: string; month: string; mode: "skip" }
  | { debtId: string; month: string; mode: "custom"; customAmount: number };

/** App state persisted in localStorage (MVP). */
export interface CashflowAppState {
  schemaVersion: number;
  currentBalance: number;
  safetyBuffer: number;
  debtBudgetPercent: number;
  emergencyFreeze: boolean;
  transactions: Transaction[];
  paymentTypes: PaymentType[];
  debts: Debt[];
  paymentPlanItems: PaymentPlanItem[];
  recurringIncomes: RecurringIncome[];
  /** Voliteľné mesačné úpravy len pre `dueFlexibility: flexible` dlhy. */
  debtMonthlyPlans: DebtMonthlyPlan[];
}
