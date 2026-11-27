const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const FinancialConfig = require("../models/FinancialConfig");
const FinancialTransaction = require("../models/FinancialTransaction");
const CalculationHistory = require("../models/CalculationHistory");
const CollectionRequest = require("../models/CollectionRequest");
const WasteRecord = require("../models/WasteRecord");
const EcoProduct = require("../models/EcoProduct");
const { getActiveConfig, calculateWasteToWealth } = require("../services/financialEngine");
const { getMLStatus } = require("../services/mlPredictor");

// POST /api/financial/simulate — Smart Waste-to-Wealth Calculator (backend-calculated)
router.post("/simulate", async (req, res) => {
  try {
    const { flowerType, quantity, condition, contaminationPct, processingMethod } = req.body;
    const qty = Number(quantity);
    if (!qty || qty <= 0 || qty > 100000) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid waste quantity between 0.1 and 100,000 kg.",
      });
    }

    const config = await getActiveConfig();
    const result = calculateWasteToWealth(
      {
        flowerType: flowerType || "Marigold",
        quantity: qty,
        condition: condition || "Fresh",
        contaminationPct: contaminationPct ?? 5,
        processingMethod: processingMethod || "auto_best",
      },
      config
    );

    // Log simulator run in CalculationHistory if DB is connected
    try {
      const mongoose = require("mongoose");
      if (mongoose.connection && mongoose.connection.readyState === 1) {
        await CalculationHistory.create({
          source: "simulator",
          configVersion: config.version,
          input: {
            flowerType: result.inputSummary.flowerType,
            quantityKg: result.inputSummary.totalWasteKg,
            condition: result.inputSummary.condition,
            contaminationPct: result.inputSummary.contaminationPct,
            processingMethod: result.inputSummary.requestedMethod,
            date: new Date().toISOString().slice(0, 10),
          },
          output: {
            usableWasteKg: result.massBalance.usableWasteKg,
            dryFloralKg: result.massBalance.dryFloralKg,
            selectedProductKey: result.selected.productKey,
            selectedProductName: result.selected.productName,
            estimatedOutputKg: result.selected.estimatedOutputKg,
            estimatedRevenueINR: result.selected.totalRevenueINR,
            totalExpensesINR: result.selected.totalExpensesINR,
            grossProfitINR: result.selected.grossProfitINR,
            netProfitINR: result.selected.netProfitINR,
            templeRewardINR: result.selected.templeRewardINR,
            flowercycleProfitINR: result.selected.flowercycleProfitINR,
          },
        });
      }
    } catch (logErr) {
      console.warn("Simulator history logging skipped:", logErr.message);
    }

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial/config — View active configurable conversion ratios, prices & costs
router.get("/config", async (req, res) => {
  try {
    const config = await getActiveConfig();
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/financial/config — Admin updates conversion ratios, prices, costs, or reward policy
router.put("/config", protect, authorize("admin"), async (req, res) => {
  try {
    const config = await getActiveConfig();

    if (req.body.products) {
      config.products = { ...config.products, ...req.body.products };
      config.markModified("products");
    }
    if (req.body.costRates) {
      config.costRates = { ...config.costRates.toObject(), ...req.body.costRates };
    }
    if (req.body.templeRewardPolicy) {
      config.templeRewardPolicy = {
        ...config.templeRewardPolicy.toObject(),
        ...req.body.templeRewardPolicy,
      };
    }
    if (req.body.flowerParams) {
      config.flowerParams = { ...config.flowerParams, ...req.body.flowerParams };
      config.markModified("flowerParams");
    }
    if (req.body.priceDataDate) config.priceDataDate = req.body.priceDataDate;
    if (req.body.priceDataSource) config.priceDataSource = req.body.priceDataSource;

    config.version = (config.version || 1) + 1;
    await config.save();

    res.json({ success: true, message: "Financial configuration updated", data: config });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial/analytics — Admin Financial Analytics Dashboard with filters
router.get("/analytics", protect, authorize("admin", "processing"), async (req, res) => {
  try {
    const { startDate, endDate, flower, category, temple } = req.query;

    // 1. Filter CollectionRequests & WasteRecords & EcoProducts
    const reqFilter = {};
    if (startDate || endDate) {
      reqFilter.date = {};
      if (startDate) reqFilter.date.$gte = startDate;
      if (endDate) reqFilter.date.$lte = endDate;
    }
    if (flower && flower !== "all") {
      reqFilter.flower = flower === "Mixed Flowers" ? { $in: ["Mixed", "Mixed Flowers"] } : flower;
    }
    if (temple && temple !== "all") {
      reqFilter.temple = temple;
    }

    const wasteFilter = {};
    if (startDate || endDate) {
      wasteFilter.date = {};
      if (startDate) wasteFilter.date.$gte = startDate;
      if (endDate) wasteFilter.date.$lte = endDate;
    }
    if (flower && flower !== "all") {
      wasteFilter.flower = flower === "Mixed Flowers" ? { $in: ["Mixed", "Mixed Flowers"] } : flower;
    }
    if (temple && temple !== "all") {
      wasteFilter.source = temple;
    }

    const prodFilter = {};
    if (startDate || endDate) {
      prodFilter.date = {};
      if (startDate) prodFilter.date.$gte = startDate;
      if (endDate) prodFilter.date.$lte = endDate;
    }
    if (category && category !== "all") {
      prodFilter.category = category;
    }

    const [requests, wasteRecords, products, transactions, allTemples] = await Promise.all([
      CollectionRequest.find(reqFilter).sort({ date: 1 }),
      WasteRecord.find(wasteFilter).sort({ date: 1 }),
      EcoProduct.find(prodFilter).sort({ date: 1 }),
      FinancialTransaction.find().sort({ createdAt: -1 }),
      CollectionRequest.distinct("temple"),
    ]);

    const config = await getActiveConfig();

    // Actual Realized Financials from EcoProduct sales & WasteRecord processing
    let actualRevenueINR = 0;
    let actualDirectCostINR = 0;
    const productWiseMap = {};

    products.forEach((p) => {
      const sold = Number(p.soldQuantity || 0);
      const rev = sold * Number(p.price || 0);
      const cogs = sold * Number(p.costPrice || Math.round(Number(p.price || 0) * 0.45));
      actualRevenueINR += rev;
      actualDirectCostINR += cogs;

      if (!productWiseMap[p.category]) {
        productWiseMap[p.category] = { category: p.category, revenue: 0, cost: 0, profit: 0, unitsSold: 0 };
      }
      productWiseMap[p.category].revenue += rev;
      productWiseMap[p.category].cost += cogs;
      productWiseMap[p.category].profit += rev - cogs;
      productWiseMap[p.category].unitsSold += sold;
    });

    const totalWasteCollectedKg = requests.reduce((s, r) => s + Number(r.quantity || 0), 0);
    const totalWasteProcessedKg = wasteRecords
      .filter((w) => w.stage === "Sent for processing")
      .reduce((s, w) => s + Number(w.received || 0), 0);
    const totalWasteReceivedKg = wasteRecords.reduce((s, w) => s + Number(w.received || 0), 0);
    const totalProcessingExpenditureINR = wasteRecords.reduce(
      (s, w) => s + (Number(w.processingCost) || Number(w.received || 0) * 4),
      0
    );

    // Estimated Pipeline & Temple Payments from CollectionRequests
    let estimatedPipelineRevenueINR = 0;
    let estimatedPipelineExpensesINR = 0;
    let totalTemplePaymentsEstimatedINR = 0;
    let totalTemplePaymentsPaidINR = 0;

    const flowerProfitMap = {};
    const monthlyMap = {};

    const ensureMonth = (ym) => {
      if (!monthlyMap[ym]) {
        monthlyMap[ym] = { month: ym, actualRevenue: 0, actualCost: 0, actualProfit: 0, estimatedRevenue: 0 };
      }
    };

    requests.forEach((r) => {
      const est =
        r.financialEstimate ||
        calculateWasteToWealth(
          {
            flower: r.flower,
            quantity: r.quantity,
            condition: r.condition || "Fresh",
            contaminationPct: r.contaminationPct ?? 5,
            preferredMethod: r.preferredMethod || "auto_best",
          },
          config
        );

      const sel = est.selected || {};
      const estRev = Number(sel.totalRevenueINR || 0);
      const estExp = Number(sel.totalExpensesINR || 0);
      const reward = Number(sel.templeRewardINR || 0);
      const fcProfit = Number(sel.flowercycleProfitINR || 0);

      if (category && category !== "all" && sel.category !== category) {
        return;
      }

      estimatedPipelineRevenueINR += estRev;
      estimatedPipelineExpensesINR += estExp;
      totalTemplePaymentsEstimatedINR += reward;

      const fKey = r.flower === "Mixed" ? "Mixed Flowers" : r.flower;
      if (!flowerProfitMap[fKey]) {
        flowerProfitMap[fKey] = { flower: fKey, totalKg: 0, estimatedRevenue: 0, estimatedProfit: 0 };
      }
      flowerProfitMap[fKey].totalKg += Number(r.quantity || 0);
      flowerProfitMap[fKey].estimatedRevenue += estRev;
      flowerProfitMap[fKey].estimatedProfit += fcProfit;

      const ym = String(r.date || "").slice(0, 7);
      if (ym) {
        ensureMonth(ym);
        monthlyMap[ym].estimatedRevenue += estRev;
      }
    });

    // Add paid temple transactions
    transactions
      .filter((t) => t.status === "Paid")
      .forEach((t) => {
        totalTemplePaymentsPaidINR += Number(t.templeRewardINR || 0);
      });

    products.forEach((p) => {
      const ym = String(p.date || "").slice(0, 7);
      if (!ym) return;
      ensureMonth(ym);
      const sold = Number(p.soldQuantity || 0);
      const rev = sold * Number(p.price || 0);
      const cogs = sold * Number(p.costPrice || Math.round(Number(p.price || 0) * 0.45));
      monthlyMap[ym].actualRevenue += rev;
      monthlyMap[ym].actualCost += cogs;
    });

    wasteRecords.forEach((w) => {
      const ym = String(w.date || "").slice(0, 7);
      if (!ym) return;
      ensureMonth(ym);
      monthlyMap[ym].actualCost += Number(w.processingCost) || Number(w.received || 0) * 4;
    });

    const monthlyPnL = Object.values(monthlyMap)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((m) => ({
        ...m,
        actualProfit: Math.round(m.actualRevenue - m.actualCost),
      }));

    const grossProfitINR = Math.round(actualRevenueINR - actualDirectCostINR);
    const netProfitINR = Math.round(
      actualRevenueINR - actualDirectCostINR - totalProcessingExpenditureINR - totalTemplePaymentsPaidINR
    );

    const productWiseRevenue = Object.values(productWiseMap).sort((a, b) => b.revenue - a.revenue);
    const flowerProfitability = Object.values(flowerProfitMap).sort(
      (a, b) => b.estimatedProfit - a.estimatedProfit
    );

    const mostProfitableProduct = [...products]
      .map((p) => {
        const sold = Number(p.soldQuantity || 0);
        const rev = sold * Number(p.price || 0);
        const cogs = sold * Number(p.costPrice || Math.round(Number(p.price || 0) * 0.45));
        return { name: p.name, category: p.category, profit: rev - cogs, revenue: rev };
      })
      .sort((a, b) => b.profit - a.profit)[0] || null;

    const mostProfitableFlower = flowerProfitability[0] || null;

    res.json({
      success: true,
      data: {
        filters: { availableTemples: allTemples },
        summary: {
          totalWasteCollectedKg: Math.round(totalWasteCollectedKg * 100) / 100,
          totalWasteReceivedKg: Math.round(totalWasteReceivedKg * 100) / 100,
          totalWasteProcessedKg: Math.round(totalWasteProcessedKg * 100) / 100,
          // Actual realized numbers
          actualRevenueINR: Math.round(actualRevenueINR),
          actualDirectCostINR: Math.round(actualDirectCostINR),
          totalProcessingExpenditureINR: Math.round(totalProcessingExpenditureINR),
          grossProfitINR,
          netProfitINR,
          totalTemplePaymentsPaidINR: Math.round(totalTemplePaymentsPaidINR),
          // Estimated pipeline numbers (explicitly separated from actuals!)
          estimatedPipelineRevenueINR: Math.round(estimatedPipelineRevenueINR),
          estimatedPipelineExpensesINR: Math.round(estimatedPipelineExpensesINR),
          totalTemplePaymentsEstimatedINR: Math.round(totalTemplePaymentsEstimatedINR),
        },
        mostProfitableFlower,
        mostProfitableProduct,
        productWiseRevenue,
        flowerProfitability,
        monthlyPnL,
        recentTransactions: transactions.slice(0, 15),
        disclaimer:
          "Actual Revenue & Net Profit are computed strictly from recorded Eco-Product sales and Waste processing expenses. Estimated Pipeline metrics are projection estimates from incoming collection requests.",
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial/transactions — List financial & temple reward transactions
router.get("/transactions", protect, async (req, res) => {
  try {
    const filter = {};
    if (req.user.role === "temple") {
      filter.templeUser = req.user._id;
    }
    const list = await FinancialTransaction.find(filter).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/financial/transactions/:id/pay — Admin marks a temple reward transaction as Paid
router.patch("/transactions/:id/pay", protect, authorize("admin"), async (req, res) => {
  try {
    const tx = await FinancialTransaction.findById(req.params.id);
    if (!tx) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }
    tx.status = "Paid";
    tx.type = "temple_payment";
    await tx.save();
    res.json({ success: true, data: tx });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial/ml-status — ML suitability & evaluation report
router.get("/ml-status", async (req, res) => {
  try {
    const status = await getMLStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/financial/history — Recent calculation history
router.get("/history", protect, async (req, res) => {
  try {
    const filter = req.user.role === "temple" ? { user: req.user._id } : {};
    const history = await CalculationHistory.find(filter).sort({ createdAt: -1 }).limit(30);
    res.json({ success: true, count: history.length, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
