import mongoose, { Schema } from "mongoose"
import type { IOrder } from "../types"

const orderSchema: Schema = new Schema(
    {
        restaurantId: {
            type: Schema.Types.ObjectId,
            ref: "Restaurant",
            required: true,
        },
        userId: {
            type: String,
            required: true,
        },
        items: [
            {
                menuItemId: {
                    type: Schema.Types.ObjectId,
                    ref: "MenuItem",
                    required: true,
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
                },
            },
        ],
        totalAmount: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            enum: ["pending", "accepted", "preparing", "ready", "out_for_delivery", "delivered", "cancelled"],
            default: "pending",
        },
        deliveryAddress: {
            type: String,
            required: true,
        },
        deliveryPerson: {
            type: String,
        },
        paymentStatus: {
            type: String,
            enum: ["pending", "completed", "failed"],
            default: "pending",
        },
        paymentMethod: {
            type: String,
            enum: ["card", "cash", "wallet"],
            required: true,
        },
        specialInstructions: {
            type: String,
        },
        estimatedDeliveryTime: {
            type: Date,
        },
        actualDeliveryTime: {
            type: Date,
        },
    },
    {
        timestamps: true,
    },
)

export default mongoose.model<IOrder>("Order", orderSchema)

