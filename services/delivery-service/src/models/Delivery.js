const mongoose = require("mongoose")
const { Schema } = mongoose

// Define the GeoJSON schema for location
const pointSchema = new Schema({
    type: {
        type: String,
        enum: ["Point"],
        default: "Point",
    },
    coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
    },
})

const locationSchema = new Schema({
    address: {
        type: String,
        required: true,
    },
    coordinates: {
        lat: {
            type: Number,
            required: true,
        },
        lng: {
            type: Number,
            required: true,
        },
    },
})

const deliverySchema = new Schema(
    {
        order_id: {
            type: String,
            required: true,
        },
        delivery_person_id: {
            type: String,
            default: null,
        },
        delivery_person_name: {
            type: String,
            default: null,
        },
        pickup_location: {
            address: {
                type: String,
                required: true,
            },
            coordinates: {
                lat: {
                    type: Number,
                    required: true,
                },
                lng: {
                    type: Number,
                    required: true,
                },
            },
        },
        delivery_location: {
            address: {
                type: String,
                required: true,
            },
            coordinates: {
                lat: {
                    type: Number,
                    required: true,
                },
                lng: {
                    type: Number,
                    required: true,
                },
            },
        },
        current_location: {
            lat: {
                type: Number,
                default: null,
            },
            lng: {
                type: Number,
                default: null,
            },
            updated_at: {
                type: Date,
                default: null,
            },
        },
        customer_contact: {
            name: {
                type: String,
                default: null,
            },
            phone: {
                type: String,
                default: null,
            },
        },
        restaurant_contact: {
            name: {
                type: String,
                default: null,
            },
            phone: {
                type: String,
                default: null,
            },
        },
        order: {
            total_price: {
                type: Number,
                required: true,
            },
            items: {
                type: Number,
                default: 0,
            },
        },
        status: {
            type: String,
            enum: ["PENDING", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "DELIVERED", "CANCELLED"],
            default: "PENDING",
        },
        estimated_delivery_time: {
            type: Date,
            default: null,
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
        cancelled_at: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true },
)

// Create geospatial indexes for efficient location-based queries
deliverySchema.index({ "pickup_location.coordinates": "2dsphere" })
deliverySchema.index({ "delivery_location.coordinates": "2dsphere" })

module.exports = mongoose.model("Delivery", deliverySchema)
