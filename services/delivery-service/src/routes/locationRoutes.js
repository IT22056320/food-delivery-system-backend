const express = require("express")
const locationController = require("../controllers/locationController")
const { protect, isDeliveryPerson, isAdmin } = require("../middlewares/authMiddleware")

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// Update delivery person's location
router.post("/update", isDeliveryPerson, locationController.updateLocation)

// Get nearby delivery personnel (for restaurant and admin)
router.get("/nearby", locationController.getNearbyDrivers)

// Get location of a specific delivery (accessible to customer, delivery person, restaurant, and admin)
router.get("/delivery/:deliveryId", locationController.getDeliveryLocation)

// Get all active delivery locations (admin only)
router.get("/active", isAdmin, locationController.getAllActiveLocations)

module.exports = router
