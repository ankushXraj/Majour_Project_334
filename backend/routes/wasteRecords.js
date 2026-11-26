const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const WasteRecord = require("../models/WasteRecord");
const { protect, authorize } = require("../middleware/auth");

// GET /api/waste-records — Get all waste records
router.get("/", protect, authorize("admin", "processing"), async (req, res) => {
  try {
    let filter = {};

    if (req.query.stage && req.query.stage !== "all") {
      filter.stage = req.query.stage;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [{ source: searchRegex }, { flower: searchRegex }];
    }

    const records = await WasteRecord.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/waste-records/:id — Get a single record
router.get("/:id", protect, authorize("admin", "processing"), async (req, res) => {
  try {
    const record = await WasteRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/waste-records/by-request/:requestId — Check if waste record exists for a request
router.get("/by-request/:requestId", protect, async (req, res) => {
  try {
    const record = await WasteRecord.findOne({
      sourceRequestId: req.params.requestId,
    });
    res.json({ success: true, exists: !!record, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/waste-records — Create a new waste record
router.post(
  "/",
  protect,
  authorize("admin", "processing"),
  [
    body("source").trim().notEmpty().withMessage("Source/temple name is required"),
    body("flower").notEmpty().withMessage("Flower type is required"),
    body("received").isFloat({ min: 0.1 }).withMessage("Valid received quantity is required"),
    body("usable").isFloat({ min: 0 }).withMessage("Valid usable quantity is required"),
    body("other").isFloat({ min: 0 }).withMessage("Valid other material quantity is required"),
    body("date").notEmpty().withMessage("Date is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { source, flower, received, usable, other, date, stage, notes, sourceRequestId } = req.body;

      if (usable + other > received + 0.00001) {
        return res.status(400).json({
          success: false,
          message: "Usable flowers + other material cannot exceed received quantity",
        });
      }

      // Check if waste record already exists for this request
      if (sourceRequestId) {
        const existing = await WasteRecord.findOne({ sourceRequestId });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: "A waste record already exists for this collection request",
          });
        }
      }

      const record = await WasteRecord.create({
        source,
        flower,
        received,
        usable,
        other,
        date,
        stage: stage || "Awaiting processing",
        notes: notes || "",
        sourceRequestId: sourceRequestId || null,
      });

      res.status(201).json({ success: true, data: record });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/waste-records/:id — Update a waste record
router.put("/:id", protect, authorize("admin", "processing"), async (req, res) => {
  try {
    let record = await WasteRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    const updatable = ["source", "flower", "received", "usable", "other", "date", "stage", "notes"];
    updatable.forEach((key) => {
      if (req.body[key] !== undefined) record[key] = req.body[key];
    });

    await record.save();
    res.json({ success: true, data: record });
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/waste-records/:id/stage — Update only the stage
router.patch("/:id/stage", protect, authorize("admin", "processing"), async (req, res) => {
  try {
    const record = await WasteRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    record.stage = req.body.stage;
    await record.save();

    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/waste-records/:id — Delete a waste record
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const record = await WasteRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    await record.deleteOne();
    res.json({ success: true, message: "Waste record deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
