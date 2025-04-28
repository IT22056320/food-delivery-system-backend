const express = require("express")
const {
    verifyRestaurant,
    getUnverifiedRestaurants,
    getRestaurantStats,
    getSystemStats,
} = require("../controllers/adminController")
const { protect, isAdmin } = require("../middlewares/authMiddleware")

const router = express.Router()

// All routes are admin-only
router.use(protect)
router.use(isAdmin)

router.patch("/restaurants/:id/verify", verifyRestaurant)
router.get("/restaurants/unverified", getUnverifiedRestaurants)
router.get("/restaurants/:restaurantId/stats", getRestaurantStats)
router.get("/system/stats", getSystemStats)

module.exports = router

