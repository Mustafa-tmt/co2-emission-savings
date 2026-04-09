"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardCharts, DefectSavingRow, JobPipelineRow } from "@/lib/dashboardTypes";

function ChartShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_32px_-12px_rgba(12,18,34,0.1)]">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--brand)]/10 to-transparent px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">{title}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{subtitle}</p>
      </div>
      <div className="min-h-0 flex-1 px-2 pb-4 pt-3 sm:px-4">{children}</div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center px-4 text-center text-sm font-medium leading-relaxed text-[var(--muted)]">
      {message}
    </div>
  );
}

function wrapLabel(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function YAxisTick(props: { x?: number | string; y?: number | string; payload?: { value?: string } }) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const text = String(props.payload?.value ?? "");
  const lines = wrapLabel(text, 30);
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((ln, i) => (
        <text
          key={`${i}-${ln.slice(0, 16)}`}
          x={-8}
          y={0}
          dy={4 + i * 14}
          textAnchor="end"
          fill="#0f172a"
          fontSize={11}
          fontWeight={600}
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

function kgLabel(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0 kg";
  return `${value.toLocaleString()} kg`;
}

function PipelineTooltip({
  active,
  payload,
  totalJobs,
}: {
  active?: boolean;
  payload?: { payload: JobPipelineRow }[];
  totalJobs: number;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const pct = totalJobs > 0 ? Math.round((row.count / totalJobs) * 1000) / 10 : 0;
  return (
    <div className="max-w-sm rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-md">
      <p className="font-semibold text-slate-900">{row.label}</p>
      <p className="mt-1.5 leading-snug text-slate-600">{row.hint}</p>
      <p className="mt-2 font-semibold text-slate-900">
        {row.count.toLocaleString()} job{row.count === 1 ? "" : "s"}
        <span className="font-normal text-slate-600"> · {pct}% of all jobs</span>
      </p>
    </div>
  );
}

function DefectTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DefectSavingRow }[];
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-md">
      <p className="font-semibold leading-snug text-slate-900">{row.label}</p>
      <p className="mt-2 text-slate-700">
        <span className="font-semibold text-slate-900">{kgLabel(row.savedKg)}</span> CO₂e avoided
        (estimated)
      </p>
      <p className="mt-1 text-slate-600">{row.jobCount} repair job{row.jobCount === 1 ? "" : "s"}</p>
    </div>
  );
}

export function DashboardInsightCharts({ charts }: { charts: DashboardCharts }) {
  const pipeline = charts.jobPipeline;
  const defects = charts.defectSavings;
  const totalJobs = pipeline.reduce((s, r) => s + r.count, 0);

  const pipelineHeight = Math.max(260, 48 + pipeline.length * 56);
  const defectHeight = Math.max(260, 48 + defects.length * 52);

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
      <ChartShell
        title="How jobs land in the pipeline"
        subtitle="One bar per outcome: repaired jobs with a savings estimate, failures, or excluded rows. Counts only — total avoided CO₂e is in the stat cards and device chart."
      >
        {pipeline.length === 0 ? (
          <EmptyChart message="No repair jobs loaded yet." />
        ) : (
          <div className="w-full" style={{ height: pipelineHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={pipeline}
                layout="vertical"
                margin={{ left: 4, right: 16, top: 8, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
                  tickMargin={8}
                  label={{
                    value: "Number of jobs",
                    position: "bottom",
                    offset: 4,
                    fill: "#334155",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={200}
                  tick={(props) => <YAxisTick {...props} />}
                  interval={0}
                />
                <Tooltip content={<PipelineTooltip totalJobs={totalJobs} />} cursor={{ fill: "rgba(15, 118, 110, 0.06)" }} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]} maxBarSize={36}>
                  {pipeline.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                  <LabelList
                    dataKey="count"
                    position="right"
                    fill="#0f172a"
                    fontSize={12}
                    fontWeight={600}
                    formatter={(v) => String(Number(v ?? 0))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>

      <ChartShell
        title="Avoided CO₂e by repair category"
        subtitle="Defect or service category from your job data (catalog text when available). Only jobs with a savings estimate (complete or partial) are included."
      >
        {defects.length === 0 ? (
          <EmptyChart message="No attributed savings yet. Once repaired jobs evaluate with an estimate, categories appear here." />
        ) : (
          <div className="w-full" style={{ height: defectHeight }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={defects}
                layout="vertical"
                margin={{ left: 4, right: 20, top: 8, bottom: 28 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12, fill: "#475569", fontWeight: 500 }}
                  tickMargin={8}
                  label={{
                    value: "kg CO₂e avoided (estimated)",
                    position: "bottom",
                    offset: 4,
                    fill: "#334155",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={210}
                  tick={(props) => <YAxisTick {...props} />}
                  interval={0}
                />
                <Tooltip content={<DefectTooltip />} cursor={{ fill: "rgba(13, 148, 136, 0.07)" }} />
                <Bar dataKey="savedKg" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={32}>
                  <LabelList
                    dataKey="savedKg"
                    position="right"
                    fill="#0f172a"
                    fontSize={11}
                    fontWeight={600}
                    formatter={(v) => kgLabel(Number(v ?? 0))}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartShell>
    </div>
  );
}
