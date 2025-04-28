const mongoose = require("mongoose")

const deliverySchema = new mongoose.Schema(
    {
        order_id: {
            type: String,
            required: true,
        },
        delivery_person_id: {
            type: String,
            default: null,
        },
        status: {
            type: String,
            enum: [
                "PENDING_ASSIGNMENT", // No delivery person assigned yet
                "ASSIGNED", // Delivery person assigned but not picked up
                "PICKED_UP", // Food picked up from restaurant
                "IN_TRANSIT", // On the way to customer
                "DELIVERED", // Successfully delivered
                "CANCELLED", // Delivery cancelled
                "FAILED", // Delivery failed
            ],
            default: "PENDING_ASSIGNMENT",
        },
        pickup_location: {
            address: {
                type: String,
                required: true,
            },
            coordinates: {
                lat: Number,
                lng: Number,
            },
        },
        delivery_location: {
            address: {
                type: String,
                required: true,
            },
            coordinates: {
                lat: Number,
                lng: Number,
            },
        },
        assigned_at: {
            type: Date,
            default: null,
        },
        picked_up_at: {
            type: Date,
            default: null,
        },
        delivered_at: {
            type: Date,
            default: null,
        },
        estimated_delivery_time: {
            type: Number, // in minutes
            default: 30,
        },
        actual_delivery_time: {
            type: Number, // in minutes
            default: null,
        },
        customer_contact: {
            name: String,
            phone: String,
        },
        restaurant_contact: {
            name: String,
            phone: String,
        },
        special_instructions: {
            type: String,
            default: "",
        },
        delivery_notes: {
            type: String,
            default: "",
        },
        is_priority: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true },
)

module.exports = mongoose.model("Delivery", deliverySchema)
