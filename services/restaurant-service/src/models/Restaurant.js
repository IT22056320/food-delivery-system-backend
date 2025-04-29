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

const restaurantSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        ownerId: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        location: {
            type: pointSchema,
            index: "2dsphere", // Create a geospatial index
            required: false, // Make it optional for backward compatibility
        },
        phone: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        cuisine: [
            {
                type: String,
            },
        ],
        openingHours: [
            {
                day: String,
                open: String,
                close: String,
            },
        ],
        isAvailable: {
            type: Boolean,
            default: true,
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        rating: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
)

module.exports = mongoose.model("Restaurant", restaurantSchema)
