const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    customer_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    restaurant_id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    items: [
      {
        item_id: {
          type: mongoose.Schema.Types.ObjectId,
        },
        menu_id: {
          type: mongoose.Schema.Types.ObjectId,
        },
        name: {
          type: String,
          required: true,
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        special_instructions: String,
      },
    ],
    total_price: {
      type: Number,
      required: true,
    },
    subtotal: {
      type: Number,
      required: true,
    },
    tax_amount: {
      type: Number,
      default: 0,
    },
    tax_rate: {
      type: Number,
      default: 0.08, // 8% tax rate
    },
    delivery_address: {
      type: String,
      required: true,
    },
    delivery_coordinates: {
      lat: Number,
      lng: Number,
    },
    delivery_location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    payment_method: {
      type: String,
      enum: ["CARD", "CASH", "WALLET"],
      required: true,
    },
    payment_status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
      default: "PENDING",
    },
    stripe_payment_id: String,
    refund_id: String,
    order_status: {
      type: String,
      enum: [
        "PENDING",
        "CONFIRMED",
        "PREPARING",
        "READY_FOR_PICKUP",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "REFUNDED",
      ],
      default: "PENDING",
    },
    extra_notes: [String],
    estimated_delivery_time: Date,
    actual_delivery_time: Date,
    out_delivery_time: Date,
    delivery_time: Date,
  },
  { timestamps: true }
);

// Add this validation before the timestamps option
orderSchema.path("items").validate((items) => {
  if (!items || items.length === 0) return false;
  return items.every((item) => item.menu_id || item.item_id);
}, "Each item must have either menu_id or item_id");

// Add index for geospatial queries
orderSchema.index({ delivery_location: "2dsphere" });

module.exports = mongoose.model("Order", orderSchema);
