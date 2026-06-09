import Link from "next/link";
import {
  METHODOLOGY_VERSION,
  REPLACEMENT_PROBABILITY,
  type ReplacementScenario,
} from "@/lib/modelAssumptions";

const LABELS: Record<ReplacementScenario, string> = {
  conservative: "Conservative",
  central: "Central",
  optimistic: "Optimistic",
};

type Props = {
  current: ReplacementScenario;
  /** e.g. `/overview` or `/jobs` — query string built here */
  pathname: string;
  /** Preserve jobs search */
  searchQuery?: string;
  page?: number;
};

export function ReplacementScenarioControls({
  current,
  pathname,
  searchQuery = "",
  page = 1,
}: Props) {
  const q = searchQuery.trim();
  const baseParams = new URLSearchParams();
  if (q) baseParams.set("q", q);
  if (pathname === "/jobs" && page > 1) baseParams.set("page", String(page));

  const mk = (scenario: ReplacementScenario) => {
    const p = new URLSearchParams(baseParams);
    p.set("scenario", scenario);
    const qs = p.toString();
    return qs ? `${pathname}?${qs}` : `${pathname}?scenario=${scenario}`;
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 px-4 py-3 text-sm text-[var(--foreground)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        Replacement scenario (P)
      </p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(REPLACEMENT_PROBABILITY) as ReplacementScenario[]).map((key) => {
          const active = key === current;
          const pVal = REPLACEMENT_PROBABILITY[key];
          return (
            <Link
              key={key}
              href={mk(key)}
              scroll={false}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                active
                  ? "bg-[var(--brand)] text-white ring-[var(--brand)]"
                  : "bg-[var(--surface)] text-[var(--foreground)] ring-[var(--border)] hover:bg-[var(--surface-muted)]"
              }`}
              aria-current={active ? "true" : undefined}
            >
              {LABELS[key]} ({Math.round(pVal * 100)}%)
            </Link>
          );
        })}
      </div>
      <p className="text-xs leading-relaxed text-[var(--muted)]">
        P scales manufacturing-phase displacement vs a new device. Methodology{" "}
        <span className="font-medium text-[var(--foreground)]">{METHODOLOGY_VERSION}</span> — manufacturing baseline
        only, plus repair parts and operational overhead per job.
      </p>
    </div>
  );
}
