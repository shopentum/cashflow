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
    <section className="panel">
      <h2>Simulácia (koncept)</h2>
      <p className="muted">
        Úpravy sa neukladajú — len náhľad. Plná simulácia podľa špecifikácie
        príde neskôr (presuny, preskočenie, vlastné sumy).
      </p>
      <label className="field">
        <span>Čo ak tento extra výdaj? (EUR)</span>
        <input
          type="number"
          step="0.01"
          value={deltaExpense}
          onChange={(e) => setDeltaExpense(Number(e.target.value))}
        />
      </label>
      <div className="card-row">
        <div className="card subtle">
          <div className="card-label">Bez zmeny — zostáva po pláne</div>
          <div className="card-value">{formatMoneyEUR(baseline.remainingAfterPlan)}</div>
        </div>
        <div className="card subtle">
          <div className="card-label">So simuláciou</div>
          <div className="card-value">{formatMoneyEUR(sim.remainingAfterPlan)}</div>
        </div>
      </div>
    </section>
  );
}
