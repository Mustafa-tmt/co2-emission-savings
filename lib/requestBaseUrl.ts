import { headers } from "next/headers";

/**
 * Canonical origin for QR codes and PDF links (falls back to env or localhost).
 */
export async function getRequestBaseUrl(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (envUrl) return envUrl;

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return "http://localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}
