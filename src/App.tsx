import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LineChart,
  PlusCircle,
  Repeat2,
  Tags,
  Trash2,
  WalletCards,
} from "lucide-react";
import { CashflowTimeline } from "@/components/CashflowTimeline";
import { Dashboard } from "@/components/Dashboard";
import { DebtBoard } from "@/components/DebtBoard";
import { SimulationPanel } from "@/components/SimulationPanel";
import { RecurringMovementPanel } from "@/components/RecurringMovementPanel";
import { TransactionFormModal, type RepeatMode } from "@/components/TransactionForm";
import { TypeManager } from "@/components/TypeManager";
import { loadState, saveState } from "@/services/storageService";
import { cn } from "@/lib/utils";
import { yearMonthLocal } from "@/utils/dateUtils";
import type {
  CashflowAppState,
  Debt,
  DebtMonthlyPlan,
  PaymentType,
  RecurringMovement,
  Transaction,
} from "@/types/finance";

type Tab =
  | "dashboard"
  | "transaction"
  | "types"
  | "recurring"
  | "debts"
  | "timeline"
  | "simulation";

type NavEntry = {
  id: Tab;
  label: string;
  Icon: typeof LayoutDashboard;
};

const NAV_ENTRIES: NavEntry[] = [
  { id: "dashboard", label: "Prehľad", Icon: LayoutDashboard },
  { id: "transaction", label: "Transakcie", Icon: CreditCard },
  { id: "types", label: "Typy", Icon: Tags },
  { id: "recurring", label: "Opakované", Icon: Repeat2 },
  { id: "debts", label: "Dlh", Icon: WalletCards },
  { id: "timeline", label: "Časová os", Icon: CalendarDays },
  { id: "simulation", label: "Simulácia", Icon: LineChart },
];

let txSeq = 0;
function newTxId(): string {
  txSeq += 1;
  return `tx-${Date.now()}-${txSeq}`;
}

let recvSeq = 0;
function newRecurringMovementId(): string {
  recvSeq += 1;
  return `recv-${Date.now()}-${recvSeq}`;
}

function calendarDayFromIso(dateIso: string): number {
  const d = Number.parseInt(dateIso.slice(8, 10), 10);
  if (!Number.isFinite(d) || d < 1) return 1;
  return Math.min(31, d);
}

function NavButtons({
  tab,
  onTab,
}: {
  tab: Tab;
  onTab: (id: Tab) => void;
}) {
  return (
    <>
      {NAV_ENTRIES.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onTab(id)}
          className={cn(
            "omega-nav-item shrink-0",
            tab === id && "omega-nav-active font-semibold text-white",
          )}
        >
          <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
          {label}
        </button>
      ))}
    </>
  );
}

export function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [calendarMonthYM, setCalendarMonthYM] = useState<string>(() =>
    yearMonthLocal(),
  );
  const [state, setState] = useState<CashflowAppState>(() => loadState());

  /** Všetky uložené transakcie chronologicky (bez obmedzenia na mesiac ako na Prehľade). */
  const transactionsSorted = useMemo(() => {
    return [...state.transactions].sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      const byCreated = a.createdAt.localeCompare(b.createdAt);
      if (byCreated !== 0) return byCreated;
      return a.id.localeCompare(b.id);
    });
  }, [state.transactions]);

  /** Porovnanie počtov — šablóny nemajú 1 : 1 zodpovednosť počtu zápisov v žurnáli. */
  const ledgerVersusRecurringFootnote = useMemo(() => {
    const recurring = state.recurringMovements ?? [];
    const activeIds = new Set(
      recurring.filter((r) => r.active).map((r) => r.id),
    );
    let recurringWithFulfillmentTxn = 0;
    const seenLinked = new Set<string>();
    for (const t of state.transactions) {
      const id = t.fulfillsRecurringMovementId;
      if (!id || !activeIds.has(id) || seenLinked.has(id)) continue;
      seenLinked.add(id);
      recurringWithFulfillmentTxn++;
    }
    return {
      recurringTotal: recurring.length,
      recurringActive: activeIds.size,
      ledgerRows: state.transactions.length,
      recurringWithFulfillmentTxn,
    };
  }, [state.recurringMovements, state.transactions]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const commitTransaction = useCallback(
    (
      recurrence: RepeatMode,
      partial: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
    ) => {
      const now = new Date().toISOString();
      setState((s) => {
        const movements = [...(s.recurringMovements ?? [])];
        let fulfillsId: string | null =
          partial.fulfillsRecurringMovementId ?? null;

        if (recurrence === "monthly") {
          const tmpl: RecurringMovement = {
            id: newRecurringMovementId(),
            direction: partial.direction,
            title: partial.title.trim() || "Bez názvu",
            amount: partial.amount,
            typeId: partial.typeId,
            dayOfMonth: calendarDayFromIso(partial.date),
            active: true,
            note: partial.note.trim(),
            createdAt: now,
          };
          movements.push(tmpl);
          fulfillsId = tmpl.id;
        }

        const row: Transaction = {
          ...partial,
          fulfillsRecurringMovementId: fulfillsId,
          id: newTxId(),
          createdAt: now,
          updatedAt: now,
        };
        return {
          ...s,
          recurringMovements: movements,
          transactions: [row, ...s.transactions],
        };
      });
    },
    [],
  );

  const deleteOneOffTransaction = useCallback((id: string) => {
    if (!window.confirm("Odstrániť túto jednorázovú položku?")) return;
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
  }, []);

  const upsertType = useCallback((pt: PaymentType) => {
    setState((s) => {
      const idx = s.paymentTypes.findIndex((p) => p.id === pt.id);
      if (idx === -1) {
        return { ...s, paymentTypes: [...s.paymentTypes, pt] };
      }
      const next = [...s.paymentTypes];
      next[idx] = pt;
      return { ...s, paymentTypes: next };
    });
  }, []);

  const deleteType = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      paymentTypes: s.paymentTypes.filter((p) => p.id !== id),
    }));
  }, []);

  const upsertRecurringMovement = useCallback((row: RecurringMovement) => {
    setState((s) => {
      const list = [...(s.recurringMovements ?? [])];
      const idx = list.findIndex((x) => x.id === row.id);
      if (idx === -1) return { ...s, recurringMovements: [...list, row] };
      list[idx] = row;
      return { ...s, recurringMovements: list };
    });
  }, []);

  const deleteRecurringMovement = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      recurringMovements: (s.recurringMovements ?? []).filter((x) => x.id !== id),
      transactions: s.transactions.map((t) =>
        t.fulfillsRecurringMovementId === id
          ? { ...t, fulfillsRecurringMovementId: null }
          : t,
      ),
    }));
  }, []);

  const upsertDebt = useCallback((d: Debt) => {
    setState((s) => {
      const idx = s.debts.findIndex((x) => x.id === d.id);
      if (idx === -1) {
        return { ...s, debts: [...s.debts, d] };
      }
      const next = [...s.debts];
      next[idx] = d;
      return { ...s, debts: next };
    });
  }, []);

  const deleteDebt = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      debts: s.debts.filter((d) => d.id !== id),
      debtMonthlyPlans: (s.debtMonthlyPlans ?? []).filter((p) => p.debtId !== id),
    }));
  }, []);

  const setDebtMonthPlan = useCallback(
    (debtId: string, month: string, plan: DebtMonthlyPlan | null) => {
      setState((s) => {
        const list = [...(s.debtMonthlyPlans ?? [])];
        const i = list.findIndex((p) => p.debtId === debtId && p.month === month);
        if (plan === null) {
          if (i === -1) return s;
          list.splice(i, 1);
          return { ...s, debtMonthlyPlans: list };
        }
        if (i === -1) list.push(plan);
        else list[i] = plan;
        return { ...s, debtMonthlyPlans: list };
      });
    },
    [],
  );

  const setDebtDueFlexibility = useCallback(
    (debtId: string, dueFlexibility: Debt["dueFlexibility"]) => {
      const updatedAt = new Date().toISOString();
      setState((s) => ({
        ...s,
        debts: s.debts.map((d) =>
          d.id === debtId ? { ...d, dueFlexibility, updatedAt } : d,
        ),
        debtMonthlyPlans:
          dueFlexibility === "fixed"
            ? (s.debtMonthlyPlans ?? []).filter((p) => p.debtId !== debtId)
            : (s.debtMonthlyPlans ?? []),
      }));
    },
    [],
  );

  useEffect(() => {
    setTransactionModalOpen(false);
  }, [tab]);

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden md:flex-row">
      <aside
        aria-label="Primárna navigácia"
        className="hidden h-[100dvh] shrink-0 border-r border-white/10 bg-slate-950/95 backdrop-blur-sm scrollbar-omega md:flex md:w-56 md:flex-col md:overflow-y-auto lg:w-64"
      >
        <div className="border-b border-white/10 px-6 py-8">
          <p className="omega-eyebrow mb-0">Omega</p>
          <h1 className="mt-2 text-xl font-black uppercase italic tracking-tighter text-white">
            Cashflow
          </h1>
          <p className="mt-2 max-w-[12rem] text-xs leading-relaxed text-slate-500">
            Rozhodovanie zostáva na tebe — motor len ráta dopady.
          </p>
        </div>
        <nav className="scrollbar-omega flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          <NavButtons tab={tab} onTab={setTab} />
        </nav>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-40 shrink-0 border-b border-white/10 bg-slate-950/90 backdrop-blur-md md:hidden">
          <header className="flex items-start justify-between gap-3 px-4 py-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-indigo-400">
                Omega
              </p>
              <span className="text-lg font-black uppercase italic text-white">
                Cashflow
              </span>
            </div>
          </header>
          <nav
            className="scrollbar-omega flex gap-1 overflow-x-auto px-2 pb-3"
            aria-label="Hlavná navigácia"
          >
            <NavButtons tab={tab} onTab={setTab} />
          </nav>
        </div>

        <main className="scrollbar-omega min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-10 md:p-8">
          <div className="mx-auto max-w-4xl xl:max-w-5xl">
            {tab === "dashboard" && (
              <Dashboard
                state={state}
                selectedMonth={calendarMonthYM}
                onSelectedMonthChange={setCalendarMonthYM}
                onChangeBalance={(v) => setState((s) => ({ ...s, currentBalance: v }))}
                onChangeBuffer={(v) => setState((s) => ({ ...s, safetyBuffer: v }))}
                onChangeDebtPercent={(v) =>
                  setState((s) => ({
                    ...s,
                    debtBudgetPercent: Math.min(100, Math.max(0, v)),
                  }))
                }
                onToggleEmergencyFreeze={() =>
                  setState((s) => ({ ...s, emergencyFreeze: !s.emergencyFreeze }))
                }
              />
            )}
            {tab === "transaction" && (
              <>
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="omega-h2 mb-2">Transakcie</h2>
                    <p className="text-sm text-slate-400">
                      Položky v Opakované sú mesačné šablóny; tu pod tým sú len pohyby, ktoré zámerne zapíšeš —
                      aplikácia za každú šablónu sama nevytvára mesačný riadok. Prehľad šablóny používa v mesačnom
                      výpočte aj bez zápisu tu. Aktívnych šablón{" "}
                      <span className="tabular-nums text-slate-300">
                        {ledgerVersusRecurringFootnote.recurringActive}
                      </span>{" "}
                      (naraz evidovaných{" "}
                      <span className="tabular-nums text-slate-300">
                        {ledgerVersusRecurringFootnote.recurringTotal}
                      </span>
                      ); riadkov v žurnáli{" "}
                      <span className="tabular-nums text-slate-300">
                        {ledgerVersusRecurringFootnote.ledgerRows}
                      </span>
                      ; počet aktívnych šablón, ktoré už majú niekedy prepojený zápis v žurnáli (akákoľvek
                      dátum):{" "}
                      <span className="tabular-nums text-slate-300">
                        {ledgerVersusRecurringFootnote.recurringWithFulfillmentTxn}
                      </span>
                      .
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTransactionModalOpen(true)}
                    className="omega-btn-primary inline-flex shrink-0 items-center justify-center gap-2 self-start sm:self-auto"
                  >
                    <PlusCircle className="h-4 w-4" aria-hidden />
                    Pridať pohyb
                  </button>
                </div>

                <section className="omega-panel">
                  <div className="mb-6 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-lg font-semibold text-white">
                      Všetky položky
                    </h2>
                    <span className="text-xs text-slate-500 tabular-nums">
                      Počet: {transactionsSorted.length}
                    </span>
                  </div>
                  {state.transactions.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Zatiaľ žiadne záznamy — použitím „Pridať pohyb“ vytvor prvú položku.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/10 rounded-2xl border border-white/5 bg-black/15">
                      {transactionsSorted.map((t) => {
                        const rp = t.fulfillsRecurringMovementId
                          ? state.recurringMovements?.find((r) => r.id === t.fulfillsRecurringMovementId)
                          : undefined;
                        return (
                        <li
                          key={t.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm md:px-5"
                        >
                          <span
                            className={cn(
                              "min-w-0 flex-1 font-semibold basis-[min-content]",
                              t.direction === "income"
                                ? "text-emerald-400"
                                : "text-red-400",
                            )}
                          >
                            <span aria-hidden>{t.direction === "income" ? "+" : "−"}</span>
                            {t.title}
                            {rp ? (
                              <span className="mt-1 block text-[11px] font-normal text-slate-500">
                                Šablóna · {rp.title}
                              </span>
                            ) : null}
                          </span>
                          <span className="tabular-nums font-medium text-white">
                            {t.amount} €
                          </span>
                          <span className="text-xs text-slate-500">{t.date}</span>
                          {!t.fulfillsRecurringMovementId ? (
                            <button
                              type="button"
                              onClick={() => deleteOneOffTransaction(t.id)}
                              className="ml-auto shrink-0 rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-500/15 hover:text-red-400 md:ml-0"
                              aria-label="Zmazať položku"
                              title="Zmazať položku"
                            >
                              <Trash2 size={18} aria-hidden />
                            </button>
                          ) : null}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              </>
            )}
            {tab === "types" && (
              <TypeManager
                state={state}
                onUpsertType={upsertType}
                onDeleteType={deleteType}
              />
            )}
            {tab === "recurring" && (
              <RecurringMovementPanel
                state={state}
                onUpsert={upsertRecurringMovement}
                onDelete={deleteRecurringMovement}
              />
            )}
            {tab === "debts" && (
              <DebtBoard
                state={state}
                onUpsertDebt={upsertDebt}
                onDeleteDebt={deleteDebt}
                onDebtMonthPlan={setDebtMonthPlan}
                onDebtDueFlexibilityChange={setDebtDueFlexibility}
              />
            )}
            {tab === "timeline" && <CashflowTimeline state={state} />}
            {tab === "simulation" && <SimulationPanel state={state} />}
          </div>
        </main>
      </div>

      <TransactionFormModal
        open={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        state={state}
        onCommit={commitTransaction}
      />
    </div>
  );
}
