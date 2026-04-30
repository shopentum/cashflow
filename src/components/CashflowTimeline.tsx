import { buildTimeline } from "@/services/cashflowEngine";
import type { CashflowAppState } from "@/types/finance";
import { formatMoneyEUR } from "@/utils/moneyUtils";

type Props = {
  state: CashflowAppState;
};

export function CashflowTimeline({ state }: Props) {
  const points = buildTimeline(state);

  return (
    <section className="panel">
      <h2>Časová os / kalendár</h2>
      <p className="muted">
        Zobrazí prichádzajúce platby a zostatok po udalostiach. Skeleton —
        zoznam sa vyplní po implementácii timeline v engine.
      </p>
      {points.length === 0 ? (
        <p className="empty-hint">Zatiaľ žiadne body — pridaj transakcie alebo plány.</p>
      ) : (
        <ul className="timeline">
          {points.map((p) => (
            <li key={`${p.date}-${p.label}`}>
              <time dateTime={p.date}>{p.date}</time>
              <span>{p.label}</span>
              <span className="money">{formatMoneyEUR(p.balanceAfter)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
