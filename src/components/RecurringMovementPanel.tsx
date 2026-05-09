import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import type {
  CashflowAppState,
  RecurringMovement,
  TransactionDirection,
} from "@/types/finance";
import { cn } from "@/lib/utils";

type Props = {
  state: CashflowAppState;
  onUpsert: (row: RecurringMovement) => void;
  onDelete: (id: string) => void;
};

let seq = 0;
function newId(): string {
  seq += 1;
  return `recv-${Date.now()}-${seq}`;
}

function typesForMovement(
  direction: TransactionDirection,
  state: CashflowAppState,
) {
  return direction === "income"
    ? state.paymentTypes.filter((p) => p.kind === "income")
    : state.paymentTypes.filter((p) => p.kind !== "income");
}

function EditCard({
  row,
  typeOptions,
  onSave,
  onCancel,
  onRemove,
}: {
  row: RecurringMovement;
  typeOptions: { id: string; label: string }[];
  onSave: (next: RecurringMovement) => void;
  onCancel: () => void;
  onRemove: () => void;
}) {
  const [direction, setDirection] = useState<TransactionDirection>(row.direction);
  const [title, setTitle] = useState(row.title);
  const [amount, setAmount] = useState(String(row.amount));
  const [typeId, setTypeId] = useState(row.typeId);
  const [dayOfMonth, setDayOfMonth] = useState(String(row.dayOfMonth));
  const [active, setActive] = useState(row.active);
  const [note, setNote] = useState(row.note);

  useEffect(() => {
    setDirection(row.direction);
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
      typeOptions.find((o) => o.id === typeId)?.id ??
      typeOptions[0]?.id ??
      "";
    if (!tid) return;
    onSave({
      ...row,
      direction,
      title: title.trim(),
      amount: a,
      typeId: tid,
      dayOfMonth: dom,
      active,
      note: note.trim(),
    });
    onCancel();
  }

  const dirSwitch = (
    <div className="mb-4 flex rounded-2xl border border-white/10 bg-white/[0.06] p-1 sm:col-span-2">
      <button
        type="button"
        onClick={() => {
          setDirection("income");
          setTypeId("");
        }}
        className={cn(
          "flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider",
          direction === "income"
            ? "bg-emerald-600 text-white shadow-lg"
            : "text-slate-500 hover:text-white",
        )}
      >
        Príjem
      </button>
      <button
        type="button"
        onClick={() => {
          setDirection("expense");
          setTypeId("");
        }}
        className={cn(
          "flex-1 rounded-xl py-2.5 text-xs font-bold uppercase tracking-wider",
          direction === "expense"
            ? "bg-red-600 text-white shadow-lg"
            : "text-slate-500 hover:text-white",
        )}
      >
        Výdavok
      </button>
    </div>
  );

  return (
    <form
      className="space-y-4 rounded-2xl border border-indigo-500/25 bg-black/35 p-4"
      onSubmit={submit}
    >
      {dirSwitch}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="omega-label">Názov šablóny</span>
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
          <span className="omega-label">Deň platby (kalendár)</span>
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
          <span className="omega-label">
            Typ platby ({direction === "income" ? "príjem" : "výdavok"})
          </span>
          <select
            className="omega-input cursor-pointer"
            value={typeId || typeOptions[0]?.id || ""}
            onChange={(e) => setTypeId(e.target.value)}
          >
            {typeOptions.map((o) => (
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
          <span className="text-sm text-slate-300">Zarátať projekciu v motore</span>
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
          Zmazať šablónu
        </button>
      </div>
    </form>
  );
}

export function RecurringMovementPanel({ state, onUpsert, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newDirection, setNewDirection] = useState<TransactionDirection>("expense");

  const incOpts = typesForMovement("income", state).map((p) => ({
    id: p.id,
    label: p.name,
  }));
  const expOpts = typesForMovement("expense", state).map((p) => ({
    id: p.id,
    label: p.name,
  }));
  const optsForNew = newDirection === "income" ? incOpts : expOpts;

  function addRow(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!optsForNew.length) return;
    const fd = new FormData(e.currentTarget);
    const title = String(fd.get("title") ?? "").trim();
    const amountRaw = Number(String(fd.get("amount") ?? "").replace(",", "."));
    const domRaw = Number.parseInt(String(fd.get("dom") ?? "28"), 10);
    if (!title || !Number.isFinite(amountRaw) || amountRaw < 0) return;
    if (!Number.isFinite(domRaw) || domRaw < 1 || domRaw > 31) return;
    const typePick = String(fd.get("typeId") ?? optsForNew[0]!.id);
    onUpsert({
      id: newId(),
      direction: newDirection,
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
      <h2 className="omega-h2">Opakované položky (mesačný plán)</h2>
      <p className="omega-muted mb-8">
        Pravidelný pohyb zadávaj ako šablónu — motor automaticky zarátava výšku mesiac čo mesiac do
        Prehľadu, kým v danom kalendárnom mesiaci nepridáš transakciu prepojenú s touto položkou (
        formulár → Opakovanie / prepojenie). Jednorazové pohyby nechávaj bez šablóny.
      </p>

      {(incOpts.length === 0 || expOpts.length === 0) && (
        <p className="mb-8 rounded-xl border border-amber-500/25 bg-amber-950/30 px-4 py-3 text-sm text-amber-100">
          {!incOpts.length && "Potrebuješ aspoň jeden platobný typ „Príjem“. "}
          {!expOpts.length && "Potrebuješ aspoň jeden typ výdavkov (nie príjem). "}
          Upraviť viete v sekcii Typy.
        </p>
      )}

      <ul className="mb-10 space-y-3">
        {(state.recurringMovements ?? []).map((row) => {
          const typeOptions = typesForMovement(row.direction, state).map((p) => ({
            id: p.id,
            label: p.name,
          }));
          return editingId === row.id ? (
            <li key={row.id}>
              <EditCard
                row={row}
                typeOptions={typeOptions}
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
                  className={cn(
                    "shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase",
                    row.direction === "income"
                      ? "bg-emerald-500/25 text-emerald-300"
                      : "bg-red-500/20 text-red-300",
                  )}
                >
                  {row.direction === "income" ? "Pri" : "Výd"}
                </div>
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
                  disabled={!incOpts.length && !expOpts.length}
                >
                  Upraviť
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {!!optsForNew.length && (
        <form
          className="space-y-6 rounded-3xl border border-white/10 bg-black/20 p-6 md:p-8"
          onSubmit={addRow}
        >
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">
            Nová mesačná šablóna
          </h3>
          <div className="flex rounded-2xl border border-white/10 bg-white/[0.06] p-1">
            <button
              type="button"
              onClick={() => setNewDirection("income")}
              className={cn(
                "flex-1 rounded-xl py-3 text-xs font-bold uppercase tracking-wider",
                newDirection === "income"
                  ? "bg-emerald-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-white",
              )}
            >
              Pravidelný príjem
            </button>
            <button
              type="button"
              onClick={() => setNewDirection("expense")}
              className={cn(
                "flex-1 rounded-xl py-3 text-xs font-bold uppercase tracking-wider",
                newDirection === "expense"
                  ? "bg-red-600 text-white shadow-lg"
                  : "text-slate-500 hover:text-white",
              )}
            >
              Pravidelný výdavok
            </button>
          </div>
          <label className="block">
            <span className="omega-label">Názov</span>
            <input name="title" required className="omega-input" placeholder="Hypotéka / výplata" />
          </label>
          <label className="block">
            <span className="omega-label">Suma (EUR)</span>
            <input name="amount" required type="number" step="0.01" min={0} className="omega-input" />
          </label>
          <label className="block">
            <span className="omega-label">Deň platby</span>
            <input
              name="dom"
              type="number"
              min={1}
              max={31}
              defaultValue={newDirection === "income" ? 15 : 1}
              className="omega-input max-w-[8rem]"
            />
          </label>
          <label className="block">
            <span className="omega-label">Typ</span>
            <select key={newDirection} name="typeId" className="omega-input cursor-pointer">
              {optsForNew.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="omega-btn-primary">
            Pridať šablónu
          </button>
        </form>
      )}
    </section>
  );
}
