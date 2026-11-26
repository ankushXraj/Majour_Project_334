require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const User = require("./models/User");
const CollectionRequest = require("./models/CollectionRequest");
const WasteRecord = require("./models/WasteRecord");
const EcoProduct = require("./models/EcoProduct");
const FinancialConfig = require("./models/FinancialConfig");
const FinancialTransaction = require("./models/FinancialTransaction");
const CalculationHistory = require("./models/CalculationHistory");
const ShopProduct = require("./models/ShopProduct");
const Cart = require("./models/Cart");
const Order = require("./models/Order");
const { calculateWasteToWealth } = require("./services/financialEngine");

const seedData = async () => {
  await User.deleteMany();
  await CollectionRequest.deleteMany();
  await WasteRecord.deleteMany();
  await EcoProduct.deleteMany();
  await FinancialConfig.deleteMany();
  await FinancialTransaction.deleteMany();
  await CalculationHistory.deleteMany();
  await ShopProduct.deleteMany();
  await Cart.deleteMany();
  await Order.deleteMany();
  console.log("🗑️  Cleared existing data");

  const config = await FinancialConfig.create({ configKey: "default" });

  // ── 1. Users (Temples, Admin, Collection Team, Processing Unit) ──
  await User.create({
    name: "Admin",
    email: "admin@flowercycle.com",
    password: "admin123",
    role: "admin",
    phone: "9876543210",
  });

  const temple1 = await User.create({
    name: "Shiv Temple",
    email: "shiv@temple.com",
    password: "temple123",
    role: "temple",
    phone: "9876543211",
    address: "Main Road, Varanasi, UP 221001",
    contactPerson: "Pandit Ramesh",
    templeName: "Shiv Temple",
  });

  const temple2 = await User.create({
    name: "Hanuman Temple",
    email: "hanuman@temple.com",
    password: "temple123",
    role: "temple",
    phone: "9876543212",
    address: "Gandhi Nagar, Lucknow, UP 226001",
    contactPerson: "Mahant Suresh",
    templeName: "Hanuman Temple",
  });

  const temple3 = await User.create({
    name: "Durga Temple",
    email: "durga@temple.com",
    password: "temple123",
    role: "temple",
    phone: "9876543213",
    address: "Temple Street, Prayagraj, UP 211001",
    contactPerson: "Pujari Dinesh",
    templeName: "Durga Temple",
  });

  const temple4 = await User.create({
    name: "Kashi Vishwanath Trust",
    email: "kashi@temple.com",
    password: "temple123",
    role: "temple",
    phone: "9876543216",
    address: "Dashashwamedh Ghat, Varanasi, UP 221001",
    contactPerson: "Acharya Mohan",
    templeName: "Kashi Vishwanath Trust",
  });

  const temple5 = await User.create({
    name: "ISKCON Noida Center",
    email: "iskcon@temple.com",
    password: "temple123",
    role: "temple",
    phone: "9876543217",
    address: "Sector 33, Noida, UP 201301",
    contactPerson: "Das Govind",
    templeName: "ISKCON Noida Center",
  });

  await User.create({
    name: "Collection Team",
    email: "team@flowercycle.com",
    password: "team123",
    role: "collection",
    phone: "9876543214",
  });

  await User.create({
    name: "Processing Unit",
    email: "processing@flowercycle.com",
    password: "processing123",
    role: "processing",
    phone: "9876543215",
  });

  const customer1 = await User.create({
    name: "Aarav Sharma",
    email: "customer@flowercycle.com",
    password: "customer123",
    role: "customer",
    phone: "9876543299",
    address: "B-42, Sector 62, Noida, UP 201309",
  });

  console.log("👤 Created 9 users (including 5 temples & demo customer)");

  // ── 2. Collection Requests (6-Month Dataset: Jun 2026 – Nov 2026) ──
  const collectionDataset = [
    { requestId: "FC10000001", temple: "Shiv Temple", templeUser: temple1._id, flower: "Marigold", quantity: 35, date: "2026-06-08", status: "Completed", notes: "Summer morning puja garlands", contact: "9876543211", address: "Main Road, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000002", temple: "Hanuman Temple", templeUser: temple2._id, flower: "Rose", quantity: 22, date: "2026-06-14", status: "Completed", notes: "Tuesday temple offerings", contact: "9876543212", address: "Gandhi Nagar, Lucknow, UP 226001", origin: "templePortal" },
    { requestId: "FC10000003", temple: "ISKCON Noida Center", templeUser: temple5._id, flower: "Mixed", quantity: 48, date: "2026-06-21", status: "Completed", notes: "Sunday festival garlands", contact: "9876543217", address: "Sector 33, Noida, UP 201301", origin: "templePortal" },
    { requestId: "FC10000004", temple: "Kashi Vishwanath Trust", templeUser: temple4._id, flower: "Marigold", quantity: 55, date: "2026-07-04", status: "Completed", notes: "Sawan preparation flowers", contact: "9876543216", address: "Dashashwamedh Ghat, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000005", temple: "Durga Temple", templeUser: temple3._id, flower: "Rose", quantity: 28, date: "2026-07-12", status: "Completed", notes: "Daily deity offerings", contact: "9876543213", address: "Temple Street, Prayagraj, UP 211001", origin: "templePortal" },
    { requestId: "FC10000006", temple: "Shiv Temple", templeUser: temple1._id, flower: "Marigold", quantity: 62, date: "2026-07-19", status: "Completed", notes: "Monday Sawan special", contact: "9876543211", address: "Main Road, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000007", temple: "ISKCON Noida Center", templeUser: temple5._id, flower: "Jasmine", quantity: 30, date: "2026-07-26", status: "Completed", notes: "Evening aarti jasmine", contact: "9876543217", address: "Sector 33, Noida, UP 201301", origin: "templePortal" },
    { requestId: "FC10000008", temple: "Hanuman Temple", templeUser: temple2._id, flower: "Marigold", quantity: 40, date: "2026-08-05", status: "Completed", notes: "Sawan Tuesday offerings", contact: "9876543212", address: "Gandhi Nagar, Lucknow, UP 226001", origin: "templePortal" },
    { requestId: "FC10000009", temple: "Kashi Vishwanath Trust", templeUser: temple4._id, flower: "Mixed", quantity: 75, date: "2026-08-14", status: "Completed", notes: "Independence week puja", contact: "9876543216", address: "Dashashwamedh Ghat, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000010", temple: "ISKCON Noida Center", templeUser: temple5._id, flower: "Rose", quantity: 65, date: "2026-08-25", status: "Completed", notes: "Janmashtami floral decor", contact: "9876543217", address: "Sector 33, Noida, UP 201301", origin: "templePortal" },
    { requestId: "FC10000011", temple: "Durga Temple", templeUser: temple3._id, flower: "Marigold", quantity: 45, date: "2026-09-06", status: "Completed", notes: "Ganesh festival garlands", contact: "9876543213", address: "Temple Street, Prayagraj, UP 211001", origin: "templePortal" },
    { requestId: "FC10000012", temple: "Shiv Temple", templeUser: temple1._id, flower: "Jasmine", quantity: 34, date: "2026-09-15", status: "Completed", notes: "Morning jasmine offerings", contact: "9876543211", address: "Main Road, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000013", temple: "Kashi Vishwanath Trust", templeUser: temple4._id, flower: "Marigold", quantity: 82, date: "2026-09-24", status: "Completed", notes: "High volume autumn garlands", contact: "9876543216", address: "Dashashwamedh Ghat, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000014", temple: "Durga Temple", templeUser: temple3._id, flower: "Mixed", quantity: 95, date: "2026-10-08", status: "Completed", notes: "Navratri Day 1–4 floral waste", contact: "9876543213", address: "Temple Street, Prayagraj, UP 211001", origin: "templePortal" },
    { requestId: "FC10000015", temple: "Hanuman Temple", templeUser: temple2._id, flower: "Marigold", quantity: 58, date: "2026-10-16", status: "Completed", notes: "Dussehra marigold garlands", contact: "9876543212", address: "Gandhi Nagar, Lucknow, UP 226001", origin: "templePortal" },
    { requestId: "FC10000016", temple: "ISKCON Noida Center", templeUser: temple5._id, flower: "Rose", quantity: 52, date: "2026-10-25", status: "Completed", notes: "Pre-Diwali rose offerings", contact: "9876543217", address: "Sector 33, Noida, UP 201301", origin: "templePortal" },
    { requestId: "FC10000017", temple: "Hanuman Temple", templeUser: temple2._id, flower: "Rose", quantity: 42, date: "2026-10-30", status: "Collected", notes: "Diwali celebration roses", contact: "9876543212", address: "Gandhi Nagar, Lucknow, UP 226001", origin: "templePortal" },
    { requestId: "FC10000018", temple: "Shiv Temple", templeUser: temple1._id, flower: "Marigold", quantity: 70, date: "2026-11-02", status: "Processing", notes: "Diwali post-festival marigold", contact: "9876543211", address: "Main Road, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000019", temple: "Kashi Vishwanath Trust", templeUser: temple4._id, flower: "Marigold", quantity: 90, date: "2026-11-08", status: "Completed", notes: "Dev Deepawali floral garlands", contact: "9876543216", address: "Dashashwamedh Ghat, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000020", temple: "Durga Temple", templeUser: temple3._id, flower: "Mixed", quantity: 44, date: "2026-11-12", status: "Collected", notes: "Mixed garlands, some plastic threads", contact: "9876543213", address: "Temple Street, Prayagraj, UP 211001", origin: "templePortal" },
    { requestId: "FC10000021", temple: "ISKCON Noida Center", templeUser: temple5._id, flower: "Jasmine", quantity: 38, date: "2026-11-18", status: "Processing", notes: "Clean segregated jasmine", contact: "9876543217", address: "Sector 33, Noida, UP 201301", origin: "templePortal" },
    { requestId: "FC10000022", temple: "Shiv Temple", templeUser: temple1._id, flower: "Marigold", quantity: 32, date: "2026-11-24", status: "Pending", notes: "Ready for morning pickup", contact: "9876543211", address: "Main Road, Varanasi, UP 221001", origin: "templePortal" },
    { requestId: "FC10000023", temple: "Hanuman Temple", templeUser: temple2._id, flower: "Rose", quantity: 26, date: "2026-11-25", status: "Pending", notes: "Gate 2 collection point", contact: "9876543212", address: "Gandhi Nagar, Lucknow, UP 226001", origin: "templePortal" },
    { requestId: "FC10000024", temple: "Kashi Vishwanath Trust", templeUser: temple4._id, flower: "Mixed", quantity: 50, date: "2026-11-26", status: "Pending", notes: "Evening aarti flowers", contact: "9876543216", address: "Dashashwamedh Ghat, Varanasi, UP 221001", origin: "templePortal" },
  ];
  const enrichedRequests = collectionDataset.map((item, idx) => {
    const conditions = ["Fresh", "Fresh", "Partially Dry", "Fresh", "Fresh"];
    const contams = [5, 6, 12, 4, 8];
    const methods = ["natural_incense", "natural_colours", "organic_compost", "vermicompost", "auto_best"];
    const condition = conditions[idx % conditions.length];
    const contaminationPct = contams[idx % contams.length];
    const preferredMethod = methods[idx % methods.length];
    const financialEstimate = calculateWasteToWealth(
      {
        flower: item.flower,
        quantity: item.quantity,
        condition,
        contaminationPct,
        preferredMethod,
      },
      config
    );
    return { ...item, condition, contaminationPct, preferredMethod, financialEstimate };
  });

  await CollectionRequest.create(enrichedRequests);
  console.log(`📋 Created ${enrichedRequests.length} collection requests with financial estimates`);

  const txDocs = enrichedRequests.map((r) => {
    const sel = r.financialEstimate.selected;
    const isCompletedOld = r.status === "Completed" && r.date < "2026-10-01";
    return {
      requestId: r.requestId,
      templeUser: r.templeUser,
      templeName: r.temple,
      type: isCompletedOld ? "temple_payment" : "waste_estimate",
      status: isCompletedOld ? "Paid" : "Estimated",
      flowerType: r.financialEstimate.inputSummary.flowerType,
      wasteQuantityKg: r.quantity,
      usableWasteKg: r.financialEstimate.massBalance.usableWasteKg,
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
      date: r.date,
      notes: isCompletedOld ? "Temple reward settled" : "Estimated contribution value",
    };
  });
  await FinancialTransaction.create(txDocs);

  const histDocs = enrichedRequests.map((r) => {
    const sel = r.financialEstimate.selected;
    return {
      source: "temple_submission",
      user: r.templeUser,
      requestId: r.requestId,
      configVersion: config.version,
      input: {
        flowerType: r.financialEstimate.inputSummary.flowerType,
        quantityKg: r.quantity,
        condition: r.condition,
        contaminationPct: r.contaminationPct,
        processingMethod: r.preferredMethod,
        location: r.address,
        date: r.date,
      },
      output: {
        usableWasteKg: r.financialEstimate.massBalance.usableWasteKg,
        dryFloralKg: r.financialEstimate.massBalance.dryFloralKg,
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
    };
  });
  await CalculationHistory.create(histDocs);
  console.log(`💳 Created ${txDocs.length} financial transactions & ${histDocs.length} calculation history logs`);

  // ── 3. Waste Segregation Records (Jun 2026 – Nov 2026) ──
  const wasteDataset = [
    { recordId: "WR10000001", source: "Shiv Temple", flower: "Marigold", received: 35, usable: 31, other: 4, date: "2026-06-08", stage: "Sent for processing", processingCost: 140, sourceRequestId: "FC10000001", notes: "High marigold yield" },
    { recordId: "WR10000002", source: "Hanuman Temple", flower: "Rose", received: 22, usable: 19, other: 3, date: "2026-06-14", stage: "Sent for processing", processingCost: 95, sourceRequestId: "FC10000002", notes: "Processed into rose dhoop" },
    { recordId: "WR10000003", source: "ISKCON Noida Center", flower: "Mixed", received: 48, usable: 35, other: 13, date: "2026-06-21", stage: "Sent for processing", processingCost: 210, sourceRequestId: "FC10000003", notes: "Higher thread/plastic mix" },
    { recordId: "WR10000004", source: "Kashi Vishwanath Trust", flower: "Marigold", received: 55, usable: 49, other: 6, date: "2026-07-04", stage: "Sent for processing", processingCost: 220, sourceRequestId: "FC10000004", notes: "Clean marigold batch" },
    { recordId: "WR10000005", source: "Durga Temple", flower: "Rose", received: 28, usable: 24, other: 4, date: "2026-07-12", stage: "Sent for processing", processingCost: 120, sourceRequestId: "FC10000005", notes: "Used for natural colours" },
    { recordId: "WR10000006", source: "Shiv Temple", flower: "Marigold", received: 62, usable: 55, other: 7, date: "2026-07-19", stage: "Sent for processing", processingCost: 245, sourceRequestId: "FC10000006", notes: "Sawan peak batch" },
    { recordId: "WR10000007", source: "ISKCON Noida Center", flower: "Jasmine", received: 30, usable: 27, other: 3, date: "2026-07-26", stage: "Sent for processing", processingCost: 130, sourceRequestId: "FC10000007", notes: "Premium aroma jasmine" },
    { recordId: "WR10000008", source: "Hanuman Temple", flower: "Marigold", received: 40, usable: 35, other: 5, date: "2026-08-05", stage: "Sent for processing", processingCost: 165, sourceRequestId: "FC10000008", notes: "Dry petals for incense" },
    { recordId: "WR10000009", source: "Kashi Vishwanath Trust", flower: "Mixed", received: 75, usable: 52, other: 23, date: "2026-08-14", stage: "Sent for processing", processingCost: 340, sourceRequestId: "FC10000009", notes: "Heavy plastic garland strings reduced usable yield" },
    { recordId: "WR10000010", source: "ISKCON Noida Center", flower: "Rose", received: 65, usable: 58, other: 7, date: "2026-08-25", stage: "Sent for processing", processingCost: 260, sourceRequestId: "FC10000010", notes: "Janmashtami roses" },
    { recordId: "WR10000011", source: "Durga Temple", flower: "Marigold", received: 45, usable: 39, other: 6, date: "2026-09-06", stage: "Sent for processing", processingCost: 185, sourceRequestId: "FC10000011", notes: "Compost & gulal batch" },
    { recordId: "WR10000012", source: "Shiv Temple", flower: "Jasmine", received: 34, usable: 31, other: 3, date: "2026-09-15", stage: "Sent for processing", processingCost: 140, sourceRequestId: "FC10000012", notes: "Clean jasmine petals" },
    { recordId: "WR10000013", source: "Kashi Vishwanath Trust", flower: "Marigold", received: 82, usable: 73, other: 9, date: "2026-09-24", stage: "Sent for processing", processingCost: 320, sourceRequestId: "FC10000013", notes: "Processed to incense & compost" },
    { recordId: "WR10000014", source: "Durga Temple", flower: "Mixed", received: 95, usable: 68, other: 27, date: "2026-10-08", stage: "Sent for processing", processingCost: 410, sourceRequestId: "FC10000014", notes: "Navratri mixed batch; high non-floral cloth/foil" },
    { recordId: "WR10000015", source: "Hanuman Temple", flower: "Marigold", received: 58, usable: 52, other: 6, date: "2026-10-16", stage: "Sent for processing", processingCost: 230, sourceRequestId: "FC10000015", notes: "Dussehra marigold" },
    { recordId: "WR10000016", source: "ISKCON Noida Center", flower: "Rose", received: 52, usable: 47, other: 5, date: "2026-10-25", stage: "Sent for processing", processingCost: 210, sourceRequestId: "FC10000016", notes: "High quality rose petals" },
    { recordId: "WR10000017", source: "Hanuman Temple", flower: "Rose", received: 42, usable: 37, other: 5, date: "2026-10-30", stage: "Ready for processing", processingCost: 170, sourceRequestId: "FC10000017", notes: "Segregated and awaiting manufacturing" },
    { recordId: "WR10000018", source: "Shiv Temple", flower: "Marigold", received: 70, usable: 63, other: 7, date: "2026-11-02", stage: "Sent for processing", processingCost: 280, sourceRequestId: "FC10000018", notes: "Diwali marigold batch" },
    { recordId: "WR10000019", source: "Kashi Vishwanath Trust", flower: "Marigold", received: 90, usable: 80, other: 10, date: "2026-11-08", stage: "Ready for processing", processingCost: 350, sourceRequestId: "FC10000019", notes: "Large Dev Deepawali batch waiting for dryer" },
    { recordId: "WR10000020", source: "Durga Temple", flower: "Mixed", received: 44, usable: 31, other: 13, date: "2026-11-12", stage: "Awaiting processing", processingCost: 195, sourceRequestId: "FC10000020", notes: "Needs manual sorting of plastic wrappers" },
  ];
  await WasteRecord.create(wasteDataset);
  console.log(`♻️  Created ${wasteDataset.length} waste records`);

  // ── 4. Eco-Products Inventory & Sales Dataset (Jun 2026 – Nov 2026) ──
  const productDataset = [
    { productId: "EP10000001", name: "Marigold Sacred Incense Sticks", category: "Incense", quantity: 45, soldQuantity: 210, price: 65, costPrice: 22, wasteUsedKg: 38, date: "2026-06-18", description: "Charcoal-free marigold agarbatti packs (50 sticks)" },
    { productId: "EP10000002", name: "Organic Temple Flower Compost (5kg)", category: "Compost", quantity: 30, soldQuantity: 110, price: 140, costPrice: 55, wasteUsedKg: 85, date: "2026-06-28", description: "Enriched organic garden compost from floral waste" },
    { productId: "EP10000003", name: "Rose Petal Dhoop Cones", category: "Incense", quantity: 35, soldQuantity: 245, price: 75, costPrice: 24, wasteUsedKg: 32, date: "2026-07-16", description: "Natural rose fragrance dhoop cones (40 cones)" },
    { productId: "EP10000004", name: "Saffron Marigold Herbal Gulal", category: "Organic colours", quantity: 28, soldQuantity: 140, price: 120, costPrice: 42, wasteUsedKg: 48, date: "2026-07-28", description: "Skin-safe natural yellow/saffron festive colour" },
    { productId: "EP10000005", name: "Jasmine Aromatic Incense Pack", category: "Incense", quantity: 22, soldQuantity: 190, price: 85, costPrice: 28, wasteUsedKg: 27, date: "2026-08-10", description: "Hand-rolled jasmine temple incense sticks" },
    { productId: "EP10000006", name: "Rose Pink Natural Holi Colour", category: "Organic colours", quantity: 18, soldQuantity: 165, price: 130, costPrice: 45, wasteUsedKg: 52, date: "2026-08-29", description: "100% botanical rose gulal powder (250g)" },
    { productId: "EP10000007", name: "Pressed Flower Soy Wax Candle", category: "Decorative items", quantity: 40, soldQuantity: 68, price: 180, costPrice: 88, wasteUsedKg: 18, date: "2026-09-12", description: "Eco soy candle infused with dried marigold & rose" },
    { productId: "EP10000008", name: "Vermicompost Nursery Pack (10kg)", category: "Compost", quantity: 55, soldQuantity: 80, price: 210, costPrice: 95, wasteUsedKg: 120, date: "2026-09-27", description: "Bulk organic floral compost for nurseries" },
    { productId: "EP10000009", name: "Mixed Herbal Compost Standard", category: "Compost", quantity: 70, soldQuantity: 42, price: 95, costPrice: 68, wasteUsedKg: 95, date: "2026-10-12", description: "Low-margin bulk compost from mixed festival waste" },
    { productId: "EP10000010", name: "Festive Marigold Dhoop Gift Box", category: "Incense", quantity: 26, soldQuantity: 280, price: 160, costPrice: 52, wasteUsedKg: 54, date: "2026-10-22", description: "Premium Diwali temple floral incense hamper" },
    { productId: "EP10000011", name: "Recycled Flower Seed-Paper Cards", category: "Decorative items", quantity: 85, soldQuantity: 35, price: 90, costPrice: 58, wasteUsedKg: 15, date: "2026-10-29", description: "Slow-moving handmade seed paper greeting set" },
    { productId: "EP10000012", name: "Sandal-Rose Temple Agarbatti", category: "Incense", quantity: 32, soldQuantity: 260, price: 95, costPrice: 30, wasteUsedKg: 46, date: "2026-11-05", description: "Top-selling daily temple aromatic incense" },
    { productId: "EP10000013", name: "Tri-Colour Natural Gulal Gift Pack", category: "Organic colours", quantity: 24, soldQuantity: 155, price: 220, costPrice: 78, wasteUsedKg: 58, date: "2026-11-11", description: "3-jar natural flower gulal set (Marigold, Rose, Leaf)" },
    { productId: "EP10000014", name: "Floral Potpourri Glass Bowl Set", category: "Decorative items", quantity: 62, soldQuantity: 18, price: 240, costPrice: 155, wasteUsedKg: 24, date: "2026-11-16", description: "High-cost decor item with slow sell-through" },
  ];
  await EcoProduct.create(productDataset);
  console.log(`✿ Created ${productDataset.length} eco-products`);

  // ── 5. Shop E-Commerce Catalog (25 Products across 4 Categories, Indian Demo Pricing) ──
  const shopCatalog = [
    // A. Natural Incense Sticks (8 Fragrances)
    {
      productId: "SH1001",
      name: "Sacred Sandalwood Flower Agarbatti",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Sandalwood",
      description: "Hand-rolled charcoal-free incense sticks crafted from recycled temple petals and pure sandalwood notes.",
      price: 95,
      packSize: "100g (50 Sticks)",
      sizeOptions: [{ label: "100g (50 Sticks)", price: 95 }, { label: "250g (125 Sticks)", price: 215 }],
      stockQuantity: 80,
      image: "images/product-incense.jpg",
    },
    {
      productId: "SH1002",
      name: "Temple Rose Petal Incense Sticks",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Rose",
      description: "Soothing natural rose aroma blended with dried temple rose and marigold powder.",
      price: 85,
      packSize: "100g (50 Sticks)",
      sizeOptions: [{ label: "100g (50 Sticks)", price: 85 }, { label: "250g (125 Sticks)", price: 195 }],
      stockQuantity: 95,
      image: "images/shop-incense-variety.jpg",
    },
    {
      productId: "SH1003",
      name: "Night-Blooming Jasmine Agarbatti",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Jasmine",
      description: "Delicate jasmine incense crafted from evening aarti floral offerings with natural bark binder.",
      price: 90,
      packSize: "100g (50 Sticks)",
      sizeOptions: [{ label: "100g (50 Sticks)", price: 90 }, { label: "250g (125 Sticks)", price: 205 }],
      stockQuantity: 70,
      image: "images/product-incense.jpg",
    },
    {
      productId: "SH1004",
      name: "Calming Lavender Floral Incense",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Lavender",
      description: "Relaxing herbal-floral incense infused with natural lavender essence for meditation and yoga.",
      price: 105,
      packSize: "100g (50 Sticks)",
      sizeOptions: [{ label: "100g (50 Sticks)", price: 105 }, { label: "250g (125 Sticks)", price: 235 }],
      stockQuantity: 60,
      image: "images/shop-incense-variety.jpg",
    },
    {
      productId: "SH1005",
      name: "Pure Mogra Blossom Agarbatti",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Mogra",
      description: "Rich sweet mogra fragrance crafted with sun-dried temple petals and bamboo sticks.",
      price: 90,
      packSize: "100g (50 Sticks)",
      sizeOptions: [{ label: "100g (50 Sticks)", price: 90 }, { label: "250g (125 Sticks)", price: 200 }],
      stockQuantity: 65,
      image: "images/product-incense.jpg",
    },
    {
      productId: "SH1006",
      name: "Golden Champa Temple Incense",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Champa",
      description: "Classic earthy-sweet champa aroma blended with recycled marigold powder.",
      price: 95,
      packSize: "100g (50 Sticks)",
      sizeOptions: [{ label: "100g (50 Sticks)", price: 95 }, { label: "250g (125 Sticks)", price: 210 }],
      stockQuantity: 55,
      image: "images/shop-incense-variety.jpg",
    },
    {
      productId: "SH1007",
      name: "Mixed Floral Daily Puja Agarbatti",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Mixed Floral",
      description: "Balanced bouquet of marigold, rose, and jasmine recycled offerings for daily home rituals.",
      price: 75,
      packSize: "100g (50 Sticks)",
      sizeOptions: [{ label: "100g (50 Sticks)", price: 75 }, { label: "250g (125 Sticks)", price: 170 }],
      stockQuantity: 120,
      image: "images/product-incense.jpg",
    },
    {
      productId: "SH1008",
      name: "Premium Temple Fragrance Gift Box",
      category: "Natural Incense Sticks",
      variantType: "fragrance",
      variant: "Premium Temple Fragrance",
      description: "Assorted festive pack featuring Sandalwood, Rose, Jasmine, and Mogra temple incense bundles.",
      price: 240,
      packSize: "250g Gift Pack",
      sizeOptions: [{ label: "250g Gift Pack", price: 240 }, { label: "500g Value Box", price: 440 }],
      stockQuantity: 45,
      image: "images/shop-incense-variety.jpg",
    },

    // B. Natural Organic Holi Colours (8 Colour Options, 100g / 250g / 500g)
    {
      productId: "SH2001",
      name: "Crimson Red Floral Holi Gulal",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Red",
      description: "Skin-friendly crimson gulal made with hibiscus/rose extracts and natural arrowroot starch.",
      price: 90,
      packSize: "100g",
      sizeOptions: [{ label: "100g", price: 90 }, { label: "250g", price: 195 }, { label: "500g", price: 360 }],
      stockQuantity: 85,
      image: "images/product-colours.jpg",
    },
    {
      productId: "SH2002",
      name: "Marigold Yellow Natural Gulal",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Yellow",
      description: "Bright golden-yellow gulal derived from recycled marigold petals and natural turmeric-starch base.",
      price: 85,
      packSize: "100g",
      sizeOptions: [{ label: "100g", price: 85 }, { label: "250g", price: 185 }, { label: "500g", price: 340 }],
      stockQuantity: 90,
      image: "images/product-colours.jpg",
    },
    {
      productId: "SH2003",
      name: "Rose Pink Herbal Holi Colour",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Pink",
      description: "Soft fragrant rose-pink floral powder that washes off easily without harsh chemicals.",
      price: 90,
      packSize: "100g",
      sizeOptions: [{ label: "100g", price: 90 }, { label: "250g", price: 195 }, { label: "500g", price: 360 }],
      stockQuantity: 75,
      image: "images/product-colours.jpg",
    },
    {
      productId: "SH2004",
      name: "Herbal Leaf Green Organic Gulal",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Green",
      description: "Natural cooling green powder blended from sacred temple leaves and botanical starch.",
      price: 85,
      packSize: "100g",
      sizeOptions: [{ label: "100g", price: 85 }, { label: "250g", price: 185 }, { label: "500g", price: 340 }],
      stockQuantity: 70,
      image: "images/product-colours.jpg",
    },
    {
      productId: "SH2005",
      name: "Saffron Orange Marigold Gulal",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Orange",
      description: "Warm kesari orange colour extracted from fresh temple marigolds and palash blossoms.",
      price: 90,
      packSize: "100g",
      sizeOptions: [{ label: "100g", price: 90 }, { label: "250g", price: 195 }, { label: "500g", price: 360 }],
      stockQuantity: 80,
      image: "images/product-colours.jpg",
    },
    {
      productId: "SH2006",
      name: "Botanical Purple Flower Gulal",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Purple",
      description: "Vibrant violet-purple colour crafted from natural floral & beetroot botanical pigments.",
      price: 95,
      packSize: "100g",
      sizeOptions: [{ label: "100g", price: 95 }, { label: "250g", price: 210 }, { label: "500g", price: 385 }],
      stockQuantity: 50,
      image: "images/product-colours.jpg",
    },
    {
      productId: "SH2007",
      name: "Aparajita Blue Natural Gulal",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Blue",
      description: "Soothing sky-blue herbal gulal inspired by butterfly-pea (Aparajita) blossoms.",
      price: 95,
      packSize: "100g",
      sizeOptions: [{ label: "100g", price: 95 }, { label: "250g", price: 210 }, { label: "500g", price: 385 }],
      stockQuantity: 55,
      image: "images/product-colours.jpg",
    },
    {
      productId: "SH2008",
      name: "Festive Multi-Colour Herbal Pack",
      category: "Natural Organic Holi Colours",
      variantType: "colour",
      variant: "Multi-Colour Pack",
      description: "Complete celebration pack combining Red, Yellow, Pink, and Green floral gulal pouches.",
      price: 260,
      packSize: "250g",
      sizeOptions: [{ label: "250g", price: 260 }, { label: "500g", price: 480 }],
      stockQuantity: 60,
      image: "images/product-colours.jpg",
    },

    // C. Organic Compost & Fertilizers (4 Products, 1kg / 2kg / 5kg / 10kg)
    {
      productId: "SH3001",
      name: "Marigold Organic Compost",
      category: "Organic Compost & Fertilizers",
      variantType: "type",
      variant: "Marigold Compost",
      description: "Cured organic compost made from segregated temple marigolds and dry leaves for balcony & kitchen gardens.",
      price: 45,
      packSize: "1 kg",
      sizeOptions: [{ label: "1 kg", price: 45 }, { label: "2 kg", price: 85 }, { label: "5 kg", price: 185 }, { label: "10 kg", price: 330 }],
      stockQuantity: 110,
      image: "images/product-compost.jpg",
    },
    {
      productId: "SH3002",
      name: "Flower-Based Vermicompost",
      category: "Organic Compost & Fertilizers",
      variantType: "type",
      variant: "Vermicompost",
      description: "Nutrient-rich screened vermicompost produced via co-composting floral waste with organic substrate.",
      price: 55,
      packSize: "1 kg",
      sizeOptions: [{ label: "1 kg", price: 55 }, { label: "2 kg", price: 100 }, { label: "5 kg", price: 220 }, { label: "10 kg", price: 390 }],
      stockQuantity: 130,
      image: "images/shop-fertilizer.jpg",
    },
    {
      productId: "SH3003",
      name: "Organic Garden Fertilizer",
      category: "Organic Compost & Fertilizers",
      variantType: "type",
      variant: "Garden Fertilizer",
      description: "Balanced slow-release botanical fertilizer supporting flowering plants, shrubs, and home planters.",
      price: 65,
      packSize: "1 kg",
      sizeOptions: [{ label: "1 kg", price: 65 }, { label: "2 kg", price: 120 }, { label: "5 kg", price: 265 }, { label: "10 kg", price: 470 }],
      stockQuantity: 85,
      image: "images/product-compost.jpg",
    },
    {
      productId: "SH3004",
      name: "Natural Plant Growth Mix",
      category: "Organic Compost & Fertilizers",
      variantType: "type",
      variant: "Growth Mix",
      description: "Ready-to-pot blend of floral compost, vermicompost, and natural aeration fibers for indoor plants.",
      price: 75,
      packSize: "1 kg",
      sizeOptions: [{ label: "1 kg", price: 75 }, { label: "2 kg", price: 140 }, { label: "5 kg", price: 310 }, { label: "10 kg", price: 550 }],
      stockQuantity: 75,
      image: "images/shop-fertilizer.jpg",
    },

    // D. Eco-Friendly Decorative Products (5 Products)
    {
      productId: "SH4001",
      name: "Decorative Flower Diyas",
      category: "Eco-Friendly Decorative Products",
      variantType: "style",
      variant: "Festive Diyas",
      description: "Set of 6 handcrafted clay diyas adorned with dried marigold and rose petals for festive lighting.",
      price: 160,
      packSize: "Set of 6",
      sizeOptions: [{ label: "Set of 6", price: 160 }, { label: "Set of 12", price: 295 }],
      stockQuantity: 55,
      image: "images/shop-diyas.jpg",
    },
    {
      productId: "SH4002",
      name: "Recycled Flower Paper",
      category: "Eco-Friendly Decorative Products",
      variantType: "style",
      variant: "Handmade Paper",
      description: "Deckle-edge recycled paper sheets embedded with real dried temple petals for cards and crafts.",
      price: 140,
      packSize: "10 Sheets",
      sizeOptions: [{ label: "10 Sheets", price: 140 }, { label: "25 Sheets", price: 310 }],
      stockQuantity: 65,
      image: "images/shop-paper-decor.jpg",
    },
    {
      productId: "SH4003",
      name: "Handmade Flower Decorations",
      category: "Eco-Friendly Decorative Products",
      variantType: "style",
      variant: "Floral Decor",
      description: "Artisanal dried floral potpourri & pressed-petal soy wax candle centerpiece for home fragrance.",
      price: 220,
      packSize: "Combo Box",
      sizeOptions: [{ label: "Combo Box", price: 220 }, { label: "Deluxe Set", price: 390 }],
      stockQuantity: 40,
      image: "images/product-decor.jpg",
    },
    {
      productId: "SH4004",
      name: "Eco-Friendly Gift Items",
      category: "Eco-Friendly Decorative Products",
      variantType: "style",
      variant: "Gift Hamper",
      description: "Curated zero-waste gift set with floral candle, incense pack, and handmade petal greeting cards.",
      price: 340,
      packSize: "Gift Hamper",
      sizeOptions: [{ label: "Gift Hamper", price: 340 }, { label: "Corporate Pack (2)", price: 640 }],
      stockQuantity: 35,
      image: "images/product-decor.jpg",
    },
    {
      productId: "SH4005",
      name: "Flower-Based Decorative Art",
      category: "Eco-Friendly Decorative Products",
      variantType: "style",
      variant: "Wall Art",
      description: "Framed botanical collage crafted from preserved temple rose and marigold petals on handmade paper.",
      price: 290,
      packSize: "8x10 Frame",
      sizeOptions: [{ label: "8x10 Frame", price: 290 }, { label: "12x16 Frame", price: 480 }],
      stockQuantity: 25,
      image: "images/shop-paper-decor.jpg",
    },
  ];

  const createdShopProducts = await ShopProduct.create(shopCatalog);
  console.log(`🛍️  Created ${createdShopProducts.length} Shop products across 4 categories`);

  // Sample Demo Order for customer1 so Order History works out-of-the-box
  await Order.create({
    orderId: "ORD26110001",
    user: customer1._id,
    customerName: customer1.name,
    phone: customer1.phone,
    deliveryAddress: customer1.address,
    items: [
      {
        product: createdShopProducts[0]._id,
        productId: createdShopProducts[0].productId,
        name: createdShopProducts[0].name,
        category: createdShopProducts[0].category,
        variant: createdShopProducts[0].variant,
        packSize: createdShopProducts[0].packSize,
        unitPrice: createdShopProducts[0].price,
        quantity: 2,
        lineTotal: createdShopProducts[0].price * 2,
        image: createdShopProducts[0].image,
      },
      {
        product: createdShopProducts[16]._id,
        productId: createdShopProducts[16].productId,
        name: createdShopProducts[16].name,
        category: createdShopProducts[16].category,
        variant: createdShopProducts[16].variant,
        packSize: "5 kg",
        unitPrice: 185,
        quantity: 1,
        lineTotal: 185,
        image: createdShopProducts[16].image,
      },
    ],
    subtotalINR: 375,
    deliveryChargeINR: 49,
    totalAmountINR: 424,
    paymentMethod: "Cash on Delivery (COD)",
    paymentStatus: "COD Pending",
    orderStatus: "Confirmed",
    isDemoOrder: true,
  });
  console.log("📦 Created sample customer demo order");

  // ── 5. Export standalone dataset files in /dataset/ ──
  const datasetDir = path.join(__dirname, "..", "dataset");
  fs.mkdirSync(datasetDir, { recursive: true });

  const fullJson = {
    generatedAt: new Date().toISOString(),
    project: "FlowerCycle – Temple Flower Waste to Eco-Products Management System",
    summary: {
      temples: 5,
      collectionRequests: collectionDataset.length,
      wasteRecords: wasteDataset.length,
      ecoProducts: productDataset.length,
    },
    collectionRequests: collectionDataset.map(({ templeUser, ...rest }) => rest),
    wasteRecords: wasteDataset,
    ecoProducts: productDataset,
  };
  fs.writeFileSync(
    path.join(datasetDir, "flowercycle-dataset.json"),
    JSON.stringify(fullJson, null, 2)
  );

  const csvRows = [
    ["DatasetSection", "RecordID", "Date", "NameOrSource", "CategoryOrFlower", "PrimaryQty", "SecondaryQty", "UnitPriceINR", "CostPriceINR", "SoldUnits", "StatusOrStage"],
  ];
  collectionDataset.forEach((r) =>
    csvRows.push(["CollectionRequest", r.requestId, r.date, r.temple, r.flower, r.quantity, "", "", "", "", r.status])
  );
  wasteDataset.forEach((w) =>
    csvRows.push(["WasteRecord", w.recordId, w.date, w.source, w.flower, w.received, w.usable, "", w.processingCost, "", w.stage])
  );
  productDataset.forEach((p) =>
    csvRows.push(["EcoProduct", p.productId, p.date, p.name, p.category, p.quantity, p.wasteUsedKg, p.price, p.costPrice, p.soldQuantity, "InInventory"])
  );

  const csvText = csvRows
    .map((row) => row.map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"').join(","))
    .join("\n");
  fs.writeFileSync(path.join(datasetDir, "flowercycle-dataset.csv"), csvText);
  console.log("📁 Exported dataset/flowercycle-dataset.json and dataset/flowercycle-dataset.csv");
};

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB for seeding");
    await seedData();

    console.log("\n🌸 Database seeded successfully!");
    console.log("\n── Login Credentials ──────────────────────────────");
    console.log("Admin:        admin@flowercycle.com / admin123");
    console.log("Temple 1:     shiv@temple.com / temple123");
    console.log("Temple 2:     hanuman@temple.com / temple123");
    console.log("Temple 3:     durga@temple.com / temple123");
    console.log("Temple 4:     kashi@temple.com / temple123");
    console.log("Temple 5:     iskcon@temple.com / temple123");
    console.log("Collection:   team@flowercycle.com / team123");
    console.log("Processing:   processing@flowercycle.com / processing123");
    console.log("Customer:     customer@flowercycle.com / customer123");
    console.log("──────────────────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
    process.exit(1);
  }
};

if (require.main === module) {
  seed();
}

module.exports = { seedData };
