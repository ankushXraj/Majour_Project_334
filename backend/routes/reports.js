const express = require("express");
const router = express.Router();
const CollectionRequest = require("../models/CollectionRequest");
const WasteRecord = require("../models/WasteRecord");
const EcoProduct = require("../models/EcoProduct");
const { protect } = require("../middleware/auth");

// GET /api/reports — Get aggregated report data
router.get("/", protect, async (req, res) => {
  try {
    const requests = await CollectionRequest.find();
    const waste = await WasteRecord.find();
    const products = await EcoProduct.find();

    // Collection stats
    const totalRequests = requests.length;
    const statusBreakdown = {
      Pending: requests.filter((r) => r.status === "Pending").length,
      Collected: requests.filter((r) => r.status === "Collected").length,
      Processing: requests.filter((r) => r.status === "Processing").length,
      Completed: requests.filter((r) => r.status === "Completed").length,
    };
    const totalRequestedWaste = requests.reduce((sum, r) => sum + r.quantity, 0);

    // Waste stats
    const totalReceived = waste.reduce((sum, r) => sum + r.received, 0);
    const totalUsable = waste.reduce((sum, r) => sum + r.usable, 0);
    const totalOther = waste.reduce((sum, r) => sum + r.other, 0);

    // Product stats
    const totalProductUnits = products.reduce((sum, p) => sum + p.quantity, 0);
    const totalStockValue = products.reduce(
      (sum, p) => sum + p.quantity * p.price,
      0
    );
    const categories = [...new Set(products.map((p) => p.category))];
    const categoryBreakdown = categories.map((cat) => ({
      name: cat,
      total: products
        .filter((p) => p.category === cat)
        .reduce((sum, p) => sum + p.quantity, 0),
    }));

    // Recent activity (last 10)
    const activity = [
      ...requests.map((r) => ({
        id: r.requestId,
        name: r.temple,
        detail: `${r.quantity} kg · ${r.flower}`,
        status: r.status,
        date: r.date,
        type: "Collection",
      })),
      ...waste.map((r) => ({
        id: r.recordId,
        name: r.source,
        detail: `${r.received} kg received · ${r.usable} kg usable`,
        status: r.stage,
        date: r.date,
        type: "Waste",
      })),
      ...products.map((p) => ({
        id: p.productId,
        name: p.name,
        detail: `${p.quantity} units · ₹${p.price} each`,
        status: p.category,
        date: p.date,
        type: "Product",
      })),
    ]
      .sort((a, b) => String(b.date).localeCompare(String(a.date)))
      .slice(0, 10);

    // Export data
    const exportData = {
      requests: requests.map((r) => ({
        section: "Collection",
        id: r.requestId,
        name: r.temple,
        details: `${r.quantity} kg ${r.flower}`,
        status: r.status,
        date: r.date,
      })),
      waste: waste.map((r) => ({
        section: "Waste",
        id: r.recordId,
        name: r.source,
        details: `${r.received} kg received; ${r.usable} kg usable; ${r.other} kg other`,
        status: r.stage,
        date: r.date,
      })),
      products: products.map((p) => ({
        section: "Product",
        id: p.productId,
        name: p.name,
        details: `${p.quantity} units; ${p.price} per unit`,
        status: p.category,
        date: p.date,
      })),
    };

    res.json({
      success: true,
      data: {
        totalRequests,
        statusBreakdown,
        totalRequestedWaste,
        totalReceived,
        totalUsable,
        totalOther,
        totalProductUnits,
        totalStockValue,
        categoryBreakdown,
        activity,
        exportData,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
