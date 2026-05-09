import type { FormEvent } from "react";
import { useEffect, useState } from "react";
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

const KIND_OPTIONS: { value: PaymentTypeKind; label: string }[] = [
  { value: "income", label: "Príjem" },
  { value: "fixed_expense", label: "Fixný výdaj" },
  { value: "flexible_expense", label: "Flexibilný výdaj" },
  { value: "debt", label: "Dlžba" },
  { value: "savings", label: "Úspory" },
  { value: "other", label: "Iné" },
];

let tid = 0;
function newTypeId(): string {
  tid += 1;
  return `ptype-${Date.now()}-${tid}`;
}

type EditRowProps = {
  pt: PaymentType;
  onSave: () => void;
  onUpsertType: Props["onUpsertType"];
  onCancel: () => void;
  onDelete: () => void;
};

function PaymentTypeEditRow({
  pt,
  onUpsertType,
  onCancel,
  onSave,
  onDelete,
}: EditRowProps) {
  const [name, setName] = useState(pt.name);
  const [kind, setKind] = useState<PaymentTypeKind>(pt.kind);
  const [color, setColor] = useState(pt.color);

  useEffect(() => {
    setName(pt.name);
    setKind(pt.kind);
    setColor(pt.color);
  }, [pt]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    onUpsertType({
      ...pt,
      name: n,
      kind,
      color,
    });
    onSave();
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-2xl border border-indigo-500/25 bg-black/40 p-4"
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="omega-label">Názov</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="omega-input"
          />
        </label>
        <label className="block">
          <span className="omega-label">Druh</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as PaymentTypeKind)}
            className="omega-input cursor-pointer"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block max-w-xs">
        <span className="omega-label">Farba</span>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-12 w-full cursor-pointer rounded-xl border border-white/10 bg-white/5 px-2 py-1"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="omega-btn-primary">
          Uložiť
        </button>
        <button type="button" className="omega-btn-ghost" onClick={onCancel}>
          Zrušiť
        </button>
        <button
          type="button"
          className="omega-btn-danger ml-auto sm:ml-0"
          onClick={onDelete}
        >
          Zmazať
        </button>
      </div>
    </form>
  );
}

export function TypeManager({ state, onUpsertType, onDeleteType }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

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
          <li key={pt.id}>
            {editingId === pt.id ? (
              <PaymentTypeEditRow
                pt={pt}
                onUpsertType={onUpsertType}
                onCancel={() => setEditingId(null)}
                onSave={() => setEditingId(null)}
                onDelete={() => {
                  onDeleteType(pt.id);
                  setEditingId(null);
                }}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-4">
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
                  className="omega-btn-ghost shrink-0"
                  onClick={() => setEditingId(pt.id)}
                >
                  Upraviť
                </button>
                <button
                  type="button"
                  className="omega-btn-danger shrink-0"
                  onClick={() => onDeleteType(pt.id)}
                >
                  Zmazať
                </button>
              </div>
            )}
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
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
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
