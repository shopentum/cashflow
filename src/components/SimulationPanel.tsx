import { simulateCashflow } from "@/services/cashflowEngine";
import type { CashflowAppState } from "@/types/finance";
import { formatMoneyEUR } from "@/utils/moneyUtils";
import { useMemo, useState } from "react";

type Props = {
  state: CashflowAppState;
};

export function SimulationPanel({ state }: Props) {
  const [deltaExpense, setDeltaExpense] = useState(0);

  const draft: CashflowAppState = useMemo(
    () => ({
      ...state,
      currentBalance: state.currentBalance - deltaExpense,
    }),
    [state, deltaExpense],
  );

  const sim = simulateCashflow(draft);
  const baseline = simulateCashflow(state);

  return (
    <section className="omega-panel">
      <h2 className="omega-h2">Simulácia (koncept)</h2>
      <p className="omega-muted">
        Úpravy sa neukladajú — len náhľad. Plná simulácia podľa špecifikácie príde
        neskôr (presuny, preskočenie, vlastné sumy).
      </p>
      <label className="mb-8 block">
        <span className="omega-label">Čo ak tento extra výdaj? (EUR)</span>
        <input
          type="number"
          step="0.01"
          value={deltaExpense}
          onChange={(e) => setDeltaExpense(Number(e.target.value))}
          className="omega-input max-w-sm"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="omega-card-metric border-dashed">
          <div className="omega-card-metric-label">Bez zmeny — zostáva po pláne</div>
          <div className="omega-card-metric-value">
            {formatMoneyEUR(baseline.remainingAfterPlan)}
          </div>
        </div>
        <div className="omega-card-metric border-dashed border-indigo-500/25">
          <div className="omega-card-metric-label">So simuláciou</div>
          <div className="omega-card-metric-value text-indigo-200">
            {formatMoneyEUR(sim.remainingAfterPlan)}
          </div>
        </div>
      </div>
    </section>
  );
}
