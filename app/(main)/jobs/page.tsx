import { TmtLogo } from "@/components/brand/TmtLogo";
import { JobsSection } from "@/components/dashboard/JobsSection";
import { MethodologyNote } from "@/components/dashboard/MethodologyNote";
import { ModelAssumptionsDialog } from "@/components/dashboard/ModelAssumptionsDialog";
import { getDashboardDataCached } from "@/lib/dashboardCache";
import type { DashboardPayload } from "@/lib/dashboardTypes";

export const dynamic = "force-dynamic";

export default async function JobsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const raw = await getDashboardDataCached(q, page);
  const data = raw as DashboardPayload;

  return (
    <div className="space-y-8">
      <header className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
              Operations
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              Repair jobs
            </h1>
            <p className="max-w-2xl text-base text-[var(--muted)]">
              Search by job ID, IMEI, or model. Each row links to a full CO₂ breakdown, QR code, and PDF
              report.
            </p>
          </div>
          <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:items-end">
            <ModelAssumptionsDialog compact className="w-full sm:w-auto" />
            <TmtLogo
              variant="onLight"
              className="h-11 w-auto shrink-0 self-end sm:mt-0"
            />
          </div>
        </div>
      </header>

      <JobsSection summaries={data.summaries} pagination={data.pagination} search={data.search} />

      <MethodologyNote />
    </div>
  );
}
