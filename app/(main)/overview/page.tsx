import { TmtLogo } from "@/components/brand/TmtLogo";
import { EquivalentsStrip } from "@/components/dashboard/EquivalentsStrip";
import { MethodologyNote } from "@/components/dashboard/MethodologyNote";
import { ModelAssumptionsDialog } from "@/components/dashboard/ModelAssumptionsDialog";
import { DashboardInsightCharts } from "@/components/dashboard/DashboardInsightCharts";
import { StatCards } from "@/components/dashboard/StatCards";
import { TopModelsChart } from "@/components/dashboard/TopModelsChart";
import { ReplacementScenarioControls } from "@/components/dashboard/ReplacementScenarioControls";
import { getDashboardDataCached } from "@/lib/dashboardCache";
import type { DashboardPayload } from "@/lib/dashboardTypes";
import { normalizeReplacementScenario } from "@/lib/modelAssumptions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ scenario?: string }>;
}) {
  const sp = await searchParams;
  const scenario = normalizeReplacementScenario(sp.scenario);
  const raw = await getDashboardDataCached("", 1, scenario);
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
              Estimated manufacturing CO₂e avoided when repairs displace new devices (probability-weighted),
              using your device manufacturing column and component data. Open{" "}
              <Link
                href={`/jobs?scenario=${encodeURIComponent(data.replacementScenario)}`}
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

      <ReplacementScenarioControls current={data.replacementScenario} pathname="/overview" />

      <StatCards
        totals={data.totals}
        attentionModels={data.attentionModels}
        replacementScenario={data.replacementScenario}
      />
      <EquivalentsStrip equivalents={data.equivalents} />

      <section className="space-y-6" aria-label="Charts">
        <TopModelsChart topModels={data.topModels} />
        <DashboardInsightCharts charts={data.charts} />
      </section>

      <MethodologyNote />
    </div>
  );
}
