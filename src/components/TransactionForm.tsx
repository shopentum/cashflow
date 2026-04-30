import type { FormEvent } from "react";
import type { CashflowAppState, PaymentType, Transaction } from "@/types/finance";
import { todayISO } from "@/utils/dateUtils";

type Props = {
  state: CashflowAppState;
  onAdd: (t: Omit<Transaction, "id" | "createdAt" | "updatedAt">) => void;
};

export function TransactionForm({ state, onAdd }: Props) {
  const types = state.paymentTypes;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") ?? "").trim() || "Bez názvu";
    const amount = Number(fd.get("amount") ?? 0);
    const direction = (fd.get("direction") as "income" | "expense") || "expense";
    const typeId = String(fd.get("typeId") ?? types[0]?.id ?? "");
    const date = String(fd.get("date") ?? todayISO());
    const status = (fd.get("status") as Transaction["status"]) || "planned";
    const note = String(fd.get("note") ?? "");
    onAdd({
      title,
      amount,
      direction,
      typeId,
      date,
      status,
      note,
    });
    form.reset();
  }

  return (
    <section className="panel">
      <h2>Pridať transakciu</h2>
      <form className="stack-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Názov</span>
          <input name="title" placeholder="napr. Nákup potravín" />
        </label>
        <label className="field">
          <span>Suma (EUR)</span>
          <input name="amount" type="number" step="0.01" defaultValue={0} required />
        </label>
        <fieldset className="field">
          <legend>Smer</legend>
          <label className="inline-check">
            <input type="radio" name="direction" value="expense" defaultChecked />
            Výdaj
          </label>
          <label className="inline-check">
            <input type="radio" name="direction" value="income" />
            Príjem
          </label>
        </fieldset>
        <label className="field">
          <span>Typ</span>
          <select name="typeId" defaultValue={types[0]?.id}>
            {types.map((pt: PaymentType) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Dátum</span>
          <input name="date" type="date" defaultValue={todayISO()} />
        </label>
        <label className="field">
          <span>Stav</span>
          <select name="status" defaultValue="planned">
            <option value="planned">Plánovaná</option>
            <option value="done">Hotovo</option>
            <option value="skipped">Preskočená</option>
            <option value="moved">Presunutá</option>
          </select>
        </label>
        <label className="field">
          <span>Poznámka</span>
          <textarea name="note" rows={2} />
        </label>
        <button type="submit" className="btn primary">
          Uložiť transakciu
        </button>
      </form>
    </section>
  );
}
