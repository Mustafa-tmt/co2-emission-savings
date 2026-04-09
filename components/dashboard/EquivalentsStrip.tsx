import { Leaf } from "lucide-react";
import type { Co2Equivalents } from "@/lib/dashboardTypes";
import { Co2EquivalentsNarrative } from "@/components/co2/Co2EquivalentsNarrative";

export function EquivalentsStrip({ equivalents }: { equivalents: Co2Equivalents }) {
  if (!equivalents) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)]/80 px-6 py-10 text-center text-sm text-[var(--muted)]">
        No positive lifecycle savings total yet — impact stories appear once there is measurable avoided
        CO₂e across your repair set.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_40px_-12px_rgba(13,148,136,0.2)]">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--brand)]/12 via-transparent to-transparent px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
          <span
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--brand-subtle)] text-[var(--brand)]"
            aria-hidden
          >
            <Leaf className="h-7 w-7 sm:h-8 sm:w-8" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[var(--brand-dark)]">{equivalents.totalSaved}</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
              Tangible equivalents for clients. Rounded benchmarks only.
            </p>
          </div>
        </div>
      </div>
      <div className="p-6 sm:p-8">
        <Co2EquivalentsNarrative equivalents={equivalents} />
      </div>
    </section>
  );
}
