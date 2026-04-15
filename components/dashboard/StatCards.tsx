import { AttentionNeededStatCard } from "@/components/dashboard/AttentionModelsDialog";
import type { AttentionModelRow, DashboardPayload } from "@/lib/dashboardTypes";

function formatKg(n: number) {
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 0 })} kg`;
}

export function StatCards({
  totals,
  attentionModels,
}: {
  totals: DashboardPayload["totals"];
  attentionModels: AttentionModelRow[];
}) {
  const cards = [
    {
      label: "Jobs in database",
      value: totals.jobs.toLocaleString(),
      hint: "All repair records",
      accent: "from-[var(--brand)]/15 to-transparent",
    },
    {
      label: "CO₂e avoided (lifecycle)",
      value: formatKg(totals.totalSavedKg),
      hint: "Sum for ok + partial evaluations",
      accent: "from-emerald-500/15 to-transparent",
    },
    {
      label: "Fully mapped (ok)",
      value: totals.okCount.toLocaleString(),
      hint: "All parts resolved to LCA lines",
      accent: "from-teal-500/12 to-transparent",
    },
  ];

  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="group relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_32px_-8px_rgba(12,18,34,0.12)]"
        >
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${c.accent} opacity-80`}
            aria-hidden
          />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              {c.label}
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
              {c.value}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{c.hint}</p>
          </div>
        </div>
      ))}
      <AttentionNeededStatCard
        value={(totals.partialCount + totals.failedCount).toLocaleString()}
        hint={`${totals.partialCount} partial · ${totals.failedCount} failed`}
        rows={attentionModels}
      />
    </div>
  );
}
