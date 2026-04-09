import type { LucideIcon } from "lucide-react";
import {
  Droplets,
  ShoppingBag,
  Smartphone,
  TreePine,
  Utensils,
} from "lucide-react";
import type { Co2Equivalents, Co2ImpactCard } from "@/lib/dashboardTypes";

function impactIcon(card: Co2ImpactCard): LucideIcon {
  if (card.icon === "tree") return TreePine;
  if (card.icon === "tech") return Smartphone;
  if (card.title.toLowerCase().includes("plastic")) return ShoppingBag;
  if (card.title.toLowerCase().includes("dining")) return Utensils;
  return Droplets;
}

export function Co2EquivalentsNarrative({
  equivalents,
  variant = "default",
}: {
  equivalents: NonNullable<Co2Equivalents>;
  variant?: "default" | "flush";
}) {
  const cardShell =
    variant === "flush"
      ? "rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/50 p-4"
      : "rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm";

  return (
    <div className={variant === "flush" ? "space-y-5" : "space-y-6"}>
      <p className="text-base font-semibold leading-snug text-[var(--foreground)] sm:text-[1.05rem]">
        {equivalents.headline}
      </p>

      <ul className="grid gap-4 sm:grid-cols-3" role="list">
        {equivalents.impacts.map((card) => {
          const Icon = impactIcon(card);
          return (
            <li key={card.title} className={cardShell}>
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-subtle)] text-[var(--brand)]"
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-semibold text-[var(--foreground)]">{card.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{card.body}</p>
            </li>
          );
        })}
      </ul>

      <p className="text-center text-sm font-medium italic text-[var(--brand-dark)]">
        {equivalents.footer}
      </p>
    </div>
  );
}
