import type { Response } from "express"
import Order from "../models/Order"
import Restaurant from "../models/Restaurant"
import type { RequestWithUser } from "../types"

// Get all orders for a restaurant
export const getRestaurantOrders = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { restaurantId } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Check if user is the restaurant owner
        const restaurant = await Restaurant.findById(restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to view orders for this restaurant" })
            return
        }

        const orders = await Order.find({ restaurantId }).sort({ createdAt: -1 })

        res.status(200).json(orders)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch orders",
        })
    }
}

// Get order by ID
export const getOrderById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const order = await Order.findById(id)

        if (!order) {
            res.status(404).json({ error: "Order not found" })
            return
        }

        // Check if user is the restaurant owner, the customer, or admin
        const restaurant = await Restaurant.findById(order.restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && order.userId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to view this order" })
            return
        }

        res.status(200).json(order)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch order",
        })
    }
}

// Update order status
export const updateOrderStatus = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const { status, estimatedDeliveryTime } = req.body

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const order = await Order.findById(id)

        if (!order) {
            res.status(404).json({ error: "Order not found" })
            return
        }

        // Check if user is the restaurant owner or admin
        const restaurant = await Restaurant.findById(order.restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to update this order" })
            return
        }

        // Update order status
        order.status = status

        // Update estimated delivery time if provided
        if (estimatedDeliveryTime) {
            order.estimatedDeliveryTime = new Date(estimatedDeliveryTime)
        }

        // If status is delivered, set actual delivery time
        if (status === "delivered") {
            order.actualDeliveryTime = new Date()
        }

        await order.save()

        res.status(200).json(order)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to update order status",
        })
    }
}

// Get pending orders for a restaurant
export const getPendingOrders = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { restaurantId } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Check if user is the restaurant owner
        const restaurant = await Restaurant.findById(restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to view orders for this restaurant" })
            return
        }

        const orders = await Order.find({
            restaurantId,
            status: { $in: ["pending", "accepted", "preparing"] },
        }).sort({ createdAt: 1 })

        res.status(200).json(orders)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch pending orders",
        })
    }
}

// Get completed orders for a restaurant
export const getCompletedOrders = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { restaurantId } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Check if user is the restaurant owner
        const restaurant = await Restaurant.findById(restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to view orders for this restaurant" })
            return
        }

        const orders = await Order.find({
            restaurantId,
            status: { $in: ["delivered", "cancelled"] },
        })
            .sort({ createdAt: -1 })
            .limit(50)

        res.status(200).json(orders)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch completed orders",
        })
    }
}

