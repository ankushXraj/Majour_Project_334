const mongoose = require("mongoose");

const ecoProductSchema = new mongoose.Schema(
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
      maxlength: 70,
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Incense", "Compost", "Organic colours", "Decorative items"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 0,
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: 0,
    },
    date: {
      type: String,
      required: [true, "Date is required"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

// Auto-generate productId before validation
ecoProductSchema.pre("validate", function (next) {
  if (!this.productId) {
    this.productId = "EP" + Date.now().toString().slice(-8);
  }
  next();
});

module.exports = mongoose.model("EcoProduct", ecoProductSchema);
