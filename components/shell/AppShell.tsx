"use client";

import Link from "next/link";
import { TmtLogo } from "@/components/brand/TmtLogo";
import { usePathname } from "next/navigation";
import { ClipboardList, LayoutDashboard } from "lucide-react";

const nav = [
  { href: "/overview", label: "Overview", icon: LayoutDashboard },
  { href: "/jobs", label: "Repair jobs", icon: ClipboardList },
];

function navActive(pathname: string, href: string) {
  if (href === "/jobs") {
    return pathname === "/jobs" || pathname.startsWith("/jobs/");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  return (
    <div className="app-shell-root">
      <aside
        className="app-shell-sidebar fixed inset-y-0 left-0 z-50 flex flex-col border-r border-white/[0.06] px-4 py-6"
        aria-label="Main navigation"
      >
        <Link href="/overview" className="mb-8 block px-2 transition-opacity hover:opacity-90">
          <TmtLogo variant="onDark" className="h-16 w-auto max-w-full" priority />
        </Link>
        <nav className="flex flex-col gap-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-white/10 text-white shadow-inner"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-white/10 pt-6 text-xs leading-relaxed text-slate-500">
          <p className="px-2 font-medium uppercase tracking-wider text-slate-400">CO₂ insights</p>
          <p className="mt-2 px-2">Repair vs replace — lifecycle estimates from your LCA tables.</p>
        </div>
      </aside>

      <div className="app-shell-content">
        <main className="app-shell-main">
          <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
