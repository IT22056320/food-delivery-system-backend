const express = require("express");
const router = express.Router();
const deliveryController = require("../controllers/deliveryController");
const {
  verifyToken,
  isDeliveryPerson,
  isAdmin,
  optionalVerifyToken,
} = require("../middlewares/authMiddleware");

// Create a new delivery
router.post("/", deliveryController.createDelivery);

// Get all deliveries (admin only)
router.get("/", optionalVerifyToken, deliveryController.getAllDeliveries);

// Get available deliveries for assignment - MUST come before /:id route
router.get(
  "/available",
  optionalVerifyToken,
  deliveryController.getAvailableDeliveries
);

// Get orders that are ready for pickup - MUST come before /:id route
router.get(
  "/orders/ready-for-pickup",
  optionalVerifyToken,
  deliveryController.getOrdersReadyForPickup
);

// Get delivery by order ID - MUST come before /:id route
router.get(
  "/by-order/:orderId",
  optionalVerifyToken,
  deliveryController.getDeliveryByOrderId
);

// Get deliveries for a specific delivery person - MUST come before /:id route
router.get(
  "/delivery-person/:delivery_person_id/active",
  optionalVerifyToken,
  deliveryController.getDeliveriesForDeliveryPerson
);

// Get delivery history for a specific delivery person - MUST come before /:id route
router.get(
  "/delivery-person/:delivery_person_id/history",
  optionalVerifyToken,
  deliveryController.getDeliveryHistoryForDeliveryPerson
);

// Get earnings stats for a specific delivery person - MUST come before /:id route
router.get(
  "/delivery-person/:delivery_person_id/earnings",
  optionalVerifyToken,
  deliveryController.getEarningsStats
);

// Get delivery by ID - This should come AFTER all other GET routes with specific paths
router.get("/:id", optionalVerifyToken, deliveryController.getDeliveryById);

// Update delivery status
router.put(
  "/:id/status",
  optionalVerifyToken,
  deliveryController.updateDeliveryStatus
);

// Update delivery person's current location
router.post(
  "/:id/location",
  optionalVerifyToken,
  deliveryController.updateDeliveryLocation
);

// Get delivery person's current location
router.get(
  "/:id/location",
  optionalVerifyToken,
  deliveryController.getDeliveryLocation
);

// Assign delivery to a delivery person
router.put(
  "/:id/assign",
  optionalVerifyToken,
  deliveryController.assignDelivery
);

// Auto-assign delivery to nearest delivery person
router.put(
  "/:id/auto-assign",
  optionalVerifyToken,
  deliveryController.autoAssignDelivery
);

module.exports = router;
