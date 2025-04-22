const express = require("express")
const router = express.Router()
const locationController = require("../controllers/locationController")
const { protect } = require("../middlewares/authMiddleware")

// Update driver location
router.post("/update", protect, locationController.updateLocation)

// Get location for a specific delivery
router.get("/delivery/:deliveryId", protect, locationController.getDeliveryLocation)

// Get nearby drivers
router.get("/nearby", protect, locationController.getNearbyDrivers)

// Export the router
module.exports = router