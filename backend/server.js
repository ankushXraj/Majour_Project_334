require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: "6mb" }));

// Block access to backend source files via static middleware
app.use("/backend", (req, res) => {
  res.status(403).json({ success: false, message: "Forbidden" });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, "..")));

// ── Public aggregate stats for homepage ────────────────────
app.get("/api/public-stats", async (req, res) => {
  try {
    const User = require("./models/User");
    const CollectionRequest = require("./models/CollectionRequest");
    const WasteRecord = require("./models/WasteRecord");
    const EcoProduct = require("./models/EcoProduct");

    const [templesConnected, requestsCompleted, waste, products] = await Promise.all([
      User.countDocuments({ role: "temple" }),
      CollectionRequest.countDocuments({ status: { $in: ["Collected", "Processing", "Completed"] } }),
      WasteRecord.find().select("received"),
      EcoProduct.find().select("quantity"),
    ]);

    const flowersRecycled = waste.reduce((sum, r) => sum + Number(r.received || 0), 0);
    const productsCreated = products.reduce((sum, p) => sum + Number(p.quantity || 0), 0);

    res.json({
      success: true,
      data: {
        flowersRecycled,
        templesConnected,
        requestsCompleted,
        productsCreated,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Could not load public stats" });
  }
});

// ── API Routes ─────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));
app.use("/api/temples", require("./routes/temples"));
app.use("/api/collection-requests", require("./routes/collectionRequests"));
app.use("/api/waste-records", require("./routes/wasteRecords"));
app.use("/api/eco-products", require("./routes/ecoProducts"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/ai", require("./routes/ai"));
app.use("/api/financial", require("./routes/financial"));
app.use("/api/shop", require("./routes/shop"));

// Fallback: serve index.html for any non-API route
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ── Error handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: "Internal server error" });
});

// ── Connect to MongoDB and start server ────────────────────
const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 2000,
    });
    console.log("✅ Connected to MongoDB");
  } catch (err) {
    console.warn("⚠️  Local MongoDB not available, starting in-memory MongoDB...");
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri);
    console.log("✅ Connected to in-memory MongoDB");

    const { seedData } = require("./seed");
    await seedData();
    console.log("🌱 Seeded in-memory database with sample data");
  }

  app.listen(PORT, () => {
    console.log(`🌸 FlowerCycle server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Startup error:", err.message);
  process.exit(1);
});
