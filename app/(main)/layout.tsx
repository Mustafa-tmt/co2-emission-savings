import { AppShell } from "@/components/shell/AppShell";

export default function MainAppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
