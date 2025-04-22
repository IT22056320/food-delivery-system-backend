const DeliveryNotification = require("../models/DeliveryNotification")

// Get notifications for the authenticated delivery person
exports.getMyNotifications = async (req, res) => {
    try {
        const deliveryPersonId = req.user.id
        const { limit = 20, page = 1, unreadOnly = false } = req.query

        const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

        const query = { delivery_person_id: deliveryPersonId }

        if (unreadOnly === "true") {
            query.is_read = false
        }

        const notifications = await DeliveryNotification.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number.parseInt(limit))

        // Get total count for pagination
        const totalCount = await DeliveryNotification.countDocuments(query)

        return res.status(200).json({
            notifications,
            pagination: {
                total: totalCount,
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                pages: Math.ceil(totalCount / Number.parseInt(limit)),
            },
        })
    } catch (error) {
        console.error("Error fetching notifications:", error)
        return res.status(500).json({ message: "Error fetching notifications", error: error.message })
    }
}

// Mark notification as read
exports.markAsRead = async (req, res) => {
    try {
        const { notificationId } = req.params
        const deliveryPersonId = req.user.id

        const notification = await DeliveryNotification.findById(notificationId)

        if (!notification) {
            return res.status(404).json({ message: "Notification not found" })
        }

        if (notification.delivery_person_id !== deliveryPersonId) {
            return res.status(403).json({ message: "You are not authorized to update this notification" })
        }

        notification.is_read = true
        await notification.save()

        return res.status(200).json({ message: "Notification marked as read", notification })
    } catch (error) {
        console.error("Error marking notification as read:", error)
        return res.status(500).json({ message: "Error marking notification as read", error: error.message })
    }
}

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
    try {
        const deliveryPersonId = req.user.id

        const result = await DeliveryNotification.updateMany(
            { delivery_person_id: deliveryPersonId, is_read: false },
            { is_read: true },
        )

        return res.status(200).json({
            message: "All notifications marked as read",
            count: result.modifiedCount,
        })
    } catch (error) {
        console.error("Error marking all notifications as read:", error)
        return res.status(500).json({ message: "Error marking all notifications as read", error: error.message })
    }
}

// Create a new notification (internal use or admin)
exports.createNotification = async (req, res) => {
    try {
        const { delivery_person_id, delivery_id, order_id, type, message, priority } = req.body

        if (!delivery_person_id || !type || !message) {
            return res.status(400).json({ message: "Delivery person ID, type, and message are required" })
        }

        const notification = new DeliveryNotification({
            delivery_person_id,
            delivery_id,
            order_id,
            type,
            message,
            priority: priority || "MEDIUM",
        })

        await notification.save()

        // In a real-world scenario, you would also send a push notification here
        // using a service like Firebase Cloud Messaging or similar

        return res.status(201).json(notification)
    } catch (error) {
        console.error("Error creating notification:", error)
        return res.status(500).json({ message: "Error creating notification", error: error.message })
    }
}
