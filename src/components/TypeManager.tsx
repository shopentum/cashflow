import type { FormEvent } from "react";

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
    <section className="panel">
      <h2>Typy platieb</h2>
      <ul className="type-list">
        {state.paymentTypes.map((pt) => (
          <li key={pt.id} className="type-row">
            <span
              className="swatch"
              style={{ background: pt.color }}
              aria-hidden
            />
            <div>
              <strong>{pt.name}</strong>
              <span className="muted"> · {pt.kind}</span>
            </div>
            <button
              type="button"
              className="btn ghost danger"
              onClick={() => onDeleteType(pt.id)}
            >
              Zmazať
            </button>
          </li>
        ))}
      </ul>

      <form className="stack-form bordered" onSubmit={addType}>
        <h3>Nový typ</h3>
        <label className="field">
          <span>Názov</span>
          <input name="name" required placeholder="napr. Hypotéka" />
        </label>
        <label className="field">
          <span>Druh</span>
          <select name="kind" defaultValue="flexible_expense">
            <option value="income">Príjem</option>
            <option value="fixed_expense">Fixný výdaj</option>
            <option value="flexible_expense">Flexibilný výdaj</option>
            <option value="debt">Dlžba</option>
            <option value="savings">Úspory</option>
            <option value="other">Iné</option>
          </select>
        </label>
        <label className="field">
          <span>Farba</span>
          <input name="color" type="color" defaultValue="#457b9d" />
        </label>
        <button type="submit" className="btn primary">
          Pridať typ
        </button>
      </form>
    </section>
  );
}
