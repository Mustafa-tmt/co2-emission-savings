/**
 * CO₂ equivalents: tangible storytelling (rounded benchmarks, not formal accounting).
 * @param {number} co2Kg
 * @param {{ seed?: string, scope?: 'job' | 'portfolio' }} [options]
 */

const FACTORS = {
  TREE_GROWTH_YR: 22.0,
  SMARTPHONE_CHARGE: 0.0083,
  BEEF_BURGER: 3.2,
  PLASTIC_BAGS: 0.033,
  HOT_SHOWER_MIN: 0.22,
};

const format = (num) => Math.round(Number(num)).toLocaleString();

function getCO2Equivalents(co2Kg, options = {}) {
  const kg = Number(co2Kg);
  if (!Number.isFinite(kg) || kg <= 0) {
    return null;
  }

  const isPortfolio = options.scope === 'portfolio';
  const leadIn = isPortfolio ? 'Together, these projects have' : 'This project has';

  const treeYears = kg / FACTORS.TREE_GROWTH_YR;
  let treeStatement = '';
  if (treeYears < 1) {
    const days = Math.max(1, Math.round(treeYears * 365));
    treeStatement = `That's the equivalent of a mature tree breathing for ${days} days.`;
  } else {
    treeStatement = `That's the work of ${treeYears.toFixed(1)} mature trees absorbing CO2 for an entire year.`;
  }

  let lifestyleTitle = '';
  let lifestyleBody = '';

  if (kg < 5) {
    const bags = format(kg / FACTORS.PLASTIC_BAGS);
    lifestyleTitle = 'Plastic reduction';
    lifestyleBody = `Like preventing ${bags} single-use plastic bags from being manufactured.`;
  } else if (kg < 50) {
    const burgers = format(kg / FACTORS.BEEF_BURGER);
    lifestyleTitle = 'Sustainable dining';
    lifestyleBody = `Equal to the carbon footprint of ${burgers} beef burgers.`;
  } else {
    const showerHours = (kg / FACTORS.HOT_SHOWER_MIN / 60).toFixed(1);
    lifestyleTitle = 'Energy savings';
    lifestyleBody = `Enough energy to power ${showerHours} hours of continuous hot showers.`;
  }

  const charges = format(kg / FACTORS.SMARTPHONE_CHARGE);
  const yearsOfCharging = (kg / FACTORS.SMARTPHONE_CHARGE / 365).toFixed(1);

  return {
    co2Kg: Math.round(kg * 10) / 10,
    totalSaved: `${kg.toFixed(1)} kg CO2e`,
    headline: `${leadIn} offset a significant environmental footprint.`,
    impacts: [
      {
        icon: 'tree',
        title: "Nature's lungs",
        body: treeStatement,
      },
      {
        icon: 'lifestyle',
        title: lifestyleTitle,
        body: lifestyleBody,
      },
      {
        icon: 'tech',
        title: 'Power grid',
        body: `Enough energy to fully charge a smartphone ${charges} times—roughly ${yearsOfCharging} years of daily charging.`,
      },
    ],
    footer: 'Small changes, massive ripples. Thank you for making an impact.',
  };
}

module.exports = { getCO2Equivalents };
