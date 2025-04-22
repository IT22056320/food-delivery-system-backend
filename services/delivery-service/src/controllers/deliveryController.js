const Delivery = require("../models/Delivery")
const DeliveryLocation = require("../models/DeliveryLocation")
const DeliveryNotification = require("../models/DeliveryNotification")
const axios = require("axios")

// Create a new delivery
exports.createDelivery = async (req, res) => {
    try {
        console.log("Received delivery creation request:", req.body)

        const {
            order_id,
            pickup_location,
            delivery_location,
            customer_contact,
            restaurant_contact,
            estimated_delivery_time,
        } = req.body

        console.log("Creating new delivery for order:", order_id)

        if (!order_id || !pickup_location || !delivery_location) {
            console.error("Missing required fields:", { order_id, pickup_location, delivery_location })
            return res.status(400).json({ message: "Required fields missing" })
        }

        // Check if a delivery already exists for this order
        const existingDelivery = await Delivery.findOne({ order_id })
        if (existingDelivery) {
            console.log("Delivery already exists for order:", order_id)
            return res.status(200).json({
                message: "Delivery already exists for this order",
                delivery: existingDelivery,
            })
        }

        // Create a new delivery record
        const newDelivery = new Delivery({
            order_id,
            pickup_location,
            delivery_location,
            customer_contact,
            restaurant_contact,
            status: "PENDING_ASSIGNMENT",
            estimated_delivery_time: estimated_delivery_time || 30, // Default 30 minutes if not provided
        })

        const savedDelivery = await newDelivery.save()
        console.log("Delivery created successfully:", savedDelivery._id)

        // Create a notification for available delivery persons
        const notification = new DeliveryNotification({
            delivery_id: savedDelivery._id,
            type: "NEW_DELIVERY",
            message: `New delivery order available for pickup from ${restaurant_contact?.name || "restaurant"}`,
            status: "UNREAD",
            target_role: "delivery_person",
        })

        await notification.save()
        console.log("Delivery notification created")

        return res.status(201).json(savedDelivery)
    } catch (error) {
        console.error("Error creating delivery:", error)
        return res.status(500).json({ message: "Error creating delivery", error: error.message })
    }
}

// Get delivery by order ID
exports.getDeliveryByOrderId = async (req, res) => {
    try {
        const { orderId } = req.params
        console.log("Looking for delivery with order ID:", orderId)

        const delivery = await Delivery.findOne({ order_id: orderId })

        if (!delivery) {
            console.log("No delivery found for order ID:", orderId)
            return res.status(404).json({ message: "No delivery found for this order" })
        }

        console.log("Found delivery:", delivery._id)
        return res.status(200).json(delivery)
    } catch (error) {
        console.error("Error fetching delivery by order ID:", error)
        return res.status(500).json({ message: "Error fetching delivery", error: error.message })
    }
}

// Get all available deliveries for a delivery person
exports.getAvailableDeliveries = async (req, res) => {
    try {
        // Find deliveries that are pending assignment
        const availableDeliveries = await Delivery.find({
            status: "PENDING_ASSIGNMENT",
        }).sort({ createdAt: -1 })

        // Enrich deliveries with order details
        const enrichedDeliveries = await Promise.all(
            availableDeliveries.map(async (delivery) => {
                try {
                    // Get order details from Order Service
                    const orderRes = await axios.get(`${process.env.ORDER_SERVICE_URL}/api/orders/${delivery.order_id}`, {
                        headers: {
                            Cookie: req.headers.cookie, // Forward auth cookie
                        },
                    })

                    return {
                        ...delivery.toObject(),
                        order: orderRes.data,
                    }
                } catch (error) {
                    console.error(`Error fetching order for delivery ${delivery._id}:`, error.message)
                    return delivery.toObject()
                }
            }),
        )

        return res.status(200).json(enrichedDeliveries)
    } catch (error) {
        console.error("Error fetching available deliveries:", error)
        return res.status(500).json({ message: "Error fetching available deliveries", error: error.message })
    }
}

// Get all deliveries assigned to the authenticated delivery person
exports.getMyDeliveries = async (req, res) => {
    try {
        const deliveryPersonId = req.user.id

        // Find deliveries assigned to this delivery person
        const myDeliveries = await Delivery.find({
            delivery_person_id: deliveryPersonId,
            status: { $ne: "DELIVERED" }, // Exclude completed deliveries
        }).sort({ createdAt: -1 })

        // Enrich deliveries with order details
        const enrichedDeliveries = await Promise.all(
            myDeliveries.map(async (delivery) => {
                try {
                    // Get order details from Order Service
                    const orderRes = await axios.get(`${process.env.ORDER_SERVICE_URL}/api/orders/${delivery.order_id}`, {
                        headers: {
                            Cookie: req.headers.cookie, // Forward auth cookie
                        },
                    })

                    return {
                        ...delivery.toObject(),
                        order: orderRes.data,
                    }
                } catch (error) {
                    console.error(`Error fetching order for delivery ${delivery._id}:`, error.message)
                    return delivery.toObject()
                }
            }),
        )

        return res.status(200).json(enrichedDeliveries)
    } catch (error) {
        console.error("Error fetching my deliveries:", error)
        return res.status(500).json({ message: "Error fetching my deliveries", error: error.message })
    }
}

// Get delivery history for the authenticated delivery person
exports.getDeliveryHistory = async (req, res) => {
    try {
        const deliveryPersonId = req.user.id
        const { limit = 10, page = 1 } = req.query

        const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

        // Find completed deliveries for this delivery person
        const deliveryHistory = await Delivery.find({
            delivery_person_id: deliveryPersonId,
            status: "DELIVERED",
        })
            .sort({ delivered_at: -1 })
            .skip(skip)
            .limit(Number.parseInt(limit))

        // Get total count for pagination
        const totalCount = await Delivery.countDocuments({
            delivery_person_id: deliveryPersonId,
            status: "DELIVERED",
        })

        // Enrich deliveries with basic order details
        const enrichedDeliveries = await Promise.all(
            deliveryHistory.map(async (delivery) => {
                try {
                    // Get order details from Order Service
                    const orderRes = await axios.get(`${process.env.ORDER_SERVICE_URL}/api/orders/${delivery.order_id}`, {
                        headers: {
                            Cookie: req.headers.cookie, // Forward auth cookie
                        },
                    })

                    return {
                        ...delivery.toObject(),
                        order: {
                            id: orderRes.data._id,
                            total_price: orderRes.data.total_price,
                            restaurant: orderRes.data.restaurant?.name || "Unknown Restaurant",
                            customer: orderRes.data.customer_id,
                        },
                    }
                } catch (error) {
                    console.error(`Error fetching order for delivery ${delivery._id}:`, error.message)
                    return delivery.toObject()
                }
            }),
        )

        return res.status(200).json({
            deliveries: enrichedDeliveries,
            pagination: {
                total: totalCount,
                page: Number.parseInt(page),
                limit: Number.parseInt(limit),
                pages: Math.ceil(totalCount / Number.parseInt(limit)),
            },
        })
    } catch (error) {
        console.error("Error fetching delivery history:", error)
        return res.status(500).json({ message: "Error fetching delivery history", error: error.message })
    }
}

// Accept a delivery assignment
exports.acceptDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params
        const deliveryPersonId = req.user.id

        const delivery = await Delivery.findById(deliveryId)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        if (delivery.status !== "PENDING_ASSIGNMENT") {
            return res.status(400).json({ message: "This delivery is no longer available for assignment" })
        }

        // Update delivery status and assign to delivery person
        delivery.status = "ASSIGNED"
        delivery.delivery_person_id = deliveryPersonId
        delivery.assigned_at = new Date()

        await delivery.save()

        // Update delivery person's location status
        await DeliveryLocation.findOneAndUpdate(
            { delivery_person_id: deliveryPersonId },
            {
                status: "BUSY",
                delivery_id: deliveryId,
            },
            { new: true, upsert: true },
        )

        // Create notification for restaurant
        // This would typically be sent to a notification service or directly to the restaurant
        // For now, we'll just log it
        console.log(`Delivery ${deliveryId} has been accepted by delivery person ${deliveryPersonId}`)

        // Update order status in Order Service
        try {
            await axios.patch(
                `${process.env.ORDER_SERVICE_URL}/api/orders/${delivery.order_id}/status`,
                { status: "OUT_FOR_DELIVERY" },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Cookie: req.headers.cookie, // Forward auth cookie
                    },
                },
            )
        } catch (error) {
            console.error(`Error updating order status for ${delivery.order_id}:`, error.message)
            // Continue execution even if order update fails
        }

        return res.status(200).json({ message: "Delivery accepted successfully", delivery })
    } catch (error) {
        console.error("Error accepting delivery:", error)
        return res.status(500).json({ message: "Error accepting delivery", error: error.message })
    }
}

// Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const { deliveryId } = req.params
        const { status, notes } = req.body
        const deliveryPersonId = req.user.id

        const delivery = await Delivery.findById(deliveryId)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        if (delivery.delivery_person_id !== deliveryPersonId) {
            return res.status(403).json({ message: "You are not authorized to update this delivery" })
        }

        // Validate status transition
        const validTransitions = {
            ASSIGNED: ["PICKED_UP", "CANCELLED"],
            PICKED_UP: ["IN_TRANSIT", "CANCELLED"],
            IN_TRANSIT: ["DELIVERED", "FAILED"],
        }

        if (!validTransitions[delivery.status]?.includes(status)) {
            return res.status(400).json({
                message: `Invalid status transition from ${delivery.status} to ${status}`,
                validTransitions: validTransitions[delivery.status],
            })
        }

        // Update delivery status
        delivery.status = status

        if (notes) {
            delivery.delivery_notes = notes
        }

        // Update timestamps based on status
        if (status === "PICKED_UP") {
            delivery.picked_up_at = new Date()
        } else if (status === "DELIVERED") {
            delivery.delivered_at = new Date()

            // Calculate actual delivery time in minutes
            const pickupTime = new Date(delivery.picked_up_at).getTime()
            const deliveryTime = new Date(delivery.delivered_at).getTime()
            delivery.actual_delivery_time = Math.round((deliveryTime - pickupTime) / (1000 * 60))

            // Update delivery person's location status
            await DeliveryLocation.findOneAndUpdate(
                { delivery_person_id: deliveryPersonId },
                {
                    status: "AVAILABLE",
                    delivery_id: null,
                },
                { new: true },
            )
        }

        await delivery.save()

        // Update order status in Order Service based on delivery status
        let orderStatus = null
        if (status === "PICKED_UP") {
            orderStatus = "OUT_FOR_DELIVERY"
        } else if (status === "DELIVERED") {
            orderStatus = "DELIVERED"
        } else if (status === "FAILED" || status === "CANCELLED") {
            orderStatus = "CANCELLED"
        }

        if (orderStatus) {
            try {
                await axios.patch(
                    `${process.env.ORDER_SERVICE_URL}/api/orders/${delivery.order_id}/status`,
                    { status: orderStatus },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            Cookie: req.headers.cookie, // Forward auth cookie
                        },
                    },
                )
            } catch (error) {
                console.error(`Error updating order status for ${delivery.order_id}:`, error.message)
                // Continue execution even if order update fails
            }
        }

        return res.status(200).json({ message: `Delivery status updated to ${status}`, delivery })
    } catch (error) {
        console.error("Error updating delivery status:", error)
        return res.status(500).json({ message: "Error updating delivery status", error: error.message })
    }
}

// Get delivery details by ID
exports.getDeliveryById = async (req, res) => {
    try {
        const { deliveryId } = req.params

        const delivery = await Delivery.findById(deliveryId)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        // Check if the user is authorized to view this delivery
        // Admin can view any delivery, delivery person can only view their own
        if (req.user && req.user.role === "delivery_person" && delivery.delivery_person_id !== req.user.id) {
            return res.status(403).json({ message: "You are not authorized to view this delivery" })
        }

        // Get order details from Order Service
        try {
            const orderRes = await axios.get(`${process.env.ORDER_SERVICE_URL}/api/orders/${delivery.order_id}`, {
                headers: {
                    Cookie: req.headers.cookie, // Forward auth cookie
                },
            })

            return res.status(200).json({
                ...delivery.toObject(),
                order: orderRes.data,
            })
        } catch (error) {
            console.error(`Error fetching order for delivery ${deliveryId}:`, error.message)
            return res.status(200).json(delivery)
        }
    } catch (error) {
        console.error("Error fetching delivery:", error)
        return res.status(500).json({ message: "Error fetching delivery", error: error.message })
    }
}

// Get all deliveries
exports.getAllDeliveries = async (req, res) => {
    try {
        // Only admin can access this endpoint
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to access this resource" })
        }

        const deliveries = await Delivery.find()
        return res.status(200).json(deliveries)
    } catch (error) {
        console.error("Error fetching all deliveries:", error)
        return res.status(500).json({ message: "Error fetching all deliveries", error: error.message })
    }
}

// Delete a delivery
exports.deleteDelivery = async (req, res) => {
    try {
        const { deliveryId } = req.params

        // Only admin can access this endpoint
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to access this resource" })
        }

        const delivery = await Delivery.findById(deliveryId)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        await Delivery.findByIdAndDelete(deliveryId)
        return res.status(200).json({ message: "Delivery deleted successfully" })
    } catch (error) {
        console.error("Error deleting delivery:", error)
        return res.status(500).json({ message: "Error deleting delivery", error: error.message })
    }
}

// Get delivery statistics for the authenticated delivery person
exports.getDeliveryStats = async (req, res) => {
    try {
        const deliveryPersonId = req.user.id
        const { period = "week" } = req.query

        let dateFilter = {}
        const now = new Date()

        if (period === "day") {
            // Today
            const startOfDay = new Date(now.setHours(0, 0, 0, 0))
            dateFilter = { delivered_at: { $gte: startOfDay } }
        } else if (period === "week") {
            // Last 7 days
            const lastWeek = new Date(now)
            lastWeek.setDate(lastWeek.getDate() - 7)
            dateFilter = { delivered_at: { $gte: lastWeek } }
        } else if (period === "month") {
            // Last 30 days
            const lastMonth = new Date(now)
            lastMonth.setDate(lastMonth.getDate() - 30)
            dateFilter = { delivered_at: { $gte: lastMonth } }
        }

        // Total completed deliveries
        const totalDeliveries = await Delivery.countDocuments({
            delivery_person_id: deliveryPersonId,
            status: "DELIVERED",
            ...dateFilter,
        })

        // Total earnings (this would typically come from a payment service)
        // For now, we'll use a placeholder calculation
        const completedDeliveries = await Delivery.find({
            delivery_person_id: deliveryPersonId,
            status: "DELIVERED",
            ...dateFilter,
        })

        // Calculate earnings (placeholder logic)
        let totalEarnings = 0
        let totalDistance = 0
        let avgRating = 0
        const deliveryTimes = []

        completedDeliveries.forEach((delivery) => {
            // Base pay per delivery
            const basePay = 5

            // Distance bonus (placeholder)
            const distanceBonus = (0.5 * (delivery.actual_delivery_time || 30)) / 10

            // Tip (placeholder - would come from order service)
            const tip = Math.random() * 5

            // Total for this delivery
            const deliveryEarnings = basePay + distanceBonus + tip

            totalEarnings += deliveryEarnings
            totalDistance += (delivery.actual_delivery_time || 30) / 10 // Rough distance estimate

            // Collect delivery times for average calculation
            if (delivery.actual_delivery_time) {
                deliveryTimes.push(delivery.actual_delivery_time)
            }

            // Placeholder for rating (would come from a ratings service)
            avgRating += 4 + Math.random()
        })

        // Calculate averages
        if (completedDeliveries.length > 0) {
            avgRating = avgRating / completedDeliveries.length

            // Round to 1 decimal place
            avgRating = Math.round(avgRating * 10) / 10
        }

        // Calculate average delivery time
        let avgDeliveryTime = 0
        if (deliveryTimes.length > 0) {
            avgDeliveryTime = deliveryTimes.reduce((sum, time) => sum + time, 0) / deliveryTimes.length
            avgDeliveryTime = Math.round(avgDeliveryTime)
        }

        // Round earnings to 2 decimal places
        totalEarnings = Math.round(totalEarnings * 100) / 100

        // Round distance to 1 decimal place
        totalDistance = Math.round(totalDistance * 10) / 10

        return res.status(200).json({
            period,
            totalDeliveries,
            totalEarnings,
            totalDistance,
            avgRating,
            avgDeliveryTime,
        })
    } catch (error) {
        console.error("Error fetching delivery statistics:", error)
        return res.status(500).json({ message: "Error fetching delivery statistics", error: error.message })
    }
}
