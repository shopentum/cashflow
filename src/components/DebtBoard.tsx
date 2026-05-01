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
  onDebtDueFlexibilityChange: (debtId: string, dueFlexibility: Debt["dueFlexibility"]) => void;
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
  onDebtDueFlexibilityChange,
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
    <section className="omega-panel">
      <h2 className="omega-h2">Tabuľa dlhov</h2>
      <p className="omega-muted">
        Hypotéku alebo úver v banke považuj za <strong className="text-slate-200">pevný</strong> záväzok — splátku nevieš
        rozpočtom „vynechať“. Dlh u rodiny ako „mamina“ nastav ako{" "}
        <strong className="text-slate-200">flexibilný</strong>: tento mesiac ho vieš navyšiť, znížiť alebo
        preskočiť.
      </p>

      <ul className="mb-12 space-y-6">
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
            <li
              key={d.id}
              className="space-y-4 rounded-3xl border border-white/10 bg-black/25 p-5 md:p-6"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <strong className="text-lg font-semibold text-white">{d.name}</strong>
                  <span className="mt-1 block text-sm text-slate-500">
                    Priorita {d.priority}
                    {" · "}
                    <span title="Pevný = hypo/banka podľa nastavenej sumy vo výpočte stále; flexibilný = mesačne voliteľné">
                      {d.dueFlexibility === "fixed" ? "Pevná splátka" : "Flexibilný"}
                    </span>
                  </span>
                </div>
              </div>
              <div
                className="h-2 overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-300 transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-slate-400">
                <span>Zostáva: <span className="font-semibold tabular-nums text-white">{formatMoneyEUR(d.remainingAmount)}</span></span>
                <span>Základ mes.: <span className="font-semibold tabular-nums text-white">{formatMoneyEUR(d.preferredMonthlyAmount)}</span></span>
              </div>

              <label className="block">
                <span className="omega-label">Úprava záväzku</span>
                <select
                  aria-label={`Typ splátky: ${d.name}`}
                  value={d.dueFlexibility}
                  onChange={(e) =>
                    onDebtDueFlexibilityChange(d.id, e.target.value as Debt["dueFlexibility"])
                  }
                  className="omega-input cursor-pointer max-w-md"
                >
                  <option value="fixed">Pevná splátka</option>
                  <option value="flexible">Flexibilná (mesačne zmeniteľná)</option>
                </select>
              </label>

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
                <p className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-xs leading-relaxed text-slate-500">
                  Pevná splátka sa v rozpočte berie ako stanovená mesačne (nie je rozumné ju v
                  aplikácii preskakovať). Skutočné platby sleduj ako transakcie typu dlh / alebo
                  ako fixný výdaj podľa svojho štýlu zápisu.
                </p>
              )}

              <div className="flex justify-end border-t border-white/10 pt-4">
                <button
                  type="button"
                  className="omega-btn-danger"
                  onClick={() => onDeleteDebt(d.id)}
                >
                  Odstrániť
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form
        className="space-y-6 rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8"
        onSubmit={addDebt}
      >
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Pridať dlh
        </h3>
        <label className="block">
          <span className="omega-label">Názov</span>
          <input
            name="name"
            placeholder="napr. Mamina alebo hypo"
            className="omega-input"
          />
        </label>
        <label className="block">
          <span className="omega-label">Flexibilita splátky</span>
          <select name="dueFlexibility" defaultValue="flexible" className="omega-input cursor-pointer">
            <option value="fixed">Pevná (hypotéka, bankový úver…)</option>
            <option value="flexible">Flexibilná (rodina — iná suma / vynechať mesiac)</option>
          </select>
        </label>
        <label className="block">
          <span className="omega-label">Celková suma</span>
          <input
            name="totalAmount"
            type="number"
            step="0.01"
            defaultValue={0}
            className="omega-input"
          />
        </label>
        <label className="block">
          <span className="omega-label">Zostáva</span>
          <input name="remainingAmount" type="number" step="0.01" className="omega-input" />
        </label>
        <label className="block">
          <span className="omega-label">Preferovaná mesačná splátka</span>
          <input
            name="preferredMonthlyAmount"
            type="number"
            step="0.01"
            defaultValue={0}
            className="omega-input"
          />
        </label>
        <label className="block">
          <span className="omega-label">Priorita (1–5)</span>
          <input
            name="priority"
            type="number"
            min={1}
            max={5}
            defaultValue={3}
            className="omega-input max-w-xs"
          />
        </label>
        <button type="submit" className="omega-btn-primary">
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
    const amt = Number.isFinite(parsed) && parsed >= 0 ? parsed : customStored;
    applyCustom(amt);
    setDraftCustom(String(roundMoney(Math.max(0, amt))));
  }

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-500/20 bg-indigo-950/25 p-4 md:p-5">
      <strong className="block text-xs font-bold uppercase tracking-widest text-indigo-300">
        Úmysel — {currentMonth}
      </strong>
      <label className="block">
        <span className="omega-label">Tento kalendárny mesiac</span>
        <select
          value={planChoice}
          onChange={(e) =>
            onSelectChange(e.target.value as FlexProps["planChoice"])
          }
          className="omega-input cursor-pointer"
        >
          <option value="default">Platiť podľa preferovanej splátky</option>
          <option value="skip">Tento mesiac neplatiť (0 € vo výpočte)</option>
          <option value="custom">Vlastná suma (viac alebo menej)</option>
        </select>
      </label>
      {planChoice === "custom" && (
        <label className="block">
          <span className="omega-label">Suma (€)</span>
          <input
            type="number"
            step="0.01"
            value={draftCustom}
            onChange={(e) => setDraftCustom(e.target.value)}
            onBlur={() => {
              const n = Number(String(draftCustom).replace(",", "."));
              if (Number.isFinite(n)) applyCustom(n);
            }}
            className="omega-input max-w-xs"
          />
        </label>
      )}
      <p className="text-xs leading-relaxed text-slate-500">
        Ak už máš splátku v transakciách (typ „dlh“), motor použije zápis z knihy —
        táto položka sa vtedy ráta ako skutočná suma namiesto plánu.
      </p>
    </div>
  );
}
