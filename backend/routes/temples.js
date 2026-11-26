const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { protect, authorize } = require("../middleware/auth");

// GET /api/temples — Get all registered temples
router.get("/", protect, authorize("admin", "collection"), async (req, res) => {
  try {
    const temples = await User.find({ role: "temple" }).select("-password").sort({ createdAt: -1 });
    res.json({ success: true, count: temples.length, data: temples });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/temples/:id — Get a single temple
router.get("/:id", protect, async (req, res) => {
  try {
    const temple = await User.findById(req.params.id).select("-password");
    if (!temple || temple.role !== "temple") {
      return res.status(404).json({ success: false, message: "Temple not found" });
    }
    res.json({ success: true, data: temple });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
