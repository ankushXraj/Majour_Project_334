const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const ShopProduct = require("../models/ShopProduct");
const Cart = require("../models/Cart");
const Order = require("../models/Order");
const { protect, authorize } = require("../middleware/auth");

const DELIVERY_FREE_THRESHOLD = 499;
const STANDARD_DELIVERY_CHARGE = 49;

// Resolve authoritative price for a product + packSize from MongoDB
function resolveUnitPrice(product, requestedPackSize) {
  if (Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0 && requestedPackSize) {
    const match = product.sizeOptions.find((s) => s.label === requestedPackSize);
    if (match) return { unitPrice: Number(match.price), packSize: match.label };
  }
  return { unitPrice: Number(product.price), packSize: product.packSize };
}

// ── Public Catalog ──────────────────────────────────────────

// GET /api/shop/products
router.get("/products", async (req, res) => {
  try {
    const { category, variant, search, sort, includeDisabled } = req.query;
    const filter = {};

    if (includeDisabled !== "true") {
      filter.isActive = true;
    }
    if (category && category !== "all") {
      filter.category = category;
    }
    if (variant && variant !== "all") {
      filter.variant = variant;
    }
    if (search && search.trim()) {
      const rx = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: rx },
        { category: rx },
        { variant: rx },
        { description: rx },
      ];
    }

    let sortObj = { createdAt: 1 };
    if (sort === "price_asc") sortObj = { price: 1 };
    else if (sort === "price_desc") sortObj = { price: -1 };
    else if (sort === "newest") sortObj = { createdAt: -1 };

    const products = await ShopProduct.find(filter).sort(sortObj);
    res.json({
      success: true,
      count: products.length,
      deliveryConfig: {
        freeThresholdINR: DELIVERY_FREE_THRESHOLD,
        standardChargeINR: STANDARD_DELIVERY_CHARGE,
        note: "Demo pricing & illustrative delivery charge estimate",
      },
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/shop/products/:id
router.get("/products/:id", async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Admin Product & Image Management ────────────────────────

// POST /api/shop/upload — Upload product image (base64 dataUrl)
router.post("/upload", protect, authorize("admin"), async (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl || typeof dataUrl !== "string") {
      return res.status(400).json({ success: false, message: "Image dataUrl is required" });
    }

    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Only PNG, JPG, JPEG, or WEBP images are allowed",
      });
    }

    const ext = match[1].toLowerCase() === "jpeg" ? "jpg" : match[1].toLowerCase();
    const buffer = Buffer.from(match[2], "base64");
    if (buffer.length > 3 * 1024 * 1024) {
      return res.status(400).json({ success: false, message: "Image must be under 3 MB" });
    }

    const uploadDir = path.join(__dirname, "..", "..", "images", "uploads");
    fs.mkdirSync(uploadDir, { recursive: true });
    const fileName = `prod-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.${ext}`;
    fs.writeFileSync(path.join(uploadDir, fileName), buffer);

    res.status(201).json({ success: true, url: `images/uploads/${fileName}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/shop/products — Add new shop product
router.post("/products", protect, authorize("admin"), async (req, res) => {
  try {
    const {
      name,
      category,
      variantType,
      variant,
      description,
      price,
      packSize,
      sizeOptions,
      stockQuantity,
      image,
      isActive,
    } = req.body;

    const product = await ShopProduct.create({
      name,
      category,
      variantType: variantType || "type",
      variant: variant || "Standard",
      description,
      price: Number(price),
      packSize: packSize || "Standard Pack",
      sizeOptions: Array.isArray(sizeOptions) ? sizeOptions : [],
      stockQuantity: Number(stockQuantity ?? 50),
      image: image || "assets/products/incense-sandalwood.jpg",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isDemoPrice: true,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// PUT /api/shop/products/:id — Edit product details, price, stock, enable/disable
router.put("/products/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const fields = [
      "name",
      "category",
      "variantType",
      "variant",
      "description",
      "price",
      "packSize",
      "sizeOptions",
      "stockQuantity",
      "image",
      "isActive",
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) product[f] = req.body[f];
    });

    await product.save();
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// DELETE /api/shop/products/:id
router.delete("/products/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const product = await ShopProduct.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    await product.deleteOne();
    res.json({ success: true, message: "Shop product deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Authenticated Persistent Cart ───────────────────────────

async function sanitizeCartItems(rawItems) {
  const validItems = [];
  for (const raw of rawItems || []) {
    const prod = await ShopProduct.findById(raw.product || raw._id);
    if (!prod || !prod.isActive || prod.stockQuantity <= 0) continue;
    const { unitPrice, packSize } = resolveUnitPrice(prod, raw.packSize);
    const qty = Math.min(prod.stockQuantity, Math.max(1, parseInt(raw.quantity || 1, 10)));
    validItems.push({
      product: prod._id,
      productId: prod.productId,
      name: prod.name,
      category: prod.category,
      variant: prod.variant,
      packSize,
      unitPrice,
      quantity: qty,
      image: prod.image,
    });
  }
  return validItems;
}

// GET /api/shop/cart
router.get("/cart", protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/shop/cart — Replace cart items cleanly
router.put("/cart", protect, async (req, res) => {
  try {
    const cleanItems = await sanitizeCartItems(req.body.items);
    const cart = await Cart.findOneAndUpdate(
      { user: req.user._id },
      { $set: { items: cleanItems } },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/shop/cart/merge — Merge guest cart items into user cart on login
router.post("/cart/merge", protect, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) cart = await Cart.create({ user: req.user._id, items: [] });

    const incoming = await sanitizeCartItems(req.body.items);
    const merged = [...cart.items.map((i) => i.toObject())];

    incoming.forEach((inc) => {
      const idx = merged.findIndex(
        (m) => String(m.product) === String(inc.product) && m.packSize === inc.packSize
      );
      if (idx >= 0) {
        merged[idx].quantity += inc.quantity;
      } else {
        merged.push(inc);
      }
    });

    cart.items = await sanitizeCartItems(merged);
    await cart.save();
    res.json({ success: true, data: cart });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── Checkout & Order Management ─────────────────────────────

// POST /api/shop/orders — Place order (authenticated)
router.post("/orders", protect, async (req, res) => {
  try {
    const { customerName, phone, deliveryAddress, paymentMethod, items } = req.body;
    if (!customerName || !phone || !deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: "Customer name, phone number, and delivery address are required.",
      });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Your cart is empty." });
    }

    const orderItems = [];
    let subtotalINR = 0;

    for (const item of items) {
      const prod = await ShopProduct.findById(item.product || item._id);
      if (!prod || !prod.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product "${item.name || "item"}" is unavailable.`,
        });
      }
      const qty = Math.max(1, parseInt(item.quantity || 1, 10));
      if (prod.stockQuantity < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${prod.name} (available: ${prod.stockQuantity}).`,
        });
      }
      const { unitPrice, packSize } = resolveUnitPrice(prod, item.packSize);
      const lineTotal = Math.round(unitPrice * qty * 100) / 100;
      subtotalINR += lineTotal;

      orderItems.push({
        product: prod._id,
        productId: prod.productId,
        name: prod.name,
        category: prod.category,
        variant: prod.variant,
        packSize,
        unitPrice,
        quantity: qty,
        lineTotal,
        image: prod.image,
      });

      // Decrement stock
      prod.stockQuantity -= qty;
      await prod.save();
    }

    subtotalINR = Math.round(subtotalINR * 100) / 100;
    const deliveryChargeINR = subtotalINR >= DELIVERY_FREE_THRESHOLD ? 0 : STANDARD_DELIVERY_CHARGE;
    const totalAmountINR = Math.round((subtotalINR + deliveryChargeINR) * 100) / 100;

    const chosenMethod =
      paymentMethod === "Demo Payment (Test Mode)"
        ? "Demo Payment (Test Mode)"
        : "Cash on Delivery (COD)";
    const paymentStatus =
      chosenMethod === "Demo Payment (Test Mode)"
        ? "Demo Order (No Real Payment Charged)"
        : "COD Pending";

    const order = await Order.create({
      user: req.user._id,
      customerName: customerName.trim(),
      phone: phone.trim(),
      deliveryAddress: deliveryAddress.trim(),
      items: orderItems,
      subtotalINR,
      deliveryChargeINR,
      totalAmountINR,
      paymentMethod: chosenMethod,
      paymentStatus,
      orderStatus: "Placed",
      isDemoOrder: true,
    });

    // Clear persistent cart for user
    await Cart.findOneAndUpdate({ user: req.user._id }, { $set: { items: [] } });

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/shop/orders — User sees own orders; Admin sees all orders
router.get("/orders", protect, async (req, res) => {
  try {
    const filter = req.user.role === "admin" ? {} : { user: req.user._id };
    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/shop/orders/:id/status — Admin updates order status
router.patch("/orders/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    order.orderStatus = req.body.orderStatus;
    await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
