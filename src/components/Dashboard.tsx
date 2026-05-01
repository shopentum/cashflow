import { formatMoneyEUR } from "@/utils/moneyUtils";
import { allocateDebts } from "@/services/debtAllocationEngine";
import {
  evaluateRiskWarnings,
  summarizeCashflow,
} from "@/services/cashflowEngine";
import type { CashflowAppState } from "@/types/finance";
import { yearMonthLocal } from "@/utils/dateUtils";

type Props = {
  state: CashflowAppState;
  onChangeBalance: (value: number) => void;
  onChangeBuffer: (value: number) => void;
  onChangeDebtPercent: (value: number) => void;
  onToggleEmergencyFreeze: () => void;
};

export function Dashboard({
  state,
  onChangeBalance,
  onChangeBuffer,
  onChangeDebtPercent,
  onToggleEmergencyFreeze,
}: Props) {
  const summary = summarizeCashflow(state);
  const warnings = evaluateRiskWarnings(state);
  const debtAlloc = allocateDebts(
    state,
    summary.totalIncomeThisMonth,
    yearMonthLocal(),
  );

  return (
    <section className="omega-panel">
      <p className="omega-eyebrow">Vitaj späť</p>
      <h2 className="omega-h1 mb-6">Prehľad</h2>
      <p className="omega-muted">
        Hodnoty vychádzajú zo zostatku, rezervy a zaradených transakcií v aktuálnom
        kalendárnom mesiaci (stav <code className="text-indigo-300">skipped</code> /{" "}
        <code className="text-indigo-300">moved</code> sa do hotovosti nepočítajú).
      </p>

      <div className="mb-10 grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className="omega-label">Aktuálny zostatok</span>
          <input
            type="number"
            step="0.01"
            className="omega-input"
            value={state.currentBalance}
            onChange={(e) => onChangeBalance(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="omega-label">Bezpečná rezerva</span>
          <input
            type="number"
            step="0.01"
            className="omega-input"
            value={state.safetyBuffer}
            onChange={(e) => onChangeBuffer(Number(e.target.value))}
          />
        </label>
        <label className="block">
          <span className="omega-label">Roč./mes. rozpočet na dlhy (%)</span>
          <input
            type="number"
            step="1"
            min={0}
            max={100}
            className="omega-input"
            value={state.debtBudgetPercent}
            onChange={(e) => onChangeDebtPercent(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="omega-card-metric">
          <div className="omega-card-metric-label">Disponibilná hotovosť</div>
          <div className="omega-card-metric-value">
            {formatMoneyEUR(summary.availableCash)}
          </div>
        </div>
        <div className="omega-card-metric">
          <div className="omega-card-metric-label">Bezpečne použiteľné</div>
          <div className="omega-card-metric-value">{formatMoneyEUR(summary.safeToUseCash)}</div>
        </div>
        <div className="omega-card-metric">
          <div className="omega-card-metric-label">Zostáva po pláne</div>
          <div className="omega-card-metric-value">
            {formatMoneyEUR(summary.remainingAfterPlan)}
          </div>
        </div>
      </div>

      <div className="omega-card-metric mb-10 border-dashed opacity-95">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-500/40"
            checked={state.emergencyFreeze}
            onChange={onToggleEmergencyFreeze}
          />
          <span className="text-sm font-medium leading-relaxed text-slate-300">
            Mraziaci režim (kríza): vypnúť flexibilné výdavky v simulácii
          </span>
        </label>
      </div>

      <div className="mb-8 rounded-3xl border border-white/10 bg-black/25 p-6 md:p-8">
        <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-slate-400">
          Motor — mesiac
        </h3>
        <ul className="space-y-3 text-sm">
          <li className="flex justify-between gap-4 border-b border-white/10 pb-3">
            <span className="text-slate-500">Príjem (zarátaný)</span>
            <span className="font-medium tabular-nums text-white">
              {formatMoneyEUR(summary.totalIncomeThisMonth)}
            </span>
          </li>
          <li className="flex justify-between gap-4 border-b border-white/10 pb-3">
            <span className="text-slate-500">Fixné výdavky</span>
            <span className="font-medium tabular-nums text-white">
              {formatMoneyEUR(summary.totalFixedExpensesThisMonth)}
            </span>
          </li>
          <li className="flex justify-between gap-4 border-b border-white/10 pb-3">
            <span className="text-slate-500">Flexibilné / ostatné</span>
            <span className="font-medium tabular-nums text-white">
              {formatMoneyEUR(summary.totalFlexibleExpensesThisMonth)}
            </span>
          </li>
          <li className="flex justify-between gap-4 border-b border-white/10 pb-3">
            <span className="text-slate-500">Splátky (ledger alebo rozpočet dlhov)</span>
            <span className="font-medium tabular-nums text-white">
              {formatMoneyEUR(summary.totalPlannedDebtPayments)}
            </span>
          </li>
          <li className="flex justify-between gap-4 border-b border-white/10 pb-3">
            <span className="text-slate-500">Strop na dlhy (%)</span>
            <span className="font-medium tabular-nums text-white">
              {formatMoneyEUR(debtAlloc.debtBudgetCap)}
            </span>
          </li>
          <li className="flex justify-between gap-4 pt-1">
            <span className="text-slate-500">Likvidita — dní do rezervy</span>
            <span className="font-semibold tabular-nums text-indigo-200">
              {summary.daysToZero === null ? "—" : `${summary.daysToZero} dní`}
            </span>
          </li>
        </ul>
      </div>

      {warnings.length > 0 && (
        <ul className="space-y-2 rounded-3xl border border-amber-500/20 bg-amber-950/40 p-4">
          {warnings.map((w) => (
            <li
              key={w.id}
              className="text-sm text-amber-100"
              data-severity={w.severity}
            >
              {w.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
