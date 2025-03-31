const express = require("express")
const {
    getRestaurantOrders,
    getOrderById,
    updateOrderStatus,
    getPendingOrders,
    getCompletedOrders,
} = require("../controllers/orderController")
const { protect, isRestaurantOwner } = require("../middlewares/authMiddleware")

const router = express.Router()

// Protected routes
router.get("/restaurant/:restaurantId", protect, isRestaurantOwner, getRestaurantOrders)
router.get("/restaurant/:restaurantId/pending", protect, isRestaurantOwner, getPendingOrders)
router.get("/restaurant/:restaurantId/completed", protect, isRestaurantOwner, getCompletedOrders)
router.get("/:id", protect, getOrderById)
router.patch("/:id/status", protect, isRestaurantOwner, updateOrderStatus)

module.exports = router

