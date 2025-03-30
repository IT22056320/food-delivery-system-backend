import type { Response } from "express"
import Restaurant from "../models/Restaurant"
import Order from "../models/Order"
import type { RequestWithUser } from "../types"

// Verify restaurant
export const verifyRestaurant = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        if (req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized. Admin access required" })
            return
        }

        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        restaurant.isVerified = true
        await restaurant.save()

        res.status(200).json({
            message: "Restaurant verified successfully",
            restaurant,
        })
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to verify restaurant",
        })
    }
}

// Get all unverified restaurants
export const getUnverifiedRestaurants = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        if (req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized. Admin access required" })
            return
        }

        const restaurants = await Restaurant.find({ isVerified: false })

        res.status(200).json(restaurants)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch unverified restaurants",
        })
    }
}

// Get restaurant statistics
export const getRestaurantStats = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { restaurantId } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        if (req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized. Admin access required" })
            return
        }

        const restaurant = await Restaurant.findById(restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        // Get total orders
        const totalOrders = await Order.countDocuments({ restaurantId })

        // Get completed orders
        const completedOrders = await Order.countDocuments({
            restaurantId,
            status: "delivered",
        })

        // Get cancelled orders
        const cancelledOrders = await Order.countDocuments({
            restaurantId,
            status: "cancelled",
        })

        // Get total revenue
        const revenueResult = await Order.aggregate([
            {
                $match: {
                    restaurantId: restaurantId,
                    status: "delivered",
                    paymentStatus: "completed",
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
        ])

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0

        res.status(200).json({
            totalOrders,
            completedOrders,
            cancelledOrders,
            totalRevenue,
            completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        })
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch restaurant statistics",
        })
    }
}

// Get system-wide statistics
export const getSystemStats = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        if (req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized. Admin access required" })
            return
        }

        // Get total restaurants
        const totalRestaurants = await Restaurant.countDocuments()

        // Get verified restaurants
        const verifiedRestaurants = await Restaurant.countDocuments({ isVerified: true })

        // Get total orders
        const totalOrders = await Order.countDocuments()

        // Get completed orders
        const completedOrders = await Order.countDocuments({ status: "delivered" })

        // Get total revenue
        const revenueResult = await Order.aggregate([
            {
                $match: {
                    status: "delivered",
                    paymentStatus: "completed",
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: "$totalAmount" },
                },
            },
        ])

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0

        res.status(200).json({
            totalRestaurants,
            verifiedRestaurants,
            totalOrders,
            completedOrders,
            totalRevenue,
            completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
        })
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch system statistics",
        })
    }
}

