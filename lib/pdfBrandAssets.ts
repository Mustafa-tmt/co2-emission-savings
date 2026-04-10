import { readFileSync } from "fs";
import path from "path";

let heroLogoDataUrl: string | undefined;

/**
 * Strapline lockup for dark / saturated bands (same asset as `TmtLogo` onDark).
 * Data URL so @react-pdf can embed reliably (local file paths are flaky on some hosts/OS).
 */
export function getRepairPdfHeroLogoDataUrl(): string {
  if (heroLogoDataUrl) return heroLogoDataUrl;
  const filePath = path.join(
    process.cwd(),
    "public",
    "brand",
    "tmt_logo_strapline_margin_on_black.png"
  );
  const buf = readFileSync(filePath);
  heroLogoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
  return heroLogoDataUrl;
}
