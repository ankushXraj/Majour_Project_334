const mongoose = require("mongoose");

const financialConfigSchema = new mongoose.Schema(
  {
    configKey: {
      type: String,
      unique: true,
      default: "default",
    },
    version: {
      type: Number,
      default: 1,
    },
    priceDataDate: {
      type: String,
      default: "2026-11-27",
    },
    priceDataSource: {
      type: String,
      default: "CSIR-NBRI, ICAR/NCOF, MSME/KVIC & Indian Wholesale Benchmarks (data/product_prices.csv)",
    },
    // Dry-matter & rejection parameters by flowerType -> condition
    flowerParams: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        Marigold: {
          Fresh: { moisturePct: 82.5, dryMatterRatio: 0.175, rejectionPct: 5.0 },
          "Partially Dry": { moisturePct: 45.0, dryMatterRatio: 0.55, rejectionPct: 4.0 },
          "Fully Dry": { moisturePct: 10.0, dryMatterRatio: 0.90, rejectionPct: 2.5 },
        },
        Rose: {
          Fresh: { moisturePct: 80.0, dryMatterRatio: 0.20, rejectionPct: 5.0 },
          "Partially Dry": { moisturePct: 42.0, dryMatterRatio: 0.58, rejectionPct: 4.0 },
          "Fully Dry": { moisturePct: 10.0, dryMatterRatio: 0.90, rejectionPct: 2.5 },
        },
        Jasmine: {
          Fresh: { moisturePct: 84.0, dryMatterRatio: 0.16, rejectionPct: 6.0 },
          "Partially Dry": { moisturePct: 45.0, dryMatterRatio: 0.55, rejectionPct: 4.5 },
          "Fully Dry": { moisturePct: 10.0, dryMatterRatio: 0.90, rejectionPct: 3.0 },
        },
        Lotus: {
          Fresh: { moisturePct: 85.0, dryMatterRatio: 0.15, rejectionPct: 6.5 },
          "Partially Dry": { moisturePct: 48.0, dryMatterRatio: 0.52, rejectionPct: 5.0 },
          "Fully Dry": { moisturePct: 11.0, dryMatterRatio: 0.89, rejectionPct: 3.0 },
        },
        "Mixed Flowers": {
          Fresh: { moisturePct: 82.0, dryMatterRatio: 0.18, rejectionPct: 7.0 },
          "Partially Dry": { moisturePct: 45.0, dryMatterRatio: 0.55, rejectionPct: 5.5 },
          "Fully Dry": { moisturePct: 10.0, dryMatterRatio: 0.90, rejectionPct: 3.5 },
        },
      },
    },
    // Product conversion & market price benchmarks
    products: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        natural_incense: {
          name: "Natural Incense Sticks",
          category: "Incense",
          basis: "dry",
          processingLossPct: 6.0,
          additionalIngredientsMultiplier: 1.65,
          compostRawRatio: 0,
          sellingPriceINR: 380,
          priceMinINR: 250,
          priceMaxINR: 550,
          ingredientCostPerKgInput: 42,
          processingCostPerUsableKg: 14,
          needsDrying: true,
        },
        organic_compost: {
          name: "Organic Compost",
          category: "Compost",
          basis: "wet",
          processingLossPct: 8.0,
          additionalIngredientsMultiplier: 1.0,
          compostRawRatio: 0.44,
          sellingPriceINR: 12,
          priceMinINR: 8,
          priceMaxINR: 20,
          ingredientCostPerKgInput: 1.8,
          processingCostPerUsableKg: 4.5,
          needsDrying: false,
        },
        vermicompost: {
          name: "Vermicompost",
          category: "Compost",
          basis: "wet",
          processingLossPct: 5.0,
          additionalIngredientsMultiplier: 1.0,
          compostRawRatio: 0.52,
          sellingPriceINR: 14,
          priceMinINR: 10,
          priceMaxINR: 22,
          ingredientCostPerKgInput: 2.0,
          processingCostPerUsableKg: 5.5,
          needsDrying: false,
        },
        natural_colours: {
          name: "Natural Organic Colours",
          category: "Organic colours",
          basis: "dry",
          processingLossPct: 8.0,
          additionalIngredientsMultiplier: 2.80,
          compostRawRatio: 0,
          sellingPriceINR: 320,
          priceMinINR: 200,
          priceMaxINR: 500,
          ingredientCostPerKgInput: 75,
          processingCostPerUsableKg: 18,
          needsDrying: true,
        },
        decorative_items: {
          name: "Decorative Eco-Friendly Products",
          category: "Decorative items",
          basis: "dry",
          processingLossPct: 10.0,
          additionalIngredientsMultiplier: 1.85,
          compostRawRatio: 0,
          sellingPriceINR: 420,
          priceMinINR: 260,
          priceMaxINR: 650,
          ingredientCostPerKgInput: 95,
          processingCostPerUsableKg: 20,
          needsDrying: true,
        },
      },
    },
    // Operating & packaging cost rates (INR)
    costRates: {
      collectionPerKg: { type: Number, default: 2.0, min: 0 },
      transportPerKg: { type: Number, default: 2.5, min: 0 },
      labourPerUsableKg: { type: Number, default: 8.0, min: 0 },
      dryingPerUsableKg: { type: Number, default: 3.5, min: 0 },
      packagingPerOutputKg: { type: Number, default: 18.0, min: 0 },
      otherOperationalPerUsableKg: { type: Number, default: 2.5, min: 0 },
    },
    // Temple reward/payment policy
    templeRewardPolicy: {
      policyType: {
        type: String,
        enum: ["per_usable_kg", "revenue_share_pct", "hybrid"],
        default: "per_usable_kg",
      },
      ratePerUsableKg: { type: Number, default: 4.0, min: 0 },
      revenueSharePct: { type: Number, default: 10.0, min: 0, max: 50 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FinancialConfig", financialConfigSchema);
