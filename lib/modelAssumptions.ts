/**
 * High-level limitations & assumptions for the repair vs replace CO₂ model.
 * `lead` is emphasised in the web dialog; PDF uses “Lead: body”.
 */
export type ModelAssumptionItem = { readonly lead: string; readonly body: string };

export const MODEL_ASSUMPTION_ITEMS: readonly ModelAssumptionItem[] = [
  {
    lead: "Baseline",
    body: 'Avoided CO₂ is estimated versus replacing the device with a new one (not “no repair” or a used-device alternative).',
  },
  {
    lead: "Scope",
    body: "Uses your LCA device and part footprints (manufacturing-oriented). Repair logistics and shop-level impacts are excluded for now.",
  },
  {
    lead: "Multiple repairs",
    body: "Each repair is estimated on its own. Savings are not netted across repeated work on the same device.",
  },
  {
    lead: "Repair time and energy",
    body: "Not included in this phase. Planned once detailed operational monitoring is available.",
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
