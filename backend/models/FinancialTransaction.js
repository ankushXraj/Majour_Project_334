const mongoose = require("mongoose");
const crypto = require("crypto");

const financialTransactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    requestId: {
      type: String,
      index: true,
    },
    templeUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    templeName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["waste_estimate", "temple_payment", "product_sale", "processing_expense"],
      required: true,
    },
    status: {
      type: String,
      enum: ["Estimated", "Pending", "Paid", "Realized"],
      default: "Estimated",
    },
    flowerType: String,
    wasteQuantityKg: Number,
    usableWasteKg: Number,
    productKey: String,
    productName: String,
    estimatedOutputKg: Number,
    estimatedRevenueINR: Number,
    directProductionCostINR: Number,
    operatingExpensesINR: Number,
    totalExpensesINR: Number,
    grossProfitINR: Number,
    netProfitINR: Number,
    templeRewardINR: Number,
    flowercycleProfitINR: Number,
    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
    notes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

financialTransactionSchema.pre("validate", function (next) {
  if (!this.transactionId) {
    this.transactionId =
      "TX" + Date.now().toString().slice(-6) + crypto.randomBytes(2).toString("hex").toUpperCase();
  }
  next();
});

module.exports = mongoose.model("FinancialTransaction", financialTransactionSchema);
