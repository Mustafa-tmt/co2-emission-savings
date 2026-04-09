import { notFound } from "next/navigation";
import { JobDetailView } from "@/components/job/JobDetailView";
import { getJobReportCached } from "@/lib/dashboardCache";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";
import type { JobReportPayload } from "@/lib/dashboardTypes";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ jobId: string }> };

export default async function JobPage({ params }: PageProps) {
  const { jobId: raw } = await params;
  const jobId = decodeURIComponent(raw ?? "").trim();
  if (!jobId) notFound();

  const payload = await getJobReportCached(jobId);
  if (!payload) notFound();

  const report = payload as JobReportPayload;
  const baseUrl = await getRequestBaseUrl();
  const reportPublicUrl = `${baseUrl}/report/${encodeURIComponent(report.jobId)}`;

  return <JobDetailView report={report} reportPublicUrl={reportPublicUrl} variant="app" />;
}
