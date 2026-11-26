const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");
const EcoProduct = require("../models/EcoProduct");
const { protect, authorize } = require("../middleware/auth");

// GET /api/eco-products — Get all products
router.get("/", protect, async (req, res) => {
  try {
    let filter = {};

    if (req.query.category && req.query.category !== "all") {
      filter.category = req.query.category;
    }

    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      filter.$or = [{ name: searchRegex }, { category: searchRegex }];
    }

    const products = await EcoProduct.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/eco-products/:id — Get a single product
router.get("/:id", protect, async (req, res) => {
  try {
    const product = await EcoProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/eco-products — Create a new product
router.post(
  "/",
  protect,
  authorize("admin", "processing"),
  [
    body("name").trim().notEmpty().withMessage("Product name is required"),
    body("category").notEmpty().withMessage("Category is required"),
    body("quantity").isInt({ min: 0 }).withMessage("Valid quantity is required"),
    body("price").isFloat({ min: 0 }).withMessage("Valid price is required"),
    body("date").notEmpty().withMessage("Date is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { name, category, quantity, price, costPrice, soldQuantity, wasteUsedKg, date, description } = req.body;

      const product = await EcoProduct.create({
        name,
        category,
        quantity,
        price,
        costPrice: costPrice !== undefined ? Number(costPrice) : Math.round(Number(price) * 0.45),
        soldQuantity: soldQuantity !== undefined ? Number(soldQuantity) : 0,
        wasteUsedKg: wasteUsedKg !== undefined ? Number(wasteUsedKg) : 0,
        date,
        description: description || "",
      });

      res.status(201).json({ success: true, data: product });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// PUT /api/eco-products/:id — Update a product
router.put("/:id", protect, authorize("admin", "processing"), async (req, res) => {
  try {
    let product = await EcoProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const updatable = ["name", "category", "quantity", "price", "costPrice", "soldQuantity", "wasteUsedKg", "date", "description"];
    updatable.forEach((key) => {
      if (req.body[key] !== undefined) product[key] = req.body[key];
    });

    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE /api/eco-products/:id — Delete a product
router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const product = await EcoProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await product.deleteOne();
    res.json({ success: true, message: "Product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
