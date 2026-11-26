const fs = require("fs");
const path = require("path");
const CalculationHistory = require("../models/CalculationHistory");

const REPORT_PATH = path.join(
  __dirname,
  "..",
  "..",
  "data",
  "processed",
  "ml_evaluation_report.json"
);

/**
 * Return honest ML readiness & scikit-learn evaluation report.
 * Never claims ML prediction for rule-based calculations.
 */
async function getMLStatus() {
  let evalReport = null;
  try {
    if (fs.existsSync(REPORT_PATH)) {
      evalReport = JSON.parse(fs.readFileSync(REPORT_PATH, "utf-8"));
    }
  } catch (err) {
    evalReport = null;
  }

  const loggedBatchCount = await CalculationHistory.countDocuments({
    source: { $in: ["temple_submission", "admin_submission"] },
  });

  const minRequiredForFinancialML = 100;

  return {
    activeEngine: "rule_based_validated",
    isMLFinancialPredictorActive: false,
    loggedSubmissionBatches: loggedBatchCount,
    minRequiredForFinancialML,
    readinessPct: Math.min(100, Math.round((loggedBatchCount / minRequiredForFinancialML) * 100)),
    evaluationReport: evalReport,
    architectureNote:
      "Calculations currently run on the validated Rule-Based Financial Engine (CSIR-NBRI / ICAR / MSME ratios). Every verified batch is logged in CalculationHistory so a scikit-learn model can be trained once >=100 empirical batches are collected.",
  };
}

module.exports = { getMLStatus };
