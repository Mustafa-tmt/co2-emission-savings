"use client";

import type { AttentionModelRow } from "@/lib/dashboardTypes";
import { useEffect, useId, useRef } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  value: string;
  hint: string;
  rows: AttentionModelRow[];
};

export function AttentionNeededStatCard({ value, hint, rows }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const unlockScroll = () => {
      document.documentElement.style.removeProperty("overflow");
    };
    const onClose = () => unlockScroll();
    el.addEventListener("close", onClose);
    return () => {
      el.removeEventListener("close", onClose);
      unlockScroll();
    };
  }, []);

  const openModal = () => {
    document.documentElement.style.overflow = "hidden";
    dialogRef.current?.showModal();
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="group relative w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset,0_8px_32px_-8px_rgba(12,18,34,0.12)] transition-colors hover:border-amber-500/35 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shell-bg)]"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/12 to-transparent opacity-80"
          aria-hidden
        />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Attention needed
          </p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
            {value}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{hint}</p>
          <p className="mt-3 text-xs font-medium text-amber-700/90 dark:text-amber-400/90">
            View models missing data →
          </p>
        </div>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal();
        }}
        className="fixed left-1/2 top-1/2 z-[100] w-[min(48rem,calc(100vw-1.25rem))] max-w-[calc(100vw-1.25rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-2xl ring-1 ring-black/5"
      >
        <div className="flex max-h-[min(85vh,36rem)] w-full flex-col overflow-hidden rounded-[inherit]">
          <div
            className="flex shrink-0 flex-col border-b border-[var(--border)] px-5 py-4 sm:px-6 sm:py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              <div>
                <h2
                  id={titleId}
                  className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl"
                >
                  Models needing data
                </h2>
                <p className="mt-2 text-sm leading-snug text-[var(--muted)]">
                  One line per model name. The last column is how many distinct model numbers (regional
                  variants) appear in this attention group. Jobs are partial or failed (missing LCA /
                  mapping).
                </p>
              </div>
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-auto overscroll-contain px-5 py-4 sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            {rows.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                No models in this list — all jobs are fully mapped, failed for other reasons, or
                excluded.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-[var(--border)]">
                <table className="w-full min-w-[22rem] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                      <th
                        scope="col"
                        className="w-14 whitespace-nowrap px-3 py-2.5 text-center font-semibold text-[var(--foreground)]"
                      >
                        Sr&nbsp;No.
                      </th>
                      <th scope="col" className="min-w-[10rem] px-3 py-2.5 font-semibold text-[var(--foreground)]">
                        Model name
                      </th>
                      <th
                        scope="col"
                        className="w-[1%] whitespace-nowrap px-3 py-2.5 text-right font-semibold text-[var(--foreground)]"
                        title="Count of distinct model numbers (e.g. regional SKUs) in this group"
                      >
                        No. of model numbers
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr
                        key={`${row.modelName}-${i}`}
                        className="border-b border-[var(--border)] last:border-b-0"
                      >
                        <td className="px-3 py-2 text-center tabular-nums text-[var(--muted)]">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 text-[var(--foreground)]">{row.modelName}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium text-[var(--foreground)]">
                          {row.modelNumberCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div
            className="shrink-0 border-t border-[var(--border)] px-5 py-4 sm:px-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeModal}
              className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--brand)]"
            >
              Close
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
