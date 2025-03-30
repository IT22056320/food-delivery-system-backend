import express from "express"
import {
    createRestaurant,
    getAllRestaurants,
    getRestaurantById,
    getMyRestaurants,
    updateRestaurant,
    updateAvailability,
    deleteRestaurant,
} from "../controllers/restaurantController"
import { protect, isRestaurantOwner, isAdmin } from "../middlewares/authMiddleware"

const router = express.Router()

// Public routes
router.get("/:id", getRestaurantById)

// Protected routes
router.post("/", protect, isRestaurantOwner, createRestaurant) // Add isRestaurantOwner here
router.get("/", protect, isAdmin, getAllRestaurants)
router.get("/owner/my-restaurants", protect, getMyRestaurants)
router.put("/:id", protect, isRestaurantOwner, updateRestaurant) // Add isRestaurantOwner here
router.patch("/:id/availability", protect, isRestaurantOwner, updateAvailability) // Add isRestaurantOwner here
router.delete("/:id", protect, isRestaurantOwner, deleteRestaurant) // Add isRestaurantOwner here

export default router

