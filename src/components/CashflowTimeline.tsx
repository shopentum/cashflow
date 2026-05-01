import { buildTimeline } from "@/services/cashflowEngine";
import type { CashflowAppState } from "@/types/finance";
import { formatMoneyEUR } from "@/utils/moneyUtils";

type Props = {
  state: CashflowAppState;
};

export function CashflowTimeline({ state }: Props) {
  const points = buildTimeline(state);

  return (
    <section className="omega-panel">
      <h2 className="omega-h2">Časová os / kalendár</h2>
      <p className="omega-muted">
        Od dátumu „dnes“ dopredu: zobrazené sú transakcie a projekcia zostatku po
        každej udalosti.
      </p>
      {points.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-white/15 px-6 py-12 text-center text-sm text-slate-500">
          Zatiaľ žiadne body — pridaj transakcie alebo plány.
        </p>
      ) : (
        <ul className="divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
          {points.map((p) => (
            <li
              key={`${p.date}-${p.label}`}
              className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6"
            >
              <time
                dateTime={p.date}
                className="shrink-0 text-xs font-bold uppercase tracking-widest text-indigo-400"
              >
                {p.date}
              </time>
              <span className="min-w-0 flex-1 text-sm text-slate-200">{p.label}</span>
              <span className="tabular-nums text-sm font-semibold text-white md:text-base">
                {formatMoneyEUR(p.balanceAfter)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
