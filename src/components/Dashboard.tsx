import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoneyEUR, roundMoney } from "@/utils/moneyUtils";
import { allocateDebts } from "@/services/debtAllocationEngine";
import {
  evaluateRiskWarnings,
  summarizeCashflow,
} from "@/services/cashflowEngine";
import type { CashflowAppState } from "@/types/finance";
import {
  anchorDateFromYearMonth,
  shiftYearMonth,
  yearMonthLocal,
} from "@/utils/dateUtils";
import { cn } from "@/lib/utils";

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
  const [selectedMonth, setSelectedMonth] = useState<string>(() =>
    yearMonthLocal(),
  );
  const monthAnchorDate = useMemo(
    () => anchorDateFromYearMonth(selectedMonth),
    [selectedMonth],
  );

  const summary = useMemo(
    () => summarizeCashflow(state, { at: monthAnchorDate }),
    [state, monthAnchorDate],
  );

  const warnings = evaluateRiskWarnings(state);
  const debtAlloc = allocateDebts(
    state,
    summary.totalIncomeThisMonth,
    selectedMonth,
  );

  const monthLabelPretty = useMemo(() => {
    const d = anchorDateFromYearMonth(selectedMonth);
    const raw = new Intl.DateTimeFormat("sk-SK", {
      month: "long",
      year: "numeric",
    }).format(d);
    return raw.charAt(0).toLocaleUpperCase("sk-SK") + raw.slice(1);
  }, [selectedMonth]);

  const totalExpensesInMonth = roundMoney(
    summary.totalFixedExpensesThisMonth +
      summary.totalFlexibleExpensesThisMonth +
      summary.totalPlannedDebtPayments,
  );

  /** Čistý tok mesiaca (bez začínajúceho konta). */
  const monthlyBalance = roundMoney(
    summary.totalIncomeThisMonth - totalExpensesInMonth,
  );

  return (
    <section className="omega-panel">
      <div className="omega-card-metric mb-10 border-indigo-500/25 bg-indigo-950/25 px-6 py-6 md:px-8 md:py-7">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-200/90">
              Mesačný prehľad
            </h3>
            <p className="mt-1 text-sm text-slate-400">{monthLabelPretty}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedMonth((ym) => shiftYearMonth(ym, -1))
              }
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Predchádzajúci mesiac"
            >
              <ChevronLeft size={20} aria-hidden />
            </button>
            <input
              type="month"
              className="omega-input w-auto min-w-[11rem]"
              value={selectedMonth}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setSelectedMonth(v);
              }}
            />
            <button
              type="button"
              onClick={() =>
                setSelectedMonth((ym) => shiftYearMonth(ym, 1))
              }
              className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Ďalší mesiac"
            >
              <ChevronRight size={20} aria-hidden />
            </button>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-950/20 px-4 py-4">
            <div className="omega-card-metric-label text-emerald-200/80">
              Príjmy v mesiaci
            </div>
            <div className="mt-1 omega-card-metric-value text-emerald-300 tabular-nums">
              {formatMoneyEUR(summary.totalIncomeThisMonth)}
            </div>
          </div>
          <div className="rounded-2xl border border-red-500/15 bg-red-950/25 px-4 py-4">
            <div className="omega-card-metric-label text-red-200/80">
              Výdavky v mesiaci
            </div>
            <div className="mt-1 omega-card-metric-value text-red-200 tabular-nums">
              {formatMoneyEUR(totalExpensesInMonth)}
            </div>
          </div>
          <div
            className={cn(
              "rounded-2xl border px-4 py-4",
              monthlyBalance >= 0
                ? "border-white/15 bg-black/40"
                : "border-amber-500/20 bg-amber-950/20",
            )}
          >
            <div className="omega-card-metric-label text-slate-400">
              Zostatok pohybov{" "}
              <span className="font-normal text-slate-500">(príjem − výdavky)</span>
            </div>
            <div
              className={cn(
                "mt-1 omega-card-metric-value tabular-nums",
                monthlyBalance >= 0 ? "text-emerald-200" : "text-amber-200",
              )}
            >
              {formatMoneyEUR(monthlyBalance)}
            </div>
          </div>
        </div>
        <p className="mt-6 text-[11px] leading-relaxed text-slate-500">
          Zahŕňa zaevidované pohyby v kalendárnych dňoch vybraného mesiaca a doplnené o položky
          z&nbsp;mesačných opakovaní, ktoré sú v mesiaci ešte neuskutočnené bez prepojenia. Pri
          dlhoch používa plán splátok ako pri nižšom bloku výpočtu. Položky v stavoch{" "}
          <code className="rounded bg-black/40 px-1 text-indigo-200">skipped</code> /{" "}
          <code className="rounded bg-black/40 px-1 text-indigo-200">moved</code> sú vylúčené z
          prepočtu. Mraziaci režim zo stavu aplikácie ovplyvní výšku započítaných flexibilných
          výdavkov a sporenia.
        </p>
      </div>

      <p className="omega-eyebrow">Vitaj späť</p>
      <h2 className="omega-h1 mb-6">Prehľad</h2>
      <p className="omega-muted">
        Nastavenia zostatku a rezervy používajú rovnakú logiku obnovy ako blok nižšie. Detail
        motora sleduje kalendárny mesiac vyššie:&nbsp;<strong>{monthLabelPretty}</strong>. Stav{" "}
        <code className="text-indigo-300">skipped</code> /{" "}
        <code className="text-indigo-300">moved</code> sa do hotovosti nepočítajú.
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
          Motor — detail mesiaca
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
