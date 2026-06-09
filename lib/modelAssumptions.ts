/**
 * Model assumptions (UI / PDF) and re-exports for methodology v2 parameters.
 *
 * Runtime constants and `calculateAvoidedCo2` live in `./co2Avoidance.js` so
 * `lib/repairs.js` and Node scripts stay compatible without a TypeScript loader.
 *
 * ─── Replacement Probability Scenarios ───────────────────────────────────────
 * P represents the probability that a repaired device genuinely displaced
 * a new device purchase. Based on Prosman & Sacchi (2021) and EEA (2020).
 *
 * conservative: 0.70 — 30% rebound allowance (Zink et al. 2014, J. Industrial Ecology)
 * central: 0.85 — Central estimate for Samsung premium segment
 * optimistic: 1.00 — Upper bound — equivalent to prior implicit assumption
 *
 * ─── Repair Operational Overhead ─────────────────────────────────────────────
 * Fixed CO₂e per job covering diagnostics, equipment energy, shop overhead.
 * Based on TTR (2021) repair facility energy studies. Conservative placeholder
 * pending measured operational data.
 *
 * ─── Methodology Version ─────────────────────────────────────────────────────
 * v1 = full lifecycle baseline, no P, no operational overhead
 * v2 = manufacturing-only baseline, P scenarios, operational overhead included
 */

import {
  REPLACEMENT_PROBABILITY,
  DEFAULT_SCENARIO,
  REPAIR_OPERATIONAL_KG_CO2E,
  METHODOLOGY_VERSION,
  normalizeReplacementScenario,
  calculateAvoidedCo2,
} from "./co2Avoidance.js";

export type ReplacementScenario = "conservative" | "central" | "optimistic";

export {
  REPLACEMENT_PROBABILITY,
  DEFAULT_SCENARIO,
  REPAIR_OPERATIONAL_KG_CO2E,
  METHODOLOGY_VERSION,
  normalizeReplacementScenario,
  calculateAvoidedCo2,
};

export type ModelAssumptionItem = { readonly lead: string; readonly body: string };

export const MODEL_ASSUMPTION_ITEMS: readonly ModelAssumptionItem[] = [
  {
    lead: "Baseline",
    body: 'Avoided manufacturing CO₂e is scaled by a replacement probability P (how often a repair displaces a new purchase). Scenarios: conservative P=0.70, central P=0.85, optimistic P=1.00. The physical baseline is the device manufacturing phase from your LCA table only — not distribution, use, or disposal.',
  },
  {
    lead: "Repair burden",
    body: `Mapped spare parts CO₂e plus a fixed operational allowance of ${REPAIR_OPERATIONAL_KG_CO2E} kg CO₂e per job (diagnostics, equipment, shop overhead — placeholder from facility energy literature, pending measured data).`,
  },
  {
    lead: "Scope",
    body: "Uses your LCA device manufacturing column and component/part footprints. Formal repair-network logistics and full shop LCA are out of scope for now.",
  },
  {
    lead: "Multiple repairs",
    body: "Each repair is estimated on its own. Savings are not netted across repeated work on the same device.",
  },
  {
    lead: "Data matching",
    body: "Results depend on mapping each job to an LCA device row and every part to a component line. Partial or unmapped rows reduce precision.",
  },
  {
    lead: "Illustrative equivalents",
    body: "Trees, phones, food, and shower lines use rounded public-style factors for storytelling only, not formal carbon accounting.",
  },
];

/** Plain lines for PDF and other non-HTML outputs. */
export function modelAssumptionLinesForPdf(): string[] {
  return MODEL_ASSUMPTION_ITEMS.map((item) => `${item.lead}: ${item.body}`);
}
