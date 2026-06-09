import { ModelAssumptionsDialog } from "@/components/dashboard/ModelAssumptionsDialog";

export function MethodologyNote() {
  return (
    <aside className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-xs leading-relaxed text-[var(--muted)] shadow-sm sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <p>
          <strong className="font-semibold text-[var(--foreground)]">Methodology:</strong> Manufacturing
          CO₂e avoided (est.) applies replacement probability P to the device manufacturing phase only,
          then subtracts mapped spare parts plus a fixed operational allowance per job. Partial rows mean
          one or more parts could not be mapped. Skipped jobs are not in REPAIRED status. Use the
          assumptions button for scenarios, scope, and exclusions.
        </p>
        <ModelAssumptionsDialog compact className="self-start sm:shrink-0" />
      </div>
    </aside>
  );
}
