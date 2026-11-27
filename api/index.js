// ── Vercel Serverless Entry Point for FlowerCycle API ──────────
// This wraps the Express backend as a Vercel serverless function.
// All /api/* requests are routed here by vercel.json.

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ── Middleware ──────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "6mb" }));

// ── MongoDB Connection Caching (critical for serverless) ───────
let isConnected = false;

async function connectToDatabase() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MONGO_URI is not set in environment variables");
    return;
  }

  mongoose.set("bufferCommands", false);

  await mongoose.connect(process.env.MONGO_URI, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });

  isConnected = true;
  console.log("✅ MongoDB connected (serverless)");
}

// Attempt DB connection on API requests, but allow fallback for offline-safe endpoints
app.use(async (req, res, next) => {
  if (req.path.startsWith("/api") && req.path !== "/api/health") {
    try {
      await connectToDatabase();
    } catch (err) {
      console.warn("⚠️ MongoDB connection notice:", err.message);
    }
  }
  next();
});

// ── Public aggregate stats (from server.js) ────────────────────
app.get("/api/public-stats", async (req, res) => {
  try {
    const User = require("../backend/models/User");
    const CollectionRequest = require("../backend/models/CollectionRequest");
    const WasteRecord = require("../backend/models/WasteRecord");
    const EcoProduct = require("../backend/models/EcoProduct");

    const [templesConnected, requestsCompleted, waste, products] =
      await Promise.all([
        User.countDocuments({ role: "temple" }),
        CollectionRequest.countDocuments({
          status: { $in: ["Collected", "Processing", "Completed"] },
        }),
        WasteRecord.find().select("received"),
        EcoProduct.find().select("quantity"),
      ]);

    const flowersRecycled = waste.reduce(
      (sum, r) => sum + Number(r.received || 0),
      0
    );
    const productsCreated = products.reduce(
      (sum, p) => sum + Number(p.quantity || 0),
      0
    );

    res.json({
      success: true,
      data: { flowersRecycled, templesConnected, requestsCompleted, productsCreated },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load public stats" });
  }
});

// ── API Routes (same as backend/server.js) ─────────────────────
app.use("/api/auth", require("../backend/routes/auth"));
app.use("/api/temples", require("../backend/routes/temples"));
app.use("/api/collection-requests", require("../backend/routes/collectionRequests"));
app.use("/api/waste-records", require("../backend/routes/wasteRecords"));
app.use("/api/eco-products", require("../backend/routes/ecoProducts"));
app.use("/api/reports", require("../backend/routes/reports"));
app.use("/api/dashboard", require("../backend/routes/dashboard"));
app.use("/api/ai", require("../backend/routes/ai"));
app.use("/api/financial", require("../backend/routes/financial"));
app.use("/api/shop", require("../backend/routes/shop"));

// ── Auto-Seed Endpoint (call once after first deploy) ──────────
app.post("/api/seed", async (req, res) => {
  try {
    const User = require("../backend/models/User");
    const existing = await User.countDocuments();
    if (existing > 0) {
      return res.json({ success: true, message: "Database already seeded." });
    }
    const { seedData } = require("../backend/seed");
    await seedData();
    res.json({ success: true, message: "Database seeded successfully!" });
  } catch (err) {
    console.error("Seed error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// Export for Vercel serverless
module.exports = app;
