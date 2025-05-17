const express = require("express");
const paymentController = require("../controllers/paymentController");
const { protect } = require("../middlewares/authMiddleware");

const router = express.Router();

// Create payment intent
router.post(
  "/create-payment-intent",
  protect,
  paymentController.createPaymentIntent
);

// Confirm payment status
router.post("/confirm-payment", protect, paymentController.confirmPayment);

// Process refund
router.post("/refund", protect, paymentController.processRefund);

// Get payment by order ID
router.get("/order/:orderId", protect, paymentController.getPaymentByOrderId);

// Stripe webhook - no auth needed as it's called by Stripe
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleWebhook
);

module.exports = router;
