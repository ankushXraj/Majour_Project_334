const express = require("express");
const router = express.Router();
const CollectionRequest = require("../models/CollectionRequest");
const WasteRecord = require("../models/WasteRecord");
const EcoProduct = require("../models/EcoProduct");
const { protect } = require("../middleware/auth");

// GET /api/dashboard — Get dashboard overview data
router.get("/", protect, async (req, res) => {
  try {
    const requests = await CollectionRequest.find().sort({ createdAt: -1 });
    const waste = await WasteRecord.find();
    const products = await EcoProduct.find();

    // Stats cards
    const totalCollectedWaste = waste.reduce((sum, r) => sum + r.received, 0);
    const pendingRequests = requests.filter((r) => r.status === "Pending").length;
    const wasteProcessed = waste
      .filter((r) => r.stage === "Sent for processing")
      .reduce((sum, r) => sum + r.received, 0);
    const ecoProductsRecorded = products.reduce(
      (sum, p) => sum + p.quantity,
      0
    );

    // Recent requests (top 5)
    const recentRequests = requests.slice(0, 5).map((r) => ({
      temple: r.temple,
      flower: r.flower,
      quantity: r.quantity,
      status: r.status,
    }));

    // Product categories
    const categories = [...new Set(products.map((p) => p.category))];
    const productCategories = categories.map((cat) => ({
      name: cat,
      count: products
        .filter((p) => p.category === cat)
        .reduce((sum, p) => sum + p.quantity, 0),
    }));

    // Waste cycle overview
    const totalReceived = waste.reduce((sum, r) => sum + r.received, 0);
    const awaitingProcessing = waste
      .filter((r) => r.stage !== "Sent for processing")
      .reduce((sum, r) => sum + r.received, 0);

    res.json({
      success: true,
      data: {
        stats: {
          totalCollectedWaste,
          pendingRequests,
          wasteProcessed,
          ecoProductsRecorded,
        },
        recentRequests,
        productCategories,
        wasteCycle: {
          collected: totalReceived,
          processed: wasteProcessed,
          awaiting: awaitingProcessing,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
