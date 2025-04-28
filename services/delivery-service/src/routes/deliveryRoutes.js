const express = require("express")
const deliveryController = require("../controllers/deliveryController")
const { protect, isDeliveryPerson, isAdmin, isRestaurant } = require("../middlewares/authMiddleware")

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// IMPORTANT: Specific routes must come BEFORE parameter routes
// Routes for delivery persons
router.get("/my-deliveries", isDeliveryPerson, deliveryController.getMyDeliveries)
router.get("/available", isDeliveryPerson, deliveryController.getAvailableDeliveries)
router.get("/history", isDeliveryPerson, deliveryController.getDeliveryHistory)
router.get("/stats", isDeliveryPerson, deliveryController.getDeliveryStats)

// Routes with parameters
router.get("/:deliveryId", deliveryController.getDeliveryById)
router.post("/:deliveryId/accept", isDeliveryPerson, deliveryController.acceptDelivery)
router.patch("/:deliveryId/status", isDeliveryPerson, deliveryController.updateDeliveryStatus)

// Admin routes
router.post("/", deliveryController.createDelivery) // Allow any authenticated user to create delivery
router.delete("/:deliveryId", isAdmin, deliveryController.deleteDelivery)

module.exports = router
