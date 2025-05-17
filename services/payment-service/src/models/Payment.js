const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    order_id: {
      type: String,
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "usd",
    },
    payment_method: {
      type: String,
      enum: ["CASH_ON_DELIVERY", "CARD"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
        "REFUNDED",
        "DECLINED",
      ],
      default: "PENDING",
    },
    stripe_payment_intent_id: {
      type: String,
      default: null,
    },
    stripe_client_secret: {
      type: String,
      default: null,
    },
    refund_id: {
      type: String,
      default: null,
    },
    refund_amount: {
      type: Number,
      default: 0,
    },
    metadata: {
      type: Object,
      default: {},
    },
    error_message: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Payment", paymentSchema);
