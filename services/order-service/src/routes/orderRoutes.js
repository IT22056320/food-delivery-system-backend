const express = require("express")
const OrderController = require("../controllers/orderController")
const { protect } = require("../middlewares/authMiddleware")

const orderRoutes = express.Router()

// Apply authentication middleware to all routes
orderRoutes.use(protect)

// IMPORTANT: Specific routes must come BEFORE parameterized routes
// Get orders that are ready for pickup
orderRoutes.get("/ready-for-pickup", OrderController.getOrdersReadyForPickup)

// Get all orders for the authenticated user
orderRoutes.get("/", OrderController.getUserOrders)

// Routes with parameters should come after specific routes
// Get order by ID
orderRoutes.get("/:orderId", OrderController.getOrderById)

// Update order status
orderRoutes.patch("/:orderId/status", OrderController.updateOrderStatus)

// Update an order with a delivery ID
orderRoutes.put("/:id/delivery", OrderController.updateOrderDelivery)

// Create a new order
orderRoutes.post("/", OrderController.createOrder)

module.exports = orderRoutes
