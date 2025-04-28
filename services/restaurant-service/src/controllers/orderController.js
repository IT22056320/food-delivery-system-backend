const Order = require("../models/Order")
const Restaurant = require("../models/Restaurant")
const MenuItem = require("../models/MenuItem")

// Get all orders for a restaurant
// Add this function if it doesn't exist already
exports.getRestaurantOrders = async (req, res) => {
    try {
        const restaurantId = req.params.restaurantId || req.user.restaurantId;

        if (!restaurantId) {
            return res.status(400).json({ message: "Restaurant ID is required" });
        }

        console.log(`Fetching orders for restaurant: ${restaurantId}`);

        const orders = await Order.find({ restaurant_id: restaurantId }).sort({ createdAt: -1 });
        console.log(`Found ${orders.length} orders for restaurant ${restaurantId}`);

        // Enrich orders with customer info if needed
        const enrichedOrders = await Promise.all(
            orders.map(async (order) => {
                try {

                    return order;
                } catch (error) {
                    console.error(`Error processing order ${order._id}:`, error);
                    return order;
                }
            })
        );

        return res.status(200).json(enrichedOrders);
    } catch (error) {
        console.error("Error fetching restaurant orders:", error);
        return res.status(500).json({ message: "Error fetching orders", error: error.message });
    }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
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
exports.updateOrderStatus = async (req, res) => {
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
exports.getPendingOrders = async (req, res) => {
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
exports.getCompletedOrders = async (req, res) => {
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

// Get popular menu items for a restaurant
exports.getPopularMenuItems = async (req, res) => {
    try {
        const { restaurantId } = req.params
        const { period = "week" } = req.query // Default to weekly stats

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
            res.status(403).json({ error: "Not authorized to view stats for this restaurant" })
            return
        }

        // Calculate date range based on period
        let dateFilter = {}
        const now = new Date()

        if (period === "day") {
            const startOfDay = new Date(now.setHours(0, 0, 0, 0))
            dateFilter = { createdAt: { $gte: startOfDay } }
        } else if (period === "week") {
            const startOfWeek = new Date(now)
            startOfWeek.setDate(now.getDate() - now.getDay()) // Start of week (Sunday)
            startOfWeek.setHours(0, 0, 0, 0)
            dateFilter = { createdAt: { $gte: startOfWeek } }
        } else if (period === "month") {
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            dateFilter = { createdAt: { $gte: startOfMonth } }
        }

        // Find all delivered orders for this restaurant in the given period
        const orders = await Order.find({
            restaurantId,
            status: "delivered",
            ...dateFilter,
        })

        // Count occurrences of each menu item
        const menuItemCounts = {}

        // Process all orders and count menu items
        orders.forEach((order) => {
            order.items.forEach((item) => {
                const itemId = item.menuItemId.toString()
                if (!menuItemCounts[itemId]) {
                    menuItemCounts[itemId] = {
                        menuItemId: itemId,
                        name: item.name,
                        count: 0,
                    }
                }
                menuItemCounts[itemId].count += item.quantity
            })
        })

        // Convert to array and sort by count
        const popularItems = Object.values(menuItemCounts)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5) // Get top 5 items

        // Fetch additional details for these items if needed
        const itemsWithDetails = await Promise.all(
            popularItems.map(async (item) => {
                const menuItem = await MenuItem.findById(item.menuItemId)
                return {
                    ...item,
                    image: menuItem?.image || null,
                    price: menuItem?.price || 0,
                    category: menuItem?.category || "",
                }
            }),
        )

        res.status(200).json(itemsWithDetails)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch popular menu items",
        })
    }
}


