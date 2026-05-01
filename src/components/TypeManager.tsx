import type { FormEvent } from "react";
import type {
  CashflowAppState,
  PaymentType,
  PaymentTypeKind,
} from "@/types/finance";

type Props = {
  state: CashflowAppState;
  onUpsertType: (pt: PaymentType) => void;
  onDeleteType: (id: string) => void;
};

let tid = 0;
function newTypeId(): string {
  tid += 1;
  return `ptype-${Date.now()}-${tid}`;
}

export function TypeManager({ state, onUpsertType, onDeleteType }: Props) {
  function addType(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    if (!name) return;
    const kind = String(fd.get("kind") ?? "other") as PaymentTypeKind;
    const color = String(fd.get("color") ?? "#457b9d");
    onUpsertType({
      id: newTypeId(),
      name,
      kind,
      color,
      createdAt: new Date().toISOString(),
    });
    form.reset();
  }

  return (
    <section className="omega-panel">
      <h2 className="omega-h2">Typy platieb</h2>
      <ul className="mb-10 space-y-3">
        {state.paymentTypes.map((pt) => (
          <li
            key={pt.id}
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-4"
          >
            <span
              className="h-10 w-10 shrink-0 rounded-xl shadow-inner ring-1 ring-white/20"
              style={{ background: pt.color }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <strong className="block font-semibold text-white">{pt.name}</strong>
              <span className="text-xs text-slate-500"> · {pt.kind}</span>
            </div>
            <button
              type="button"
              className="omega-btn-danger shrink-0"
              onClick={() => onDeleteType(pt.id)}
            >
              Zmazať
            </button>
          </li>
        ))}
      </ul>

      <form className="space-y-6 rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8" onSubmit={addType}>
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
          Nový typ
        </h3>
        <label className="block">
          <span className="omega-label">Názov</span>
          <input
            name="name"
            required
            placeholder="napr. Hypotéka"
            className="omega-input"
          />
        </label>
        <label className="block">
          <span className="omega-label">Druh</span>
          <select
            name="kind"
            defaultValue="flexible_expense"
            className="omega-input cursor-pointer"
          >
            <option value="income">Príjem</option>
            <option value="fixed_expense">Fixný výdaj</option>
            <option value="flexible_expense">Flexibilný výdaj</option>
            <option value="debt">Dlžba</option>
            <option value="savings">Úspory</option>
            <option value="other">Iné</option>
          </select>
        </label>
        <label className="block">
          <span className="omega-label">Farba</span>
          <input
            name="color"
            type="color"
            defaultValue="#457b9d"
            className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-2 py-1"
          />
        </label>
        <button type="submit" className="omega-btn-primary">
          Pridať typ
        </button>
      </form>
    </section>
  );
}
