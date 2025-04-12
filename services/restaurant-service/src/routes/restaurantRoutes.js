const express = require("express")
const {
    createRestaurant,
    getAllRestaurants,
    getRestaurantById,
    getMyRestaurants,
    updateRestaurant,
    updateAvailability,
    deleteRestaurant,
} = require("../controllers/restaurantController")
const { protect, isRestaurantOwner, isAdmin } = require("../middlewares/authMiddleware")

const router = express.Router()

// Public routes
router.get("/:id", getRestaurantById)

// Protected routes
router.post("/", protect, isRestaurantOwner, createRestaurant)
router.get("/", protect, isAdmin, getAllRestaurants)
router.get("/owner/my-restaurants", protect, getMyRestaurants)
router.put("/:id", protect, isRestaurantOwner, updateRestaurant)
router.patch("/:id/availability", protect, isRestaurantOwner, updateAvailability)
router.delete("/:id", protect, isRestaurantOwner, deleteRestaurant)

module.exports = router

