const mongoose = require("mongoose")

// Define a simpler schema structure that follows MongoDB's GeoJSON requirements exactly
const orderSchema = new mongoose.Schema(
    {
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
        // Store standard lat/lng separately for easy access
        delivery_coordinates: {
            lat: {
                type: Number,
                required: true,
            },
            lng: {
                type: Number,
                required: true,
            },
        },
        // This is the proper GeoJSON field that MongoDB expects
        delivery_location: {
            type: {
                type: String,
                enum: ["Point"],
                required: true,
            },
            coordinates: {
                type: [Number], // [longitude, latitude]
                required: true,
            },
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
            enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED", "DECLINED"],
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
        refund_id: {
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
        delivery_time: {
            type: Date,
        },
        delivery_id: {
            type: String,
            default: null,
        },
    },
    { timestamps: true },
)

// Create a 2dsphere index directly on the delivery_location field
orderSchema.index({ delivery_location: "2dsphere" })

module.exports = mongoose.model("Order", orderSchema)
