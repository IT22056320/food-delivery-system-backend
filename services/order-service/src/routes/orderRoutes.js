const express = require("express");
const orderController = require("../controllers/orderController");
const {
  protect,
  isAdmin,
  isRestaurantOwner,
} = require("../middlewares/authMiddleware");

const router = express.Router();

// Create a new order
router.post("/", protect, orderController.createOrder);

// Get all orders for the current user
router.get("/", protect, orderController.getUserOrders);

// Get order by ID
router.get("/:id", protect, orderController.getOrderById);

// Update order status
router.put("/:id/status", protect, orderController.updateOrderStatus);

// Get orders for a restaurant
router.get(
  "/restaurant/:restaurantId",
  protect,
  isRestaurantOwner,
  orderController.getRestaurantOrders
);

// Get all orders (admin only)
router.get("/admin/all", protect, isAdmin, orderController.getAllOrders);

// Update payment status (called by payment service)
router.post("/:orderId/payment-update", orderController.updatePaymentStatus);

// Process refund (called by payment service)
router.post("/:orderId/refund", orderController.processRefund);

module.exports = router;
