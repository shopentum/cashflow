import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { CashflowAppState, Debt, DebtMonthlyPlan } from "@/types/finance";
import { yearMonthLocal } from "@/utils/dateUtils";
import { formatMoneyEUR, roundMoney } from "@/utils/moneyUtils";

type Props = {
  state: CashflowAppState;
  onUpsertDebt: (d: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onDebtMonthPlan: (debtId: string, month: string, plan: DebtMonthlyPlan | null) => void;
};

let did = 0;
function newDebtId(): string {
  did += 1;
  return `debt-${Date.now()}-${did}`;
}

export function DebtBoard({
  state,
  onUpsertDebt,
  onDeleteDebt,
  onDebtMonthPlan,
}: Props) {
  const currentMonth = yearMonthLocal();

  function addDebt(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim() || "Dlžba";
    const totalAmount = Number(fd.get("totalAmount") ?? 0);
    const remainingAmount = Number(fd.get("remainingAmount") ?? totalAmount);
    const preferredMonthlyAmount = Number(fd.get("preferredMonthlyAmount") ?? 0);
    const priority = Number(fd.get("priority") ?? 3) as Debt["priority"];
    const dueFlexibility = String(
      fd.get("dueFlexibility") ?? "flexible",
    ) as Debt["dueFlexibility"];
    const now = new Date().toISOString();
    onUpsertDebt({
      id: newDebtId(),
      name,
      totalAmount,
      remainingAmount,
      preferredMonthlyAmount,
      preferredMonthlyPercent: null,
      priority,
      dueFlexibility,
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
      <p className="muted">
        Hypotéku alebo úver v banke považuj za <strong>pevný</strong> záväzok — splátku
        nevieš rozpočtom „vynechať“. Dlh u rodiny ako „mamina“ nastav ako{" "}
        <strong>flexibilný</strong>: tento mesiac ho vieš navyšiť, znížiť alebo preskočiť.
      </p>

      <ul className="debt-list">
        {state.debts.map((d) => {
          const pct =
            d.totalAmount > 0
              ? Math.round((1 - d.remainingAmount / d.totalAmount) * 100)
              : 0;

          const plan = (state.debtMonthlyPlans ?? []).find(
            (p) => p.debtId === d.id && p.month === currentMonth,
          );
          let planChoice: "default" | "skip" | "custom" = "default";
          if (plan?.mode === "skip") planChoice = "skip";
          if (plan?.mode === "custom") planChoice = "custom";

          return (
            <li key={d.id} className="debt-card">
              <div className="debt-head">
                <strong>{d.name}</strong>
                <span className="muted">
                  Priorita {d.priority}{" "}
                  ·{" "}
                  <span title="Pevný = hypo/banka podľa nastavenej sumy vo výpočte stále; flexibilný = mesačne voliteľné">
                    {d.dueFlexibility === "fixed" ? "Pevná splátka" : "Flexibilný"}
                  </span>
                </span>
              </div>
              <div className="progress" role="progressbar" aria-valuenow={pct}>
                <div className="progress-bar" style={{ width: `${pct}%` }} />
              </div>
              <div className="debt-meta">
                <span>Zostáva: {formatMoneyEUR(d.remainingAmount)}</span>
                <span>Základ mes.: {formatMoneyEUR(d.preferredMonthlyAmount)}</span>
              </div>

              {d.dueFlexibility === "flexible" && (
                <FlexibleMonthPlanControls
                  debtId={d.id}
                  currentMonth={currentMonth}
                  planChoice={planChoice}
                  preferred={d.preferredMonthlyAmount}
                  customStored={
                    plan?.mode === "custom" ? plan.customAmount : d.preferredMonthlyAmount
                  }
                  onDebtMonthPlan={onDebtMonthPlan}
                />
              )}

              {d.dueFlexibility === "fixed" && (
                <p className="muted subtle-line">
                  Pevná splátka sa v rozpočte berie ako stanovená mesačne (nie je rozumné ju
                  v aplikácii preskakovať). Skutočné platby sleduj ako transakcie typu dlh /
                  alebo ako fixný výdaj podľa svojho štýlu zápisu.
                </p>
              )}

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
          <input name="name" placeholder="napr. Mamina alebo hypo" />
        </label>
        <label className="field">
          <span>Flexibilita splátky</span>
          <select name="dueFlexibility" defaultValue="flexible">
            <option value="fixed">Pevná (hypotéka, bankový úver…)</option>
            <option value="flexible">Flexibilná (rodina — iná suma / vynechať mesiac)</option>
          </select>
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
          <span>Preferovaná mesačná splátka (základ plánu)</span>
          <input name="preferredMonthlyAmount" type="number" step="0.01" defaultValue={0} />
        </label>
        <label className="field">
          <span>Priorita pri rozpočte (1–5, 1 najprv pri cap)</span>
          <input name="priority" type="number" min={1} max={5} defaultValue={3} />
        </label>
        <button type="submit" className="btn primary">
          Pridať dlh
        </button>
      </form>
    </section>
  );
}

type FlexProps = {
  debtId: string;
  currentMonth: string;
  planChoice: "default" | "skip" | "custom";
  preferred: number;
  customStored: number;
  onDebtMonthPlan: (debtId: string, month: string, plan: DebtMonthlyPlan | null) => void;
};

function FlexibleMonthPlanControls({
  debtId,
  currentMonth,
  planChoice,
  preferred,
  customStored,
  onDebtMonthPlan,
}: FlexProps) {
  const [draftCustom, setDraftCustom] = useState(String(customStored));

  useEffect(() => {
    if (planChoice === "custom") {
      setDraftCustom(String(customStored));
    }
  }, [planChoice, customStored]);

  function applyClear(): void {
    onDebtMonthPlan(debtId, currentMonth, null);
    setDraftCustom(String(preferred));
  }

  function applySkip(): void {
    onDebtMonthPlan(debtId, currentMonth, {
      debtId,
      month: currentMonth,
      mode: "skip",
    });
    setDraftCustom(String(preferred));
  }

  function applyCustom(amount: number): void {
    onDebtMonthPlan(debtId, currentMonth, {
      debtId,
      month: currentMonth,
      mode: "custom",
      customAmount: roundMoney(Math.max(0, amount)),
    });
  }

  function onSelectChange(v: FlexProps["planChoice"]): void {
    if (v === "default") {
      applyClear();
      return;
    }
    if (v === "skip") {
      applySkip();
      return;
    }
    const parsed = Number(String(draftCustom).replace(",", "."));
    const amt =
      Number.isFinite(parsed) && parsed >= 0 ? parsed : customStored;
    applyCustom(amt);
    setDraftCustom(String(roundMoney(Math.max(0, amt))));
  }

  return (
    <div className="debt-month-plan stack-form bordered">
      <strong className="muted">Úmysel — {currentMonth}</strong>
      <label className="field">
        <span>Tento kalendárny mesiac</span>
        <select
          value={planChoice}
          onChange={(e) =>
            onSelectChange(e.target.value as FlexProps["planChoice"])
          }
        >
          <option value="default">Platiť podľa preferovanej splátky</option>
          <option value="skip">Tento mesiac neplatiť (0 € vo výpočte)</option>
          <option value="custom">Vlastná suma (viac alebo menej)</option>
        </select>
      </label>
      {planChoice === "custom" && (
        <label className="field">
          <span>Suma (€)</span>
          <input
            type="number"
            step="0.01"
            value={draftCustom}
            onChange={(e) => setDraftCustom(e.target.value)}
            onBlur={() => {
              const n = Number(String(draftCustom).replace(",", "."));
              if (Number.isFinite(n)) applyCustom(n);
            }}
          />
        </label>
      )}
      <p className="muted small-print">
        Ak už máš splátku v transakciách (typ „dlh“), motor použije zápis z knihy —
        táto položka sa vtedy ráta ako skutočná suma namiesto plánu.
      </p>
    </div>
  );
}
