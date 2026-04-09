import { TmtLogo } from "@/components/brand/TmtLogo";
import { EquivalentsStrip } from "@/components/dashboard/EquivalentsStrip";
import { MethodologyNote } from "@/components/dashboard/MethodologyNote";
import { ModelAssumptionsDialog } from "@/components/dashboard/ModelAssumptionsDialog";
import { DashboardInsightCharts } from "@/components/dashboard/DashboardInsightCharts";
import { StatCards } from "@/components/dashboard/StatCards";
import { TopModelsChart } from "@/components/dashboard/TopModelsChart";
import { getDashboardDataCached } from "@/lib/dashboardCache";
import type { DashboardPayload } from "@/lib/dashboardTypes";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const raw = await getDashboardDataCached("", 1);
  const data = raw as DashboardPayload;

  return (
    <div className="space-y-10">
      <header className="border-b border-[var(--border)] pb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
              Sustainability
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
              CO₂ savings overview
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-[var(--muted)]">
              Estimated avoided CO₂e when devices are repaired instead of replaced, using your device
              and component lifecycle data. Open{" "}
              <Link
                href="/jobs"
                className="font-medium text-[var(--brand)] underline-offset-2 hover:underline"
              >
                Repair jobs
              </Link>{" "}
              to search, export PDFs, and view per-job reports.
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

      <StatCards totals={data.totals} />
      <EquivalentsStrip equivalents={data.equivalents} />

      <section className="space-y-6" aria-label="Charts">
        <TopModelsChart topModels={data.topModels} />
        <DashboardInsightCharts charts={data.charts} />
      </section>

      <MethodologyNote />
    </div>
  );
}
