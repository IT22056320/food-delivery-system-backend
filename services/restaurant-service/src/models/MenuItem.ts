import mongoose, { Schema } from "mongoose"
import type { IMenuItem } from "../types"

const menuItemSchema: Schema = new Schema(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        price: {
            type: Number,
            required: true,
        },
        category: {
            type: String,
            required: true,
        },
        image: {
            type: String,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        preparationTime: {
            type: Number,
            default: 15,
        },
        ingredients: [
            {
                type: String,
            },
        ],
        nutritionalInfo: {
            calories: Number,
            protein: Number,
            carbs: Number,
            fat: Number,
        },
    },
    {
        timestamps: true,
    },
)

export default mongoose.model<IMenuItem>("MenuItem", menuItemSchema)

