const mongoose = require("mongoose");

const calculationHistorySchema = new mongoose.Schema(
  {
    source: {
      type: String,
      enum: ["temple_submission", "admin_submission", "simulator"],
      default: "simulator",
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    requestId: String,
    configVersion: Number,
    input: {
      flowerType: String,
      quantityKg: Number,
      condition: String,
      contaminationPct: Number,
      processingMethod: String,
      location: String,
      date: String,
    },
    output: {
      usableWasteKg: Number,
      dryFloralKg: Number,
      selectedProductKey: String,
      selectedProductName: String,
      estimatedOutputKg: Number,
      estimatedRevenueINR: Number,
      totalExpensesINR: Number,
      grossProfitINR: Number,
      netProfitINR: Number,
      templeRewardINR: Number,
      flowercycleProfitINR: Number,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CalculationHistory", calculationHistorySchema);
