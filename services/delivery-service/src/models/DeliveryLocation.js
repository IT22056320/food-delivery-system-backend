const mongoose = require("mongoose")

const deliveryLocationSchema = new mongoose.Schema(
    {
        delivery_person_id: {
            type: String,
            required: true,
            index: true,
        },
        location: {
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
        status: {
            type: String,
            enum: ["AVAILABLE", "BUSY", "OFFLINE"],
            default: "OFFLINE",
        },
        last_updated: {
            type: Date,
            default: Date.now,
        },
        delivery_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Delivery",
            default: null,
        },
        heading: {
            type: Number, // Direction in degrees (0-360)
            default: 0,
        },
        speed: {
            type: Number, // Speed in km/h
            default: 0,
        },
    },
    { timestamps: true },
)

// Create a 2dsphere index for geospatial queries
deliveryLocationSchema.index({ location: "2dsphere" })

module.exports = mongoose.model("DeliveryLocation", deliveryLocationSchema)
