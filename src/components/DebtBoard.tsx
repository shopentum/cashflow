import type { FormEvent } from "react";
import { formatMoneyEUR } from "@/utils/moneyUtils";

type Props = {
  state: CashflowAppState;
  onUpsertDebt: (d: Debt) => void;
  onDeleteDebt: (id: string) => void;
};

let did = 0;
function newDebtId(): string {
  did += 1;
  return `debt-${Date.now()}-${did}`;
}

export function DebtBoard({ state, onUpsertDebt, onDeleteDebt }: Props) {
  function addDebt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim() || "Dlžba";
    const totalAmount = Number(fd.get("totalAmount") ?? 0);
    const remainingAmount = Number(fd.get("remainingAmount") ?? totalAmount);
    const preferredMonthlyAmount = Number(fd.get("preferredMonthlyAmount") ?? 0);
    const priority = Number(fd.get("priority") ?? 3) as Debt["priority"];
    const now = new Date().toISOString();
    onUpsertDebt({
      id: newDebtId(),
      name,
      totalAmount,
      remainingAmount,
      preferredMonthlyAmount,
      preferredMonthlyPercent: null,
      priority,
      dueFlexibility: "flexible",
      note: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
    form.reset();
  }

  return (
    <section className="panel">
      <h2>Tabuľa dlhov</h2>
      <ul className="debt-list">
        {state.debts.map((d) => {
          const pct =
            d.totalAmount > 0
              ? Math.round((1 - d.remainingAmount / d.totalAmount) * 100)
              : 0;
          return (
            <li key={d.id} className="debt-card">
              <div className="debt-head">
                <strong>{d.name}</strong>
                <span className="muted">Priorita {d.priority}</span>
              </div>
              <div className="progress" role="progressbar" aria-valuenow={pct}>
                <div className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
              <div className="debt-meta">
                <span>Zostáva: {formatMoneyEUR(d.remainingAmount)}</span>
                <span>Plán mes.: {formatMoneyEUR(d.preferredMonthlyAmount)}</span>
              </div>
              <div className="debt-actions">
                <button
                  type="button"
                  className="btn ghost danger"
                  onClick={() => onDeleteDebt(d.id)}
                >
                  Odstrániť
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="stack-form bordered" onSubmit={addDebt}>
        <h3>Pridať dlh</h3>
        <label className="field">
          <span>Názov</span>
          <input name="name" />
        </label>
        <label className="field">
          <span>Celková suma</span>
          <input name="totalAmount" type="number" step="0.01" defaultValue={0} />
        </label>
        <label className="field">
          <span>Zostáva</span>
          <input name="remainingAmount" type="number" step="0.01" />
        </label>
        <label className="field">
          <span>Preferovaná mesačná splátka</span>
          <input name="preferredMonthlyAmount" type="number" step="0.01" defaultValue={0} />
        </label>
        <label className="field">
          <span>Priorita (1–5)</span>
          <input name="priority" type="number" min={1} max={5} defaultValue={3} />
        </label>
        <button type="submit" className="btn primary">
          Pridať dlh
        </button>
      </form>
    </section>
  );
}
