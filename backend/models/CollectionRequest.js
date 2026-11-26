const mongoose = require("mongoose");

const collectionRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      unique: true,
      required: true,
    },
    temple: {
      type: String,
      required: [true, "Temple name is required"],
      trim: true,
    },
    templeUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    flower: {
      type: String,
      required: [true, "Flower type is required"],
      enum: ["Marigold", "Rose", "Jasmine", "Lotus", "Mixed", "Mixed Flowers", "Other"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0.1, "Quantity must be at least 0.1 kg"],
    },
    condition: {
      type: String,
      enum: ["Fresh", "Partially Dry", "Fully Dry"],
      default: "Fresh",
    },
    contaminationPct: {
      type: Number,
      min: 0,
      max: 95,
      default: 5,
    },
    preferredMethod: {
      type: String,
      enum: [
        "auto_best",
        "natural_incense",
        "organic_compost",
        "vermicompost",
        "natural_colours",
        "decorative_items",
      ],
      default: "auto_best",
    },
    date: {
      type: String,
      required: [true, "Pickup date is required"],
    },
    status: {
      type: String,
      enum: ["Pending", "Collected", "Processing", "Completed"],
      default: "Pending",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    contact: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    origin: {
      type: String,
      enum: ["admin", "templePortal"],
      default: "admin",
    },
    // Backend-calculated financial estimate snapshot (never trust client calculations)
    financialEstimate: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Auto-generate requestId before validation
collectionRequestSchema.pre("validate", function (next) {
  if (!this.requestId) {
    this.requestId = "FC" + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model("CollectionRequest", collectionRequestSchema);
