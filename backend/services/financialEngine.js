const FinancialConfig = require("../models/FinancialConfig");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Retrieve active FinancialConfig from MongoDB, creating default if missing.
 */
async function getActiveConfig() {
  let cfg = await FinancialConfig.findOne({ configKey: "default" });
  if (!cfg) {
    cfg = await FinancialConfig.create({ configKey: "default" });
  }
  return cfg;
}

/**
 * Normalize flower name to match FinancialConfig flowerParams keys.
 */
function normalizeFlowerType(flower) {
  const f = String(flower || "Marigold").trim();
  if (f === "Mixed" || f === "Other") return "Mixed Flowers";
  if (["Marigold", "Rose", "Jasmine", "Lotus", "Mixed Flowers"].includes(f)) return f;
  return "Mixed Flowers";
}

/**
 * Compute detailed conversion, revenue, expenses (no double counting),
 * gross/net profit, temple reward, and FlowerCycle final profit for a single product option.
 */
function computeProductOption(productKey, productCfg, params) {
  const {
    totalWasteKg,
    usableWasteKg,
    usableAfterRejectionKg,
    dryFloralKg,
    condition,
    costRates,
    templeRewardPolicy,
  } = params;

  const lossFactor = 1 - Number(productCfg.processingLossPct || 0) / 100;

  let estimatedOutputKg = 0;
  let additionalIngredientsCostINR = 0;

  if (productCfg.basis === "dry") {
    const netDryFloralKg = dryFloralKg * lossFactor;
    estimatedOutputKg = netDryFloralKg * Number(productCfg.additionalIngredientsMultiplier || 1);
    additionalIngredientsCostINR =
      dryFloralKg * Number(productCfg.ingredientCostPerKgInput || 0);
  } else {
    // Wet bioconversion (compost / vermicompost):
    // Partially or fully dry flowers are re-hydrated & co-composted with 40% cow dung/bulking material.
    const conditionHydrationFactor =
      condition === "Fully Dry" ? 1.85 : condition === "Partially Dry" ? 1.45 : 1.0;
    const effectiveBiomassKg = usableAfterRejectionKg * conditionHydrationFactor;
    estimatedOutputKg =
      effectiveBiomassKg * Number(productCfg.compostRawRatio || 0.44) * lossFactor;
    additionalIngredientsCostINR =
      usableWasteKg * Number(productCfg.ingredientCostPerKgInput || 0);
  }

  estimatedOutputKg = round2(estimatedOutputKg);

  // A. Revenue (Estimated + Min/Max Confidence Band)
  const sellingPriceINR = Number(productCfg.sellingPriceINR || 0);
  const priceMinINR = Number(productCfg.priceMinINR || sellingPriceINR * 0.75);
  const priceMaxINR = Number(productCfg.priceMaxINR || sellingPriceINR * 1.25);

  const totalRevenueINR = round2(estimatedOutputKg * sellingPriceINR);
  const revenueMinINR = round2(estimatedOutputKg * priceMinINR);
  const revenueMaxINR = round2(estimatedOutputKg * priceMaxINR);

  // B. Non-Double-Counted Expenses
  // 1) Direct Production Costs
  const dryingMultiplier =
    condition === "Fully Dry" ? 0 : condition === "Partially Dry" ? 0.5 : 1.0;
  const dryingCostINR = productCfg.needsDrying
    ? round2(usableWasteKg * Number(costRates.dryingPerUsableKg || 0) * dryingMultiplier)
    : 0;
  const processingCostINR = round2(
    usableWasteKg * Number(productCfg.processingCostPerUsableKg || 0)
  );
  const packagingCostINR = round2(
    estimatedOutputKg * Number(costRates.packagingPerOutputKg || 0)
  );
  additionalIngredientsCostINR = round2(additionalIngredientsCostINR);

  const directProductionCostINR = round2(
    dryingCostINR + processingCostINR + additionalIngredientsCostINR + packagingCostINR
  );

  // 2) Logistics & Operating Overhead
  const collectionCostINR = round2(totalWasteKg * Number(costRates.collectionPerKg || 0));
  const transportationCostINR = round2(totalWasteKg * Number(costRates.transportPerKg || 0));
  const labourCostINR = round2(usableWasteKg * Number(costRates.labourPerUsableKg || 0));
  const otherOperationalCostINR = round2(
    usableWasteKg * Number(costRates.otherOperationalPerUsableKg || 0)
  );

  const operatingOverheadINR = round2(
    collectionCostINR + transportationCostINR + labourCostINR + otherOperationalCostINR
  );

  const totalExpensesINR = round2(directProductionCostINR + operatingOverheadINR);

  // C. Gross Profit = Total Revenue - Direct Production Costs
  const grossProfitINR = round2(totalRevenueINR - directProductionCostINR);

  // D. Net Profit (before Temple Payment) = Total Revenue - All Operating Expenses
  const netProfitINR = round2(totalRevenueINR - totalExpensesINR);

  // E. Temple Payment based on configurable policy
  let templeRewardINR = 0;
  const policyType = templeRewardPolicy?.policyType || "per_usable_kg";
  const ratePerKg = Number(templeRewardPolicy?.ratePerUsableKg || 0);
  const sharePct = Number(templeRewardPolicy?.revenueSharePct || 0);

  if (policyType === "per_usable_kg") {
    templeRewardINR = round2(usableWasteKg * ratePerKg);
  } else if (policyType === "revenue_share_pct") {
    templeRewardINR = round2(Math.max(0, netProfitINR) * (sharePct / 100));
  } else {
    // hybrid
    templeRewardINR = round2(
      usableWasteKg * ratePerKg + Math.max(0, netProfitINR) * (sharePct / 100)
    );
  }

  // F. FlowerCycle Final Profit = Net Business Profit - Temple Payment
  const flowercycleProfitINR = round2(netProfitINR - templeRewardINR);

  const marginPct =
    totalRevenueINR > 0 ? round2((flowercycleProfitINR / totalRevenueINR) * 100) : 0;

  return {
    productKey,
    productName: productCfg.name,
    category: productCfg.category,
    basis: productCfg.basis,
    estimatedOutputKg,
    unit: "kg",
    sellingPriceINR,
    priceRangeINR: { min: priceMinINR, max: priceMaxINR },
    totalRevenueINR,
    revenueRangeINR: { min: revenueMinINR, max: revenueMaxINR },
    expenseBreakdown: {
      collectionCostINR,
      transportationCostINR,
      labourCostINR,
      dryingCostINR,
      processingCostINR,
      additionalIngredientsCostINR,
      packagingCostINR,
      otherOperationalCostINR,
    },
    directProductionCostINR,
    operatingOverheadINR,
    totalExpensesINR,
    grossProfitINR,
    netProfitINR,
    templeRewardINR,
    flowercycleProfitINR,
    marginPct,
    isProfitable: flowercycleProfitINR >= 0,
  };
}

/**
 * Main backend financial calculation entry point.
 * All numbers are computed server-side using FinancialConfig.
 */
function calculateWasteToWealth(input, config) {
  const totalWasteKg = Math.max(0.1, Number(input.quantity || input.quantityKg || 0));
  const contaminationPct = Math.min(95, Math.max(0, Number(input.contaminationPct ?? 5)));
  const flowerType = normalizeFlowerType(input.flower || input.flowerType);
  const condition = ["Fresh", "Partially Dry", "Fully Dry"].includes(input.condition)
    ? input.condition
    : "Fresh";
  const requestedMethod = input.preferredMethod || input.processingMethod || "auto_best";

  const flowerConditionMap =
    (config.flowerParams && config.flowerParams[flowerType]) ||
    config.flowerParams["Mixed Flowers"];
  const condParams = flowerConditionMap[condition] || flowerConditionMap.Fresh;

  // Step 1: Remove contamination
  const usableWasteKg = round2(totalWasteKg * (1 - contaminationPct / 100));
  const contaminationRemovedKg = round2(totalWasteKg - usableWasteKg);

  // Step 2: Account for sorting/handling rejection & moisture loss
  const handlingRejectionPct = Number(condParams.rejectionPct || 5);
  const usableAfterRejectionKg = round2(usableWasteKg * (1 - handlingRejectionPct / 100));
  const handlingRejectionKg = round2(usableWasteKg - usableAfterRejectionKg);
  const dryFloralKg = round2(usableAfterRejectionKg * Number(condParams.dryMatterRatio || 0.175));
  const moistureLossKg = round2(usableAfterRejectionKg - dryFloralKg);

  // Step 3: Evaluate all configured product pathways
  const productEntries = Object.entries(config.products || {});
  const allOptions = productEntries.map(([key, productCfg]) =>
    computeProductOption(key, productCfg, {
      totalWasteKg,
      usableWasteKg,
      usableAfterRejectionKg,
      dryFloralKg,
      condition,
      costRates: config.costRates || {},
      templeRewardPolicy: config.templeRewardPolicy || {},
    })
  );

  let selectedOption;
  if (requestedMethod === "auto_best") {
    selectedOption = [...allOptions].sort(
      (a, b) => b.flowercycleProfitINR - a.flowercycleProfitINR
    )[0];
  } else {
    selectedOption =
      allOptions.find((o) => o.productKey === requestedMethod) || allOptions[0];
  }

  // Environmental metrics (illustrative methane-diversion estimate: ~0.65 kg CO2e / kg organic flower waste)
  const co2DivertedKg = round2(usableWasteKg * 0.65);

  return {
    calculationMode: "Rule-Based Validated Engine (Non-ML)",
    isEstimate: true,
    configVersion: config.version || 1,
    priceDataDate: config.priceDataDate || "2026-11-27",
    priceDataSource: config.priceDataSource || "Indian Market & CSIR-NBRI/ICAR Benchmarks",
    inputSummary: {
      flowerType,
      totalWasteKg: round2(totalWasteKg),
      condition,
      contaminationPct: round2(contaminationPct),
      requestedMethod,
    },
    massBalance: {
      totalWasteKg: round2(totalWasteKg),
      contaminationRemovedKg,
      usableWasteKg,
      handlingRejectionPct,
      handlingRejectionKg,
      usableAfterRejectionKg,
      moisturePct: condParams.moisturePct,
      dryMatterRatio: condParams.dryMatterRatio,
      moistureLossKg,
      dryFloralKg,
    },
    selected: selectedOption,
    allProductOptions: allOptions,
    environmentalImpact: {
      wasteDivertedFromLandfillKg: usableWasteKg,
      estimatedCo2AvoidedKg: co2DivertedKg,
      note: "CO2e estimate (~0.65 kg/kg) is an illustrative organic landfill-diversion benchmark.",
    },
    disclaimer:
      "All financial values are backend estimates based on configurable conversion ratios and wholesale benchmark prices. Estimated earnings and temple rewards are indicative and not guaranteed payments.",
    calculatedAt: new Date().toISOString(),
  };
}

module.exports = {
  getActiveConfig,
  calculateWasteToWealth,
  normalizeFlowerType,
};
