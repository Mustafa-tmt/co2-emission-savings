import Link from "next/link";
import { FileDown, ExternalLink } from "lucide-react";
import type { JobReportPayload } from "@/lib/dashboardTypes";
import { TmtLogo } from "@/components/brand/TmtLogo";
import { ReportQrImage } from "@/components/report/ReportQrImage";
import { Co2EquivalentsNarrative } from "@/components/co2/Co2EquivalentsNarrative";
import { MethodologyNote } from "@/components/dashboard/MethodologyNote";
import { ModelAssumptionsDialog } from "@/components/dashboard/ModelAssumptionsDialog";

function formatKg(n: number | null | undefined, decimals = 3) {
  if (n == null || !Number.isFinite(Number(n))) return "—";
  return `${Number(n).toFixed(decimals)} kg CO₂e`;
}

export async function JobDetailView({
  report,
  reportPublicUrl,
  variant = "app",
}: {
  report: JobReportPayload;
  reportPublicUrl: string;
  variant?: "app" | "public";
}) {
  const pdfHref = `/api/reports/${encodeURIComponent(report.jobId)}/pdf`;
  const skippedOrFailed = report.evaluationStatus === "skipped" || report.evaluationStatus === "failed";
  const isPublic = variant === "public";

  return (
    <div
      className={
        isPublic
          ? "min-h-screen bg-[var(--background)] print:bg-white"
          : "space-y-8"
      }
    >
      <header className="border-b border-[var(--border)] bg-[var(--surface)] print:border-slate-300">
        <div
          className={
            isPublic
              ? "mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-4 py-5 sm:px-6"
              : "flex flex-wrap items-center justify-between gap-6 py-4"
          }
        >
          <TmtLogo variant="onLight" className="h-10 w-auto max-w-[min(100%,280px)]" priority />
          <div className="min-w-0 text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand)]">
              Sustainability
            </p>
            <p className="mt-1 text-sm font-semibold text-[var(--foreground)]">CO₂ repair report</p>
          </div>
        </div>
      </header>
      <main className="space-y-8 print:max-w-none print:px-4 print:py-4">
        <div
          className={`flex flex-wrap items-center justify-between gap-4 ${isPublic ? "no-print" : ""}`}
        >
          {isPublic ? (
            <Link href="/overview" className="text-sm font-medium text-[var(--brand)] hover:underline">
              Full dashboard
            </Link>
          ) : (
            <Link href="/jobs" className="text-sm font-medium text-[var(--brand)] hover:underline">
              ← Back to jobs
            </Link>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <ModelAssumptionsDialog compact />
            <a
              href={pdfHref}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--brand-hover)]"
            >
              <FileDown className="h-4 w-4" aria-hidden />
              Download PDF
            </a>
            {!isPublic ? (
              <a
                href={reportPublicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                Public report
              </a>
            ) : null}
          </div>
        </div>

        <header className="border-b border-[var(--border)] pb-6">
          <p className="text-sm text-[var(--muted)]">Repair job</p>
          <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {report.jobId}
          </h1>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {report.make} {report.model}
            {report.modelCode ? ` · ${report.modelCode}` : ""}
            {report.imei ? ` · IMEI ${report.imei}` : ""}
          </p>
          <p className="mt-1 text-sm">
            Repair status:{" "}
            <span className="font-medium text-[var(--foreground)]">{report.repairStatus || "—"}</span>
            {" · "}
            Evaluation:{" "}
            <span className="font-medium text-[var(--foreground)]">{report.evaluationStatus}</span>
          </p>
        </header>

        {report.message ? (
          <div
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            {report.message}
          </div>
        ) : null}

        {!skippedOrFailed && report.deviceResolution?.device ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
            <div className="space-y-6">
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[var(--foreground)]">Matched device (LCA)</h2>
                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--muted)]">Model code</dt>
                    <dd className="font-medium">{report.deviceResolution.device.model_code}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Model name</dt>
                    <dd className="font-medium">{report.deviceResolution.device.model_name}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--muted)]">Match</dt>
                    <dd>
                      {report.deviceResolution.matchedAs} ({report.deviceResolution.matchTier})
                    </dd>
                  </div>
                </dl>
              </div>

              {report.defect ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">Defect</h2>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-[var(--muted)]">Type</dt>
                      <dd>{report.defect.type ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Catalogue</dt>
                      <dd>{report.defect.catalogDescription ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[var(--muted)]">Job notes</dt>
                      <dd>{report.defect.jobDescription ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
              ) : null}

              {report.analysis ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-[var(--foreground)]">CO₂e summary</h2>
                  <ul className="mt-3 space-y-2 text-sm">
                    <li className="flex justify-between gap-4 border-b border-[var(--border)] py-2">
                      <span className="text-[var(--muted)]">New device — full lifecycle (reference)</span>
                      <span className="tabular-nums font-medium">{formatKg(report.analysis.lifecycleBaseline)}</span>
                    </li>
                    <li className="flex justify-between gap-4 border-b border-[var(--border)] py-2">
                      <span className="text-[var(--muted)]">This repair — parts (mapped)</span>
                      <span className="tabular-nums font-medium">{formatKg(report.analysis.partsCo2)}</span>
                    </li>
                    <li className="flex justify-between gap-4 py-2">
                      <span className="text-[var(--foreground)]">Avoided vs full lifecycle (estimate)</span>
                      <span className="tabular-nums font-semibold text-[var(--brand-dark)]">
                        {formatKg(report.analysis.approxAvoidedLifecycle)}
                      </span>
                    </li>
                  </ul>
                </div>
              ) : null}

              {report.analysis?.lines?.length ? (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <div className="border-b border-[var(--border)] px-5 py-4">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">Parts mapped</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table
                      className={`w-full text-left text-sm ${isPublic ? "min-w-[560px]" : "min-w-[720px]"}`}
                    >
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-medium uppercase text-[var(--muted)]">
                          <th className="px-5 py-2">#</th>
                          <th className="px-5 py-2">SKU</th>
                          {!isPublic ? (
                            <th className="min-w-[200px] px-5 py-2 font-mono normal-case">part_descp</th>
                          ) : null}
                          <th className="px-5 py-2">Component</th>
                          <th className="px-5 py-2 text-right">CO₂e</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.analysis.lines.map((ln) => (
                          <tr key={ln.slot} className="border-b border-[var(--border)] last:border-0">
                            <td className="px-5 py-2 font-mono text-xs">{ln.slot}</td>
                            <td className="px-5 py-2 font-mono text-xs">{ln.sku}</td>
                            {!isPublic ? (
                              <td
                                className="max-w-[min(28rem,40vw)] px-5 py-2 text-xs leading-snug text-[var(--muted)]"
                                title={ln.partDescp?.trim() || undefined}
                              >
                                {ln.partDescp?.trim() ? ln.partDescp : "—"}
                              </td>
                            ) : null}
                            <td className="max-w-[240px] px-5 py-2">
                              {ln.componentName ?? (
                                <span className="text-amber-800">Not mapped ({ln.mapReason})</span>
                              )}
                            </td>
                            <td className="px-5 py-2 text-right tabular-nums text-xs">
                              {ln.lineCo2 != null && Number.isFinite(ln.lineCo2)
                                ? formatKg(ln.lineCo2, 4)
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {report.warnings.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
                  <h2 className="font-semibold">Warnings</h2>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {report.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.equivalents ? (
                <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
                  <div className="border-b border-[var(--border)] bg-[var(--surface-muted)]/60 px-5 py-4 sm:px-6">
                    <h2 className="text-sm font-semibold text-[var(--foreground)]">Environmental impact</h2>
                    <p className="mt-1 text-xs font-medium text-[var(--muted)]">{report.equivalents.totalSaved}</p>
                  </div>
                  <div className="px-5 py-5 sm:px-6 sm:py-6">
                    <Co2EquivalentsNarrative equivalents={report.equivalents} variant="flush" />
                  </div>
                </div>
              ) : null}
            </div>

            <aside className="flex flex-col items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm lg:sticky lg:top-8 print:static print:border-slate-300">
              <ReportQrImage url={reportPublicUrl} />
              <p className="text-center text-xs text-[var(--muted)]">
                Same QR is embedded in the PDF report.
              </p>
            </aside>
          </section>
        ) : (
          <div className="flex justify-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8">
            <ReportQrImage url={reportPublicUrl} caption="Scan for this report page" />
          </div>
        )}

        <MethodologyNote />
      </main>
    </div>
  );
}
