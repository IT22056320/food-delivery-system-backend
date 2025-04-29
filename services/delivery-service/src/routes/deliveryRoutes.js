const express = require("express")
const router = express.Router()
const deliveryController = require("../controllers/deliveryController")
const { verifyToken, isDeliveryPerson, isAdmin, optionalVerifyToken } = require("../middlewares/authMiddleware")

// Create a new delivery
router.post("/", deliveryController.createDelivery)

// Get all deliveries (admin only)
router.get("/", optionalVerifyToken, deliveryController.getAllDeliveries)

// Get delivery by ID
router.get("/:id", optionalVerifyToken, deliveryController.getDeliveryById)

// Get delivery by order ID
router.get("/by-order/:orderId", optionalVerifyToken, deliveryController.getDeliveryByOrderId)

// Update delivery status
router.put("/:id/status", optionalVerifyToken, deliveryController.updateDeliveryStatus)

// Update delivery person's current location
router.post("/:id/location", optionalVerifyToken, deliveryController.updateDeliveryLocation)

// Get delivery person's current location
router.get("/:id/location", optionalVerifyToken, deliveryController.getDeliveryLocation)

// Assign delivery to a delivery person
router.put("/:id/assign", optionalVerifyToken, deliveryController.assignDelivery)

// Get deliveries for a specific delivery person
router.get(
    "/delivery-person/:delivery_person_id/active",
    optionalVerifyToken,
    deliveryController.getDeliveriesForDeliveryPerson,
)

// Get delivery history for a specific delivery person
router.get(
    "/delivery-person/:delivery_person_id/history",
    optionalVerifyToken,
    deliveryController.getDeliveryHistoryForDeliveryPerson,
)

// Get available deliveries for assignment
router.get("/available", optionalVerifyToken, deliveryController.getAvailableDeliveries)

// Auto-assign delivery to nearest delivery person
router.put("/:id/auto-assign", optionalVerifyToken, deliveryController.autoAssignDelivery)

// Get orders that are ready for pickup
router.get("/orders/ready-for-pickup", optionalVerifyToken, deliveryController.getOrdersReadyForPickup)

module.exports = router
