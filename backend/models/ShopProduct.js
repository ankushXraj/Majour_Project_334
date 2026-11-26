const mongoose = require("mongoose");
const crypto = require("crypto");

const sizeOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const shopProductSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: [
        "Natural Incense Sticks",
        "Natural Organic Holi Colours",
        "Organic Compost & Fertilizers",
        "Eco-Friendly Decorative Products",
      ],
    },
    variantType: {
      type: String,
      enum: ["fragrance", "colour", "type", "style"],
      default: "type",
    },
    variant: {
      type: String,
      required: [true, "Variant/fragrance/colour is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    packSize: {
      type: String,
      required: [true, "Pack size is required"],
      trim: true,
    },
    sizeOptions: {
      type: [sizeOptionSchema],
      default: [],
    },
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: 0,
      default: 50,
    },
    image: {
      type: String,
      default: "assets/products/incense-sandalwood.jpg",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDemoPrice: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

shopProductSchema.pre("validate", function (next) {
  if (!this.productId) {
    this.productId =
      "SH" + Date.now().toString().slice(-6) + crypto.randomBytes(1).toString("hex").toUpperCase();
  }
  next();
});

module.exports = mongoose.model("ShopProduct", shopProductSchema);
