"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TopModelRow } from "@/lib/dashboardTypes";

type Row = { fullName: string; savedKg: number; jobs: number };

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
  if (lines.length <= 4) return lines;
  const head = lines.slice(0, 3);
  const tail = lines.slice(3).join(" ");
  const clipped = tail.length > maxChars ? `${tail.slice(0, maxChars - 2)}…` : `${tail}…`;
  head.push(clipped);
  return head;
}

function YAxisTick(props: {
  x?: number | string;
  y?: number | string;
  payload?: { value?: string };
}) {
  const x = Number(props.x ?? 0);
  const y = Number(props.y ?? 0);
  const text = String(props.payload?.value ?? "");
  const lines = wrapLabel(text, 34);
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((ln, i) => (
        <text
          key={`${i}-${ln.slice(0, 12)}`}
          x={-10}
          y={0}
          dy={4 + i * 15}
          textAnchor="end"
          fill="#0f172a"
          fontSize={12}
          fontWeight={500}
        >
          {ln}
        </text>
      ))}
    </g>
  );
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Row }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="max-w-md rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-md">
      <p className="font-semibold leading-snug text-slate-900">{p.fullName}</p>
      <p className="mt-2 text-slate-700">
        <span className="font-semibold text-slate-900">{p.savedKg}</span> kg CO₂e avoided (estimated)
      </p>
      <p className="mt-1 text-slate-600">{p.jobs} jobs in this device group</p>
    </div>
  );
}

export function TopModelsChart({ topModels }: { topModels: TopModelRow[] }) {
  if (!topModels.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-dashed border-[var(--border)] text-sm font-medium text-[var(--foreground)]">
        No device-level savings to chart yet.
      </div>
    );
  }

  const data: Row[] = topModels.map((m) => ({
    fullName: m.label,
    savedKg: Math.round(m.savedKg * 1000) / 1000,
    jobs: m.jobCount,
  }));

  const chartHeight = Math.max(320, 56 + data.length * 52);

  return (
    <div className="w-full overflow-visible rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_32px_-12px_rgba(12,18,34,0.1)]">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-[var(--brand)]/10 to-transparent px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)] sm:text-lg">
          Top devices by estimated avoided CO₂e
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">
          Each row is one device group (matched LCA device or listed model). Horizontal axis is estimated
          avoided CO₂e in kilograms. Hover a bar for the full device name and job count.
        </p>
      </div>
      <div className="w-full px-2 pb-4 pt-3 sm:px-4" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ left: 12, right: 20, top: 8, bottom: 28 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis
              type="number"
              tick={{ fontSize: 13, fill: "#0f172a", fontWeight: 500 }}
              tickMargin={8}
              label={{
                value: "Kilograms CO₂e (estimated)",
                position: "bottom",
                offset: 4,
                fill: "#334155",
                fontSize: 13,
                fontWeight: 600,
              }}
            />
            <YAxis
              type="category"
              dataKey="fullName"
              width={268}
              tick={(props) => <YAxisTick {...props} />}
              interval={0}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(15, 118, 110, 0.06)" }} />
            <Bar dataKey="savedKg" fill="#0d9488" radius={[0, 6, 6, 0]} maxBarSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
