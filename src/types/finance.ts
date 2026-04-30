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
  createdAt: string;
  updatedAt: string;
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
}
