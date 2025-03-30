import mongoose, { Schema } from "mongoose"
import type { IRestaurant } from "../types"

const restaurantSchema: Schema = new Schema(
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

export default mongoose.model<IRestaurant>("Restaurant", restaurantSchema)

