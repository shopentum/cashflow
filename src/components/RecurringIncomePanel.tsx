import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type { CashflowAppState, RecurringIncome } from "@/types/finance";

type Props = {
  state: CashflowAppState;
  onUpsert: (row: RecurringIncome) => void;
  onDelete: (id: string) => void;
};

let seq = 0;
function newId(): string {
  seq += 1;
  return `recv-${Date.now()}-${seq}`;
}

function incomeTypes(state: CashflowAppState) {
  return state.paymentTypes.filter((p) => p.kind === "income");
}

function EditCard({
  row,
  incomeTypeIds,
  onSave,
  onCancel,
  onRemove,
}: {
  row: RecurringIncome;
  incomeTypeIds: { id: string; label: string }[];
  onSave: (next: RecurringIncome) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const [title, setTitle] = useState(row.title);
  const [amount, setAmount] = useState(String(row.amount));
  const [typeId, setTypeId] = useState(row.typeId);
  const [dayOfMonth, setDayOfMonth] = useState(String(row.dayOfMonth));
  const [active, setActive] = useState(row.active);
  const [note, setNote] = useState(row.note);

  useEffect(() => {
    setTitle(row.title);
    setAmount(String(row.amount));
    setTypeId(row.typeId);
    setDayOfMonth(String(row.dayOfMonth));
    setActive(row.active);
    setNote(row.note);
  }, [row]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const a = Number(String(amount).replace(",", "."));
    const dom = Number.parseInt(String(dayOfMonth), 10);
    if (!title.trim() || !Number.isFinite(a) || a < 0) return;
    if (!Number.isFinite(dom) || dom < 1 || dom > 31) return;
    const tid =
      incomeTypeIds.find((x) => x.id === typeId)?.id ?? incomeTypeIds[0]?.id ?? "";
    if (!tid) return;
    onSave({
      ...row,
      title: title.trim(),
      amount: a,
      typeId: tid,
      dayOfMonth: dom,
      active,
      note: note.trim(),
    });
    onCancel();
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-indigo-500/25 bg-black/35 p-4"
      onSubmit={submit}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="omega-label">Názov (napr. výplata zamestnávateľa)</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="omega-input"
          />
        </label>
        <label className="block">
          <span className="omega-label">Suma (EUR / mesiac)</span>
          <input
            required
            type="number"
            step="0.01"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="omega-input"
          />
        </label>
        <label className="block">
          <span className="omega-label">Deň výplaty (kalendár)</span>
          <input
            required
            type="number"
            min={1}
            max={31}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            className="omega-input max-w-[8rem]"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="omega-label">Typ platby (musí mať „príjem“)</span>
          <select
            className="omega-input cursor-pointer"
            value={typeId || incomeTypeIds[0]?.id}
            onChange={(e) => setTypeId(e.target.value)}
          >
            {incomeTypeIds.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          <span className="text-sm text-slate-300">
            Zahŕňať do počítania (ak vypli, motor túto sumu nedoplní)
          </span>
        </label>
        <label className="block sm:col-span-2">
          <span className="omega-label">Poznámka</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="omega-input"
            placeholder="Voliteľné"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="omega-btn-primary">
          Uložiť
        </button>
        <button type="button" className="omega-btn-ghost" onClick={onCancel}>
          Zrušiť
        </button>
        <button type="button" className="omega-btn-danger ml-auto sm:ml-0" onClick={onRemove}>
          Zmazať plán
        </button>
      </div>
    </form>
  );
}

export function RecurringIncomePanel({ state, onUpsert, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const incTypes = incomeTypes(state).map((p) => ({ id: p.id, label: p.name }));

  function addRow(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!incTypes.length) return;
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const amountRaw = Number(String(fd.get("amount") ?? "").replace(",", "."));
    const domRaw = Number.parseInt(String(fd.get("dom") ?? "28"), 10);
    if (!title || !Number.isFinite(amountRaw) || amountRaw < 0) return;
    if (!Number.isFinite(domRaw) || domRaw < 1 || domRaw > 31) return;
    const typePick = String(fd.get("typeId") ?? incTypes[0]!.id);
    onUpsert({
      id: newId(),
      title,
      amount: amountRaw,
      typeId: typePick,
      dayOfMonth: domRaw,
      active: true,
      note: "",
      createdAt: new Date().toISOString(),
    });
    e.currentTarget.reset();
  }

  return (
    <section className="omega-panel">
      <h2 className="omega-h2">Pravidelný mesačný príjem</h2>
      <p className="omega-muted mb-8">
        <strong>Automatické prenesenie:</strong> na mesiac, v ktorom ešte nemáš príjem
        prepojený s daným plánom, motor zarátava sumu sama (aj v Prehľade). Keď dorazila
        skutočná platba — v modáli pridania príjmu vyber položku plánu, aby sme nerátali dvakrát.
        <br />
        <strong>Jednorazový príjem:</strong> nechaj v transakcií prepojenie prázdne.
      </p>

      {!incTypes.length && (
        <p className="mb-8 rounded-xl border border-amber-500/25 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          Najskôr v časti Typy vytvor platobný typ s druhom „Príjem“.
        </p>
      )}

      <ul className="mb-10 space-y-3">
        {(state.recurringIncomes ?? []).map((row) =>
          editingId === row.id ? (
            <li key={row.id}>
              <EditCard
                row={row}
                incomeTypeIds={incTypes}
                onCancel={() => setEditingId(null)}
                onSave={onUpsert}
                onRemove={() => {
                  onDelete(row.id);
                  setEditingId(null);
                }}
              />
            </li>
          ) : (
            <li key={row.id}>
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-4">
                <div
                  className="h-10 w-10 shrink-0 rounded-xl ring-1 ring-white/15"
                  style={{
                    background: state.paymentTypes.find((t) => t.id === row.typeId)?.color,
                  }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <strong className="block font-semibold text-white">{row.title}</strong>
                  <span className="text-xs text-slate-500">
                    {row.amount.toLocaleString("sk-SK", { minimumFractionDigits: 0 })} € · deň{" "}
                    {row.dayOfMonth} · {!row.active ? "vypnuté" : "zapnuté"}
                  </span>
                </div>
                <button
                  type="button"
                  className="omega-btn-ghost shrink-0"
                  onClick={() => setEditingId(row.id)}
                  disabled={!incTypes.length}
                >
                  Upraviť
                </button>
              </div>
            </li>
          ),
        )}
      </ul>

      {!!incTypes.length && (
        <form
          className="space-y-6 rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8"
          onSubmit={addRow}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Nový pravidelný príjem
          </h3>
          <label className="block">
            <span className="omega-label">Názov</span>
            <input name="title" required placeholder="Mesiacný príjem" className="omega-input" />
          </label>
          <label className="block">
            <span className="omega-label">Suma (EUR)</span>
            <input name="amount" required type="number" step="0.01" min={0} className="omega-input" />
          </label>
          <label className="block">
            <span className="omega-label">Deň výplaty</span>
            <input
              name="dom"
              type="number"
              min={1}
              max={31}
              defaultValue={28}
              className="omega-input max-w-[8rem]"
            />
          </label>
          <label className="block">
            <span className="omega-label">Typ príjmu</span>
            <select name="typeId" className="omega-input cursor-pointer">
              {incTypes.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="omega-btn-primary">
            Pridať plán príjmu
          </button>
        </form>
      )}
    </section>
  );
}
