'use strict';

/**
 * Core CO₂ avoidance math (methodology v2). Consumed by `lib/repairs.js` (Node-safe).
 *
 * P = probability that a repaired device displaced a new device purchase.
 * Sources cited in product copy: Prosman & Sacchi (2021), EEA (2020); rebound allowance
 * Zink et al. (2014), J. Industrial Ecology.
 */

/** @typedef {'conservative'|'central'|'optimistic'} ReplacementScenario */

const REPLACEMENT_PROBABILITY = Object.freeze({
  conservative: 0.7,
  central: 0.85,
  optimistic: 1.0,
});

const DEFAULT_SCENARIO = 'central';

const REPAIR_OPERATIONAL_KG_CO2E = 1.0;

const METHODOLOGY_VERSION = 'v2';

/** @type {ReadonlySet<string>} */
const VALID_SCENARIOS = new Set(['conservative', 'central', 'optimistic']);

/**
 * @param {unknown} scenario
 * @returns {ReplacementScenario}
 */
function normalizeReplacementScenario(scenario) {
  if (scenario == null) return DEFAULT_SCENARIO;
  const s = String(scenario).trim().toLowerCase();
  if (s === 'conservative' || s === 'central' || s === 'optimistic') {
    return /** @type {ReplacementScenario} */ (s);
  }
  return DEFAULT_SCENARIO;
}

/**
 * @param {number} manufacturing_co2
 * @param {number} partsCo2
 * @param {ReplacementScenario} [scenario]
 */
function calculateAvoidedCo2(manufacturing_co2, partsCo2, scenario = DEFAULT_SCENARIO) {
  const key = VALID_SCENARIOS.has(scenario) ? scenario : DEFAULT_SCENARIO;
  const P = REPLACEMENT_PROBABILITY[key];
  const m = Number(manufacturing_co2);
  const parts = Number(partsCo2);
  const manufacturingBaseline = Number.isFinite(m) ? m : 0;
  const repairBurden = (Number.isFinite(parts) ? parts : 0) + REPAIR_OPERATIONAL_KG_CO2E;
  const avoidedKg = Math.max(0, P * manufacturingBaseline - repairBurden);

  return {
    avoidedKg,
    scenario: key,
    P,
    manufacturingBaseline,
    repairBurden,
  };
}

module.exports = {
  REPLACEMENT_PROBABILITY,
  DEFAULT_SCENARIO,
  REPAIR_OPERATIONAL_KG_CO2E,
  METHODOLOGY_VERSION,
  normalizeReplacementScenario,
  calculateAvoidedCo2,
};
