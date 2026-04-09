import Link from "next/link";
import type { DashboardPayload, JobSummary } from "@/lib/dashboardTypes";

function statusStyles(status: JobSummary["status"]) {
  switch (status) {
    case "ok":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "partial":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "failed":
      return "bg-red-50 text-red-800 ring-red-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function formatSavedKg(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "—";
  return `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
}

export function JobsSection({
  summaries,
  pagination,
  search,
}: {
  summaries: JobSummary[];
  pagination: DashboardPayload["pagination"];
  search: string;
}) {
  const qParam = search ? `&q=${encodeURIComponent(search)}` : "";
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <section className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_32px_-12px_rgba(12,18,34,0.1)]">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-slate-50 to-transparent px-4 py-5 sm:px-6">
        <h2 className="text-base font-semibold text-[var(--foreground)]">Job list</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Search by job ID, IMEI, model name, or model code. Open a row for the full CO₂ report,
          QR code, and PDF.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <form action="/jobs" method="get" className="flex w-full max-w-xl flex-wrap items-center gap-2">
            <label htmlFor="job-search" className="sr-only">
              Search jobs
            </label>
            <input
              id="job-search"
              name="q"
              type="search"
              defaultValue={search}
              placeholder="e.g. job ID, IMEI, Galaxy…"
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none ring-[var(--brand)] focus:ring-2"
            />
            <button
              type="submit"
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-hover)]"
            >
              Search
            </button>
            {search ? (
              <Link
                href="/jobs"
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                Clear
              </Link>
            ) : null}
          </form>
          <p className="text-sm text-[var(--muted)]">
            {pagination.total === 0
              ? "No matches"
              : `${start.toLocaleString()}–${end.toLocaleString()} of ${pagination.total.toLocaleString()}`}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-3 sm:px-6">Job ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Device</th>
              <th className="px-4 py-3">Model (listed)</th>
              <th className="px-4 py-3 text-right">Avoided CO₂e (est.)</th>
              <th className="px-4 py-3 sm:px-6 text-right">Report</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--muted)]">
                  No jobs match your search. Try another job ID, IMEI, or model keyword.
                </td>
              </tr>
            ) : (
              summaries.map((row) => (
                <tr
                  key={row.repairJobPk}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-muted)]/60"
                >
                  <td className="px-4 py-3 font-mono text-xs sm:px-6 sm:text-sm">{row.jobId}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${statusStyles(row.status)}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-[var(--muted)]" title={row.deviceLabel ?? ""}>
                    {row.deviceLabel ?? "—"}
                  </td>
                  <td className="max-w-[180px] truncate px-4 py-3" title={row.model}>
                    {row.model || "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium tabular-nums">
                    {formatSavedKg(row.savedLifecycleKg)}
                  </td>
                  <td className="px-4 py-3 text-right sm:px-6">
                    <Link
                      href={`/jobs/${encodeURIComponent(row.jobId)}`}
                      className="font-medium text-[var(--brand)] hover:underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 ? (
        <nav
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] px-4 py-4 sm:px-6"
          aria-label="Pagination"
        >
          <span className="text-sm text-[var(--muted)]">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            {pagination.hasPrev ? (
              <Link
                href={`/jobs?page=${pagination.page - 1}${qParam}`}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-lg border border-transparent px-4 py-2 text-sm text-[var(--muted)] opacity-50">
                Previous
              </span>
            )}
            {pagination.hasNext ? (
              <Link
                href={`/jobs?page=${pagination.page + 1}${qParam}`}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-[var(--surface-muted)]"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-lg border border-transparent px-4 py-2 text-sm text-[var(--muted)] opacity-50">
                Next
              </span>
            )}
          </div>
        </nav>
      ) : null}
    </section>
  );
}
