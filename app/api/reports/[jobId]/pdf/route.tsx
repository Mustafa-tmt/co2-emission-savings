import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { RepairPdfDocument } from "@/components/report/RepairPdfDocument";
import { getJobReportCached } from "@/lib/dashboardCache";
import { getRequestBaseUrl } from "@/lib/requestBaseUrl";
import type { JobReportPayload } from "@/lib/dashboardTypes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  const { jobId: raw } = await context.params;
  const jobId = decodeURIComponent(raw ?? "").trim();
  if (!jobId) {
    return NextResponse.json({ error: "Missing job id" }, { status: 400 });
  }

  const payload = await getJobReportCached(jobId);
  if (!payload) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  const report = payload as JobReportPayload;

  const baseUrl = await getRequestBaseUrl();
  const reportUrl = `${baseUrl}/report/${encodeURIComponent(report.jobId)}`;
  const qrDataUrl = await QRCode.toDataURL(reportUrl, {
    width: 120,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  const buffer = await renderToBuffer(
    <RepairPdfDocument report={report} reportUrl={reportUrl} qrDataUrl={qrDataUrl} />
  );

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="co2-report-job-${report.jobId}.pdf"`,
      "Cache-Control": "private, max-age=60",
    },
  });
}
