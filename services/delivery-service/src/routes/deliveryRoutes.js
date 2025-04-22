const express = require("express")
const deliveryController = require("../controllers/deliveryController")
const { protect, isDeliveryPerson } = require("../middlewares/authMiddleware")

const router = express.Router()

// Create a new delivery (accessible to any authenticated user)
// This route should NOT use the protect middleware to allow service-to-service communication
router.post("/", deliveryController.createDelivery)

// Get delivery by order ID (no authentication required for service-to-service communication)
router.get("/by-order/:orderId", deliveryController.getDeliveryByOrderId)

// Apply authentication middleware to all other routes
router.use(protect)

// Routes for delivery personnel
router.get("/available", isDeliveryPerson, deliveryController.getAvailableDeliveries)
router.get("/my-deliveries", isDeliveryPerson, deliveryController.getMyDeliveries)
router.get("/history", isDeliveryPerson, deliveryController.getDeliveryHistory)
router.get("/stats", isDeliveryPerson, deliveryController.getDeliveryStats)
router.post("/:deliveryId/accept", isDeliveryPerson, deliveryController.acceptDelivery)
router.patch("/:deliveryId/status", isDeliveryPerson, deliveryController.updateDeliveryStatus)

// Get delivery by ID (accessible to delivery person, customer, and admin)
router.get("/:deliveryId", deliveryController.getDeliveryById)

module.exports = router
