const mongoose = require("mongoose")

const deliveryNotificationSchema = new mongoose.Schema(
    {
        delivery_person_id: {
            type: String,
            required: true,
        },
        delivery_id: {
            type: String,
            default: null,
        },
        order_id: {
            type: String,
            default: null,
        },
        type: {
            type: String,
            enum: ["NEW_ASSIGNMENT", "PICKUP_READY", "CUSTOMER_MESSAGE", "SYSTEM_ALERT"],
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        is_read: {
            type: Boolean,
            default: false,
        },
        priority: {
            type: String,
            enum: ["LOW", "MEDIUM", "HIGH"],
            default: "MEDIUM",
        },
    },
    { timestamps: true },
)

module.exports = mongoose.model("DeliveryNotification", deliveryNotificationSchema)
