const mongoose = require("mongoose");
const crypto = require("crypto");

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ShopProduct",
    },
    productId: String,
    name: String,
    category: String,
    variant: String,
    packSize: String,
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true },
    image: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    deliveryAddress: {
      type: String,
      required: [true, "Delivery address is required"],
      trim: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    subtotalINR: { type: Number, required: true },
    deliveryChargeINR: { type: Number, required: true, default: 0 },
    totalAmountINR: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["Cash on Delivery (COD)", "Demo Payment (Test Mode)"],
      default: "Cash on Delivery (COD)",
    },
    paymentStatus: {
      type: String,
      enum: ["COD Pending", "Demo Order (No Real Payment Charged)"],
      default: "COD Pending",
    },
    orderStatus: {
      type: String,
      enum: ["Placed", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"],
      default: "Placed",
    },
    isDemoOrder: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

orderSchema.pre("validate", function (next) {
  if (!this.orderId) {
    this.orderId =
      "ORD" + Date.now().toString().slice(-6) + crypto.randomBytes(2).toString("hex").toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema);
