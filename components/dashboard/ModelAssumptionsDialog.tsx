"use client";

import { useEffect, useId, useRef } from "react";
import { CircleHelp } from "lucide-react";
import { MODEL_ASSUMPTION_ITEMS } from "@/lib/modelAssumptions";

type Props = {
  compact?: boolean;
  className?: string;
};

export function ModelAssumptionsDialog({ compact, className = "" }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    const unlockScroll = () => {
      document.documentElement.style.removeProperty("overflow");
    };

    const onClose = () => {
      unlockScroll();
    };

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
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface)] hover:border-[var(--muted)]/40 focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--shell-bg)] ${compact ? "shrink-0" : ""} ${className}`}
      >
        <CircleHelp className="h-3.5 w-3.5 shrink-0 text-[var(--brand)]" aria-hidden />
        Assumptions &amp; limitations
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-modal="true"
        onClick={(e) => {
          if (e.target === dialogRef.current) closeModal();
        }}
        className="fixed left-1/2 top-1/2 z-[100] w-[min(60rem,calc(100vw-1.25rem))] max-w-[calc(100vw-1.25rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-2xl ring-1 ring-black/5"
      >
        <div className="flex max-h-[min(92vh,64rem)] w-full flex-col overflow-hidden rounded-[inherit]">
        <div
          className="flex shrink-0 flex-col border-b border-[var(--border)] px-5 py-4 sm:px-8 sm:py-5"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id={titleId} className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
            Model assumptions &amp; limitations
          </h2>
          <p className="mt-2 text-base leading-snug text-[var(--muted)]">
            Indicative estimates only. Not a complete organisational life-cycle assessment.
          </p>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-8 sm:py-5"
          onClick={(e) => e.stopPropagation()}
        >
          <ul className="space-y-5 text-base leading-relaxed text-[var(--foreground)] sm:text-lg sm:leading-relaxed">
            {MODEL_ASSUMPTION_ITEMS.map(({ lead, body }) => (
              <li key={lead} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand)]" aria-hidden />
                <span>
                  <strong className="font-semibold text-[var(--foreground)]">{lead}.</strong> {body}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="shrink-0 border-t border-[var(--border)] bg-[var(--surface-muted)]/40 px-5 py-3.5 sm:px-8"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="w-full rounded-lg bg-[var(--brand)] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[var(--brand-hover)] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 sm:text-base"
            onClick={closeModal}
          >
            Close
          </button>
        </div>
        </div>
      </dialog>
    </>
  );
}
