const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    customer_id: {
        type: String,
        required: true,
    },
    restaurant_id: {
        type: String,
        required: true,
    },
    items: [
        {
            menu_id: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                min: 1,
            },
            price: {
                type: Number,
                required: true,
            },
        },
    ],
    total_price: {
        type: Number,
        required: true,
    },
    extra_notes: {
        type: [String],
        default: [],
    },
    delivery_address: {
        type: String,
        required: true,
    },
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
    payment_status: {
        type: String,
        enum: [
            "PENDING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
            "REFUNDED",
            "DECLINED",
        ],
        required: true,
        default: "PENDING",
    },
    payment_method: {
        type: String,
        enum: ["CASH_ON_DELIVERY", "CARD"],
        required: true,
    },
    stripe_payment_id: {
        type: String,
        default: null,
    },
    order_processing_time: {
        type: Date,
        default: Date.now,
    },
    out_delivery_time: {
        type: Date,
    },
},
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);