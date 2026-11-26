const mongoose = require("mongoose");

const wasteRecordSchema = new mongoose.Schema(
  {
    recordId: {
      type: String,
      unique: true,
      required: true,
    },
    source: {
      type: String,
      required: [true, "Source/temple name is required"],
      trim: true,
    },
    flower: {
      type: String,
      required: [true, "Flower type is required"],
      enum: ["Marigold", "Rose", "Jasmine", "Mixed", "Other"],
    },
    received: {
      type: Number,
      required: [true, "Received quantity is required"],
      min: [0.1, "Received must be at least 0.1 kg"],
    },
    usable: {
      type: Number,
      required: [true, "Usable quantity is required"],
      min: 0,
    },
    other: {
      type: Number,
      required: [true, "Other material quantity is required"],
      min: 0,
    },
    date: {
      type: String,
      required: [true, "Received date is required"],
    },
    stage: {
      type: String,
      enum: ["Awaiting processing", "Ready for processing", "Sent for processing"],
      default: "Awaiting processing",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    sourceRequestId: {
      type: String,
      default: null,
    },
    processingCost: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  { timestamps: true }
);

// Auto-generate recordId before validation
wasteRecordSchema.pre("validate", function (next) {
  if (!this.recordId) {
    this.recordId = "WR" + Date.now().toString().slice(-8);
  }
  next();
});

// Validate usable + other <= received
wasteRecordSchema.pre("save", function (next) {
  if (this.usable + this.other > this.received + 0.00001) {
    const err = new Error(
      "Usable flowers + other material cannot exceed received quantity"
    );
    err.status = 400;
    return next(err);
  }
  next();
});

module.exports = mongoose.model("WasteRecord", wasteRecordSchema);
