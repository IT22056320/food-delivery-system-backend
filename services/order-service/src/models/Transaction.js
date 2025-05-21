const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Order",
    },
    amount: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 2.99,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "cash", "cash_on_delivery", "wallet"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    paymentIntentId: String,
    refundId: String,
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    refundedAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", transactionSchema);
