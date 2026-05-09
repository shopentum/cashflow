import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  FileText,
  Repeat,
  Save,
  Tag,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import type {
  CashflowAppState,
  PaymentType,
  Transaction,
  TransactionStatus,
} from "@/types/finance";
import { cn } from "@/lib/utils";
import { todayISO } from "@/utils/dateUtils";

export type RepeatMode = "once" | "monthly";

type Props = {
  open: boolean;
  onClose: () => void;
  state: CashflowAppState;
  onCommit: (
    recurrence: RepeatMode,
    transaction: Omit<Transaction, "id" | "createdAt" | "updatedAt">,
  ) => void;
};

function paymentTypesForDirection(
  all: PaymentType[],
  direction: "income" | "expense",
): PaymentType[] {
  if (direction === "income") {
    const only = all.filter((p) => p.kind === "income");
    return only.length ? only : all;
  }
  const noIncome = all.filter((p) => p.kind !== "income");
  return noIncome.length ? noIncome : all;
}

const STATUS_OPTS: { value: TransactionStatus; label: string }[] = [
  { value: "planned", label: "Plánovaná" },
  { value: "done", label: "Hotovo" },
  { value: "skipped", label: "Preskočená" },
  { value: "moved", label: "Presunutá" },
];

export function TransactionFormModal({
  open,
  onClose,
  state,
  onCommit,
}: Props) {
  const [direction, setDirection] = useState<"income" | "expense">("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [typeId, setTypeId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<TransactionStatus>("planned");
  const [note, setNote] = useState("");
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("once");
  const [fulfillsMovementId, setFulfillsMovementId] = useState("");

  const filteredTypes = useMemo(
    () => paymentTypesForDirection(state.paymentTypes, direction),
    [state.paymentTypes, direction],
  );

  const recurringPlansMatchingDirection = useMemo(
    () =>
      (state.recurringMovements ?? []).filter(
        (r) => r.active && r.direction === direction,
      ),
    [state.recurringMovements, direction],
  );

  useEffect(() => {
    if (!filteredTypes.some((p) => p.id === typeId)) {
      setTypeId(filteredTypes[0]?.id ?? "");
    }
  }, [filteredTypes, typeId]);

  useEffect(() => {
    setRepeatMode("once");
    setFulfillsMovementId("");
  }, [direction]);

  useEffect(() => {
    if (!open) return;
    setDate(todayISO());
    setDirection("expense");
    setTitle("");
    setAmount("");
    setStatus("planned");
    setNote("");
    setRepeatMode("once");
    setFulfillsMovementId("");
  }, [open]);

  useEffect(() => {
    if (repeatMode === "monthly") {
      setFulfillsMovementId("");
    }
  }, [repeatMode]);

  useEffect(() => {
    const ids = new Set(recurringPlansMatchingDirection.map((r) => r.id));
    setFulfillsMovementId((prev) =>
      prev && ids.has(prev) ? prev : "",
    );
  }, [recurringPlansMatchingDirection]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      const amt = Number(String(amount).replace(",", "."));
      if (!title.trim() || !Number.isFinite(amt) || amt < 0) return;
      const tid = typeId || filteredTypes[0]?.id || state.paymentTypes[0]?.id;
      if (!tid) return;
      const linkRaw = fulfillsMovementId.trim();
      const manualFulfills =
        repeatMode === "once" && linkRaw.length > 0 ? linkRaw : null;
      onCommit(repeatMode, {
        title: title.trim() || "Bez názvu",
        amount: amt,
        direction,
        typeId: tid,
        date,
        status,
        note: note.trim(),
        fulfillsRecurringMovementId: manualFulfills,
      });
      onClose();
    },
    [
      amount,
      date,
      direction,
      filteredTypes,
      fulfillsMovementId,
      note,
      onClose,
      onCommit,
      repeatMode,
      state.paymentTypes,
      status,
      title,
      typeId,
    ],
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.button
            type="button"
            aria-label="Zavrieť"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#020617]/90 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tx-modal-title"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="scrollbar-omega relative z-10 flex max-h-[90vh] w-full max-w-xl flex-col overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0F172A] shadow-2xl"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0F172A] px-6 py-5 md:px-8">
              <h2
                id="tx-modal-title"
                className="text-xl font-black italic uppercase tracking-tighter text-white"
              >
                Nová položka
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/5 p-2 text-slate-500 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={20} aria-hidden />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6 px-6 py-6 md:px-8 md:py-8">
              <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1">
                <button
                  type="button"
                  onClick={() => setDirection("expense")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all",
                    direction === "expense"
                      ? "bg-red-500 text-white shadow-lg shadow-red-500/20"
                      : "text-slate-500 hover:text-white",
                  )}
                >
                  <TrendingDown size={18} aria-hidden />
                  Výdavok
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("income")}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-xl py-3.5 text-xs font-black uppercase tracking-widest transition-all",
                    direction === "income"
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/25"
                      : "text-slate-500 hover:text-white",
                  )}
                >
                  <TrendingUp size={18} aria-hidden />
                  Príjem
                </button>
              </div>

              {direction === "income" &&
                !state.paymentTypes.some((p) => p.kind === "income") && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-200">
                    Nemáš kategóriu typu „príjem“ — rozbaľ Typy a pridaj ju, alebo sa zobrazí
                    celý zoznam typov.
                  </p>
                )}
              {direction === "expense" &&
                state.paymentTypes.every((p) => p.kind === "income") && (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-200">
                    Nemáš výdavkovú kategóriu — všetky typy sú príjmové. Pridaj typ výdavku v sekcii
                    Typy.
                  </p>
                )}

              <label className="block">
                <span className="omega-label flex items-center gap-2">
                  <FileText size={14} className="text-slate-500" aria-hidden />
                  Názov
                </span>
                <input
                  required
                  className="omega-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="napr. Nákup, výplata, splátka"
                />
              </label>

              <label className="block">
                <span className="omega-label">Suma (EUR)</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min={0}
                  className="omega-input"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="omega-label flex items-center gap-2">
                  <Tag size={14} className="text-slate-500" aria-hidden />
                  Kategória (typ platby)
                </span>
                <select
                  className="omega-input cursor-pointer"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                >
                  {filteredTypes.map((pt: PaymentType) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="omega-label flex items-center gap-2">
                  <Repeat size={14} className="text-slate-500" aria-hidden />
                  Opakovanie
                </span>
                <select
                  className="omega-input cursor-pointer"
                  value={repeatMode}
                  onChange={(e) => setRepeatMode(e.target.value as RepeatMode)}
                >
                  <option value="once">Jednorazovo</option>
                  <option value="monthly">Mesačne (nova šablóna z tohto pohybu)</option>
                </select>
                {repeatMode === "monthly" && (
                  <span className="mt-2 block text-[11px] leading-relaxed text-slate-500">
                    Vytvorí sa mesačná šablóna s dňom zo zadaného dátumu; táto položka sa zaradí ako
                    prvá realizácia (prepojená platba), aby sa výška v mesiaci nepočítala dvakrát.
                  </span>
                )}
              </label>

              {repeatMode === "once" &&
                recurringPlansMatchingDirection.length > 0 && (
                  <label className="block">
                    <span className="omega-label">
                      Prepojenie s existujúcou šablónou ({direction === "income" ? "+" : "−"})
                    </span>
                    <select
                      className="omega-input cursor-pointer"
                      value={fulfillsMovementId}
                      onChange={(e) => setFulfillsMovementId(e.target.value)}
                    >
                      <option value="">Žiadne — jednorazový</option>
                      {recurringPlansMatchingDirection.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.title} ({r.amount.toLocaleString("sk-SK")} €)
                        </option>
                      ))}
                    </select>
                  </label>
                )}

              <label className="block">
                <span className="omega-label flex items-center gap-2">
                  <Calendar size={14} className="text-slate-500" aria-hidden />
                  Dátum
                  {repeatMode === "monthly" && (
                    <span className="text-[10px] font-normal lowercase text-slate-500">
                      určuje deň v mesiaci
                    </span>
                  )}
                </span>
                <input
                  type="date"
                  className="omega-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>

              <label className="block">
                <span className="omega-label">Stav</span>
                <select
                  className="omega-input cursor-pointer"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as TransactionStatus)
                  }
                >
                  {STATUS_OPTS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="omega-label">Poznámka</span>
                <textarea
                  rows={3}
                  className="omega-input resize-y font-sans"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Voliteľné"
                />
              </label>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-indigo-600/25 transition-colors hover:bg-indigo-500"
              >
                <Save size={16} aria-hidden />
                Uložiť položku
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export { TransactionFormModal as TransactionForm };
