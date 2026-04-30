import { useCallback, useEffect, useState } from "react";
import { CashflowTimeline } from "@/components/CashflowTimeline";
import { Dashboard } from "@/components/Dashboard";
import { DebtBoard } from "@/components/DebtBoard";
import { SimulationPanel } from "@/components/SimulationPanel";
import { TransactionForm } from "@/components/TransactionForm";
import { TypeManager } from "@/components/TypeManager";
import { loadState, saveState } from "@/services/storageService";
import type { CashflowAppState, Debt, PaymentType, Transaction } from "@/types/finance";

type Tab =
  | "dashboard"
  | "transaction"
  | "types"
  | "debts"
  | "timeline"
  | "simulation";

let txSeq = 0;
function newTxId(): string {
  txSeq += 1;
  return `tx-${Date.now()}-${txSeq}`;
}

export function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [state, setState] = useState<CashflowAppState>(() => loadState());

  useEffect(() => {
    saveState(state);
  }, [state]);

  const addTransaction = useCallback(
    (partial: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const row: Transaction = {
        ...partial,
        id: newTxId(),
        createdAt: now,
        updatedAt: now,
      };
      setState((s) => ({ ...s, transactions: [row, ...s.transactions] }));
    },
    [],
  );

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
    setState((s) => ({ ...s, debts: s.debts.filter((d) => d.id !== id) }));
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>OMEGA Cashflow</h1>
          <p className="tagline">Osobný cashflow — rozhodovanie zostáva na tebe</p>
        </div>
        <nav className="tabs" aria-label="Hlavná navigácia">
          {(
            [
              ["dashboard", "Prehľad"],
              ["transaction", "Transakcia"],
              ["types", "Typy"],
              ["debts", "Dlh"],
              ["timeline", "Časová os"],
              ["simulation", "Simulácia"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "tab active" : "tab"}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="app-main">
        {tab === "dashboard" && (
          <Dashboard
            state={state}
            onChangeBalance={(v) => setState((s) => ({ ...s, currentBalance: v }))}
            onChangeBuffer={(v) => setState((s) => ({ ...s, safetyBuffer: v }))}
            onChangeDebtPercent={(v) =>
              setState((s) => ({ ...s, debtBudgetPercent: Math.min(100, Math.max(0, v)) }))
            }
            onToggleEmergencyFreeze={() =>
              setState((s) => ({ ...s, emergencyFreeze: !s.emergencyFreeze }))
            }
          />
        )}
        {tab === "transaction" && (
          <>
            <TransactionForm state={state} onAdd={addTransaction} />
            <section className="panel">
              <h2>Posledné transakcie</h2>
              {state.transactions.length === 0 ? (
                <p className="muted">Zatiaľ žiadne záznamy.</p>
              ) : (
                <ul className="tx-list">
                  {state.transactions.slice(0, 20).map((t) => (
                    <li key={t.id}>
                      <span className={t.direction === "income" ? "pos" : "neg"}>
                        {t.direction === "income" ? "+" : "−"}
                        {t.title}
                      </span>
                      <span className="money">{t.amount} €</span>
                      <span className="muted">{t.date}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        {tab === "types" && (
          <TypeManager state={state} onUpsertType={upsertType} onDeleteType={deleteType} />
        )}
        {tab === "debts" && (
          <DebtBoard state={state} onUpsertDebt={upsertDebt} onDeleteDebt={deleteDebt} />
        )}
        {tab === "timeline" && <CashflowTimeline state={state} />}
        {tab === "simulation" && <SimulationPanel state={state} />}
      </main>
    </div>
  );
}
