const express = require("express")
const OrderController = require("../controllers/orderController")
const { protect } = require("../middlewares/authMiddleware")

const orderRoutes = express.Router()

// Apply authentication middleware to all routes
orderRoutes.use(protect)

// Create a new order
orderRoutes.post("/", OrderController.createOrder)

// Get order by ID
orderRoutes.get("/:orderId", OrderController.getOrderById)

// Get all orders for the authenticated user
orderRoutes.get("/", OrderController.getUserOrders)

// Update order status
orderRoutes.patch("/:orderId/status", OrderController.updateOrderStatus)

module.exports = orderRoutes
