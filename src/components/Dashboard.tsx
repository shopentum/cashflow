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
    <section className="panel">
      <h2>Prehľad</h2>
      <p className="muted">
        Hodnoty vychádzajú zo zostatku, rezervy a zaradených transakcií v aktuálnom
        kalendárnom mesiaci (stav <code className="muted">skipped</code> /{" "}
        <code className="muted">moved</code> sa do hotovosti nepočítajú).
      </p>

      <div className="grid metrics">
        <label className="field">
          <span>Aktuálny zostatok</span>
          <input
            type="number"
            step="0.01"
            value={state.currentBalance}
            onChange={(e) => onChangeBalance(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Bezpečná rezerva</span>
          <input
            type="number"
            step="0.01"
            value={state.safetyBuffer}
            onChange={(e) => onChangeBuffer(Number(e.target.value))}
          />
        </label>
        <label className="field">
          <span>Roč./mes. rozpočet na dlhy (% príjmu)</span>
          <input
            type="number"
            step="1"
            min={0}
            max={100}
            value={state.debtBudgetPercent}
            onChange={(e) => onChangeDebtPercent(Number(e.target.value))}
          />
        </label>
      </div>

      <div className="card-row">
        <div className="card">
          <div className="card-label">Disponibilná hotovosť</div>
          <div className="card-value">{formatMoneyEUR(summary.availableCash)}</div>
        </div>
        <div className="card">
          <div className="card-label">Bezpečne použiteľné</div>
          <div className="card-value">{formatMoneyEUR(summary.safeToUseCash)}</div>
        </div>
        <div className="card">
          <div className="card-label">Zostáva po pláne</div>
          <div className="card-value">{formatMoneyEUR(summary.remainingAfterPlan)}</div>
        </div>
      </div>

      <div className="card subtle">
        <label className="inline-check">
          <input
            type="checkbox"
            checked={state.emergencyFreeze}
            onChange={onToggleEmergencyFreeze}
          />
          <span>Mraziaci režim (kríza): vypnúť flexibilné výdavky v simulácii</span>
        </label>
      </div>

      <div className="subsection">
        <h3>Motor — mesiac</h3>
        <ul className="kv">
          <li>
            <span>Príjem (zarátaný)</span>
            <span>{formatMoneyEUR(summary.totalIncomeThisMonth)}</span>
          </li>
          <li>
            <span>Fixné výdavky</span>
            <span>{formatMoneyEUR(summary.totalFixedExpensesThisMonth)}</span>
          </li>
          <li>
            <span>Flexibilné / ostatné</span>
            <span>{formatMoneyEUR(summary.totalFlexibleExpensesThisMonth)}</span>
          </li>
          <li>
            <span>Splátky (ledger alebo rozpočet dlhov)</span>
            <span>{formatMoneyEUR(summary.totalPlannedDebtPayments)}</span>
          </li>
          <li>
            <span>Strop na dlhy (%)</span>
            <span>{formatMoneyEUR(debtAlloc.debtBudgetCap)}</span>
          </li>
          <li>
            <span>Likvidita — dní do rezervy (hrubý odhad)</span>
            <span>
              {summary.daysToZero === null ? "—" : `${summary.daysToZero} dní`}
            </span>
          </li>
        </ul>
      </div>

      {warnings.length > 0 && (
        <ul className="warnings">
          {warnings.map((w) => (
            <li key={w.id} data-severity={w.severity}>
              {w.message}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
