const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const CollectionRequest = require("../models/CollectionRequest");
const FinancialTransaction = require("../models/FinancialTransaction");
const CalculationHistory = require("../models/CalculationHistory");
const { getActiveConfig, calculateWasteToWealth } = require("../services/financialEngine");
const { protect, authorize } = require("../middleware/auth");

// GET /api/collection-requests — Get all requests (admin/collection team)
//     or only the current temple's requests (temple role)
router.get("/", protect, async (req, res) => {
  try {
    let filter = {};

    // Temple users can only see their own requests
    if (req.user.role === "temple") {
      filter.templeUser = req.user._id;
    }

    // Status filter
    if (req.query.status && req.query.status !== "all") {
      filter.status = req.query.status;
    }

    // Search filter
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [{ temple: searchRegex }, { flower: searchRegex }];
    }

    const requests = await CollectionRequest.find(filter).sort({
      createdAt: -1,
    });

    res.json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/collection-requests/:id — Get a single request
router.get("/:id", protect, async (req, res) => {
  try {
    const request = await CollectionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // Temple users can only view their own
    if (req.user.role === "temple" && String(request.templeUser) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/collection-requests — Create a new request
router.post(
  "/",
  protect,
  [
    body("flower").notEmpty().withMessage("Flower type is required"),
    body("quantity").isFloat({ min: 0.1 }).withMessage("Valid quantity is required"),
    body("date").notEmpty().withMessage("Pickup date is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        temple,
        flower,
        quantity,
        condition,
        contaminationPct,
        preferredMethod,
        date,
        status,
        notes,
        contact,
        address,
      } = req.body;

      const safeCondition = ["Fresh", "Partially Dry", "Fully Dry"].includes(condition)
        ? condition
        : "Fresh";
      const safeContam =
        contaminationPct !== undefined ? Math.min(95, Math.max(0, Number(contaminationPct))) : 5;
      const safeMethod = preferredMethod || "auto_best";

      // Always compute financial estimate server-side (prevent client tampering)
      const config = await getActiveConfig();
      const financialEstimate = calculateWasteToWealth(
        {
          flower,
          quantity: Number(quantity),
          condition: safeCondition,
          contaminationPct: safeContam,
          preferredMethod: safeMethod,
        },
        config
      );

      const templeName = temple || req.user.templeName || req.user.name;

      const request = await CollectionRequest.create({
        temple: templeName,
        templeUser: req.user.role === "temple" ? req.user._id : undefined,
        flower,
        quantity: Number(quantity),
        condition: safeCondition,
        contaminationPct: safeContam,
        preferredMethod: safeMethod,
        date,
        status: status || "Pending",
        notes: notes || "",
        contact: contact || req.user.phone || "",
        address: address || req.user.address || "",
        origin: req.user.role === "temple" ? "templePortal" : "admin",
        financialEstimate,
      });

      const sel = financialEstimate.selected;
      await Promise.all([
        FinancialTransaction.create({
          requestId: request.requestId,
          templeUser: request.templeUser,
          templeName,
          type: "waste_estimate",
          status: "Estimated",
          flowerType: financialEstimate.inputSummary.flowerType,
          wasteQuantityKg: request.quantity,
          usableWasteKg: financialEstimate.massBalance.usableWasteKg,
          productKey: sel.productKey,
          productName: sel.productName,
          estimatedOutputKg: sel.estimatedOutputKg,
          estimatedRevenueINR: sel.totalRevenueINR,
          directProductionCostINR: sel.directProductionCostINR,
          operatingExpensesINR: sel.operatingOverheadINR,
          totalExpensesINR: sel.totalExpensesINR,
          grossProfitINR: sel.grossProfitINR,
          netProfitINR: sel.netProfitINR,
          templeRewardINR: sel.templeRewardINR,
          flowercycleProfitINR: sel.flowercycleProfitINR,
          date: request.date,
          notes: `Auto-generated estimate for ${request.requestId}`,
        }),
        CalculationHistory.create({
          source: req.user.role === "temple" ? "temple_submission" : "admin_submission",
          user: req.user._id,
          requestId: request.requestId,
          configVersion: config.version,
          input: {
            flowerType: financialEstimate.inputSummary.flowerType,
            quantityKg: request.quantity,
            condition: safeCondition,
            contaminationPct: safeContam,
            processingMethod: safeMethod,
            location: request.address,
            date: request.date,
          },
          output: {
            usableWasteKg: financialEstimate.massBalance.usableWasteKg,
            dryFloralKg: financialEstimate.massBalance.dryFloralKg,
            selectedProductKey: sel.productKey,
            selectedProductName: sel.productName,
            estimatedOutputKg: sel.estimatedOutputKg,
            estimatedRevenueINR: sel.totalRevenueINR,
            totalExpensesINR: sel.totalExpensesINR,
            grossProfitINR: sel.grossProfitINR,
            netProfitINR: sel.netProfitINR,
            templeRewardINR: sel.templeRewardINR,
            flowercycleProfitINR: sel.flowercycleProfitINR,
          },
        }),
      ]);

      res.status(201).json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/collection-requests/:id — Update a request
router.put("/:id", protect, async (req, res) => {
  try {
    let request = await CollectionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // Temple users can only edit their own & only some fields
    if (req.user.role === "temple") {
      if (String(request.templeUser) !== String(req.user._id)) {
        return res.status(403).json({ success: false, message: "Not authorized" });
      }
      // Temple can only update notes, contact, address
      const allowed = ["notes", "contact", "address"];
      Object.keys(req.body).forEach((key) => {
        if (allowed.includes(key)) request[key] = req.body[key];
      });
    } else {
      // Admin / collection team can update everything
      const updatable = ["temple", "flower", "quantity", "date", "status", "notes", "contact", "address"];
      updatable.forEach((key) => {
        if (req.body[key] !== undefined) request[key] = req.body[key];
      });
    }

    await request.save();
    res.json({ success: true, data: request });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/collection-requests/:id/status — Update only the status
router.patch(
  "/:id/status",
  protect,
  authorize("admin", "collection"),
  async (req, res) => {
    try {
      const request = await CollectionRequest.findById(req.params.id);
      if (!request) {
        return res.status(404).json({ success: false, message: "Request not found" });
      }

      request.status = req.body.status;
      await request.save();

      res.json({ success: true, data: request });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// DELETE /api/collection-requests/:id — Delete a request
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const request = await CollectionRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    await request.deleteOne();
    res.json({ success: true, message: "Request deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
