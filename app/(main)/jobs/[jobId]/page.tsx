import { notFound } from "next/navigation";
import { JobDetailView } from "@/components/job/JobDetailView";
import { getJobReportCached } from "@/lib/dashboardCache";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";
import type { JobReportPayload } from "@/lib/dashboardTypes";
import { normalizeReplacementScenario } from "@/lib/modelAssumptions";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ scenario?: string }>;
};

export default async function JobPage({ params, searchParams }: PageProps) {
  const { jobId: raw } = await params;
  const sp = await searchParams;
  const scenario = normalizeReplacementScenario(sp.scenario);
  const jobId = decodeURIComponent(raw ?? "").trim();
  if (!jobId) notFound();

  const payload = await getJobReportCached(jobId, scenario);
  if (!payload) notFound();

  const report = payload as JobReportPayload;
  const baseUrl = await getRequestBaseUrl();
  const reportPublicUrl = `${baseUrl}/report/${encodeURIComponent(report.jobId)}?scenario=${encodeURIComponent(scenario)}`;

  return <JobDetailView report={report} reportPublicUrl={reportPublicUrl} variant="app" />;
}
