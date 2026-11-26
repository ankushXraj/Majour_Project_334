require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const CollectionRequest = require("./models/CollectionRequest");
const WasteRecord = require("./models/WasteRecord");
const EcoProduct = require("./models/EcoProduct");

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB for seeding");

    // Clear existing data
    await User.deleteMany();
    await CollectionRequest.deleteMany();
    await WasteRecord.deleteMany();
    await EcoProduct.deleteMany();
    console.log("🗑️  Cleared existing data");

    // Create users
    const admin = await User.create({
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

    const collector = await User.create({
      name: "Collection Team",
      email: "team@flowercycle.com",
      password: "team123",
      role: "collection",
      phone: "9876543214",
    });

    const processing = await User.create({
      name: "Processing Unit",
      email: "processing@flowercycle.com",
      password: "processing123",
      role: "processing",
      phone: "9876543215",
    });

    console.log("👤 Created users");

    // Create collection requests
    const requests = await CollectionRequest.create([
      {
        requestId: "FC10000001",
        temple: "Shiv Temple",
        templeUser: temple1._id,
        flower: "Marigold",
        quantity: 25,
        date: "2026-10-31",
        status: "Pending",
        notes: "Fresh marigold from morning puja",
        contact: "9876543211",
        address: "Main Road, Varanasi, UP 221001",
        origin: "templePortal",
      },
      {
        requestId: "FC10000002",
        temple: "Hanuman Temple",
        templeUser: temple2._id,
        flower: "Rose",
        quantity: 15,
        date: "2026-10-30",
        status: "Collected",
        notes: "Red and white roses",
        contact: "9876543212",
        address: "Gandhi Nagar, Lucknow, UP 226001",
        origin: "templePortal",
      },
      {
        requestId: "FC10000003",
        temple: "Durga Temple",
        templeUser: temple3._id,
        flower: "Mixed",
        quantity: 30,
        date: "2026-11-01",
        status: "Processing",
        notes: "Mixed flowers from Navratri celebrations",
        contact: "9876543213",
        address: "Temple Street, Prayagraj, UP 211001",
        origin: "templePortal",
      },
      {
        requestId: "FC10000004",
        temple: "Shiv Temple",
        templeUser: temple1._id,
        flower: "Jasmine",
        quantity: 10,
        date: "2026-11-05",
        status: "Pending",
        notes: "Evening puja jasmine garlands",
        contact: "9876543211",
        address: "Main Road, Varanasi, UP 221001",
        origin: "templePortal",
      },
      {
        requestId: "FC10000005",
        temple: "Hanuman Temple",
        templeUser: temple2._id,
        flower: "Marigold",
        quantity: 20,
        date: "2026-11-02",
        status: "Completed",
        notes: "",
        contact: "9876543212",
        address: "Gandhi Nagar, Lucknow, UP 226001",
        origin: "templePortal",
      },
    ]);
    console.log("📋 Created collection requests");

    // Create waste records
    await WasteRecord.create([
      {
        recordId: "WR10000001",
        source: "Shiv Temple",
        flower: "Marigold",
        received: 25,
        usable: 21,
        other: 4,
        date: "2026-10-31",
        stage: "Ready for processing",
        notes: "Good quality marigold, minimal contamination",
      },
      {
        recordId: "WR10000002",
        source: "Hanuman Temple",
        flower: "Rose",
        received: 15,
        usable: 12,
        other: 3,
        date: "2026-10-30",
        stage: "Sent for processing",
        notes: "Sent for incense making",
        sourceRequestId: "FC10000002",
      },
      {
        recordId: "WR10000003",
        source: "Durga Temple",
        flower: "Mixed",
        received: 30,
        usable: 24,
        other: 6,
        date: "2026-11-01",
        stage: "Awaiting processing",
        notes: "Needs further sorting",
        sourceRequestId: "FC10000003",
      },
      {
        recordId: "WR10000004",
        source: "Hanuman Temple",
        flower: "Marigold",
        received: 20,
        usable: 17,
        other: 3,
        date: "2026-11-02",
        stage: "Sent for processing",
        notes: "",
        sourceRequestId: "FC10000005",
      },
    ]);
    console.log("♻️  Created waste records");

    // Create eco-products
    await EcoProduct.create([
      {
        productId: "EP10000001",
        name: "Flower-based incense sticks",
        category: "Incense",
        quantity: 24,
        price: 35,
        date: "2026-10-31",
        description: "Hand-rolled incense sticks made from dried temple flowers",
      },
      {
        productId: "EP10000002",
        name: "Organic flower compost",
        category: "Compost",
        quantity: 28,
        price: 20,
        date: "2026-10-30",
        description: "Nutrient-rich compost for home gardens and farms",
      },
      {
        productId: "EP10000003",
        name: "Natural flower colours",
        category: "Organic colours",
        quantity: 12,
        price: 60,
        date: "2026-10-29",
        description: "Eco-friendly Holi colours from flower extracts",
      },
      {
        productId: "EP10000004",
        name: "Floral potpourri bags",
        category: "Decorative items",
        quantity: 15,
        price: 45,
        date: "2026-11-01",
        description: "Dried flower potpourri for home fragrance",
      },
      {
        productId: "EP10000005",
        name: "Rose petal dhoop cones",
        category: "Incense",
        quantity: 30,
        price: 25,
        date: "2026-11-02",
        description: "Cone-shaped dhoop made from dried rose petals",
      },
    ]);
    console.log("✿ Created eco-products");

    console.log("\n🌸 Database seeded successfully!");
    console.log("\n── Login Credentials ──────────────────────────────");
    console.log("Admin:        admin@flowercycle.com / admin123");
    console.log("Temple 1:     shiv@temple.com / temple123");
    console.log("Temple 2:     hanuman@temple.com / temple123");
    console.log("Temple 3:     durga@temple.com / temple123");
    console.log("Collection:   team@flowercycle.com / team123");
    console.log("Processing:   processing@flowercycle.com / processing123");
    console.log("──────────────────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding error:", error.message);
    process.exit(1);
  }
};

seed();
