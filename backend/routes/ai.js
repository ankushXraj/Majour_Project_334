const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const { protect } = require("../middleware/auth");
const { computeFullAnalysis, answerQuestion } = require("../services/aiAnalyst");
const CollectionRequest = require("../models/CollectionRequest");
const WasteRecord = require("../models/WasteRecord");
const EcoProduct = require("../models/EcoProduct");

// GET /api/ai/analysis — Full AI Profit, Loss & Forecast analysis
router.get("/analysis", protect, async (req, res) => {
  try {
    const analysis = await computeFullAnalysis();
    res.json({ success: true, data: analysis });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/ai/chat — Interactive AI Profit Analyst Q&A
router.post("/chat", protect, async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !String(question).trim()) {
      return res.status(400).json({ success: false, message: "Please enter a question" });
    }
    const result = await answerQuestion(question);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/ai/dataset?format=csv|json — Export live dataset from MongoDB
router.get("/dataset", protect, async (req, res) => {
  try {
    const format = (req.query.format || "csv").toLowerCase();
    const [requests, waste, products] = await Promise.all([
      CollectionRequest.find().sort({ date: 1 }).lean(),
      WasteRecord.find().sort({ date: 1 }).lean(),
      EcoProduct.find().sort({ date: 1 }).lean(),
    ]);

    if (format === "json") {
      res.setHeader("Content-Disposition", 'attachment; filename="flowercycle-dataset.json"');
      return res.json({
        generatedAt: new Date().toISOString(),
        counts: {
          collectionRequests: requests.length,
          wasteRecords: waste.length,
          ecoProducts: products.length,
        },
        collectionRequests: requests,
        wasteRecords: waste,
        ecoProducts: products,
      });
    }

    const rows = [
      ["DatasetSection", "RecordID", "Date", "NameOrSource", "CategoryOrFlower", "PrimaryQty", "SecondaryQty", "UnitPriceINR", "CostPriceINR", "SoldUnits", "StatusOrStage"],
    ];
    requests.forEach((r) =>
      rows.push(["CollectionRequest", r.requestId, r.date, r.temple, r.flower, r.quantity, "", "", "", "", r.status])
    );
    waste.forEach((w) =>
      rows.push(["WasteRecord", w.recordId, w.date, w.source, w.flower, w.received, w.usable, "", w.processingCost || 0, "", w.stage])
    );
    products.forEach((p) =>
      rows.push(["EcoProduct", p.productId, p.date, p.name, p.category, p.quantity, p.wasteUsedKg || 0, p.price, p.costPrice || 0, p.soldQuantity || 0, "InInventory"])
    );

    const csv = rows
      .map((row) => row.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(","))
      .join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="flowercycle-dataset.csv"');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
