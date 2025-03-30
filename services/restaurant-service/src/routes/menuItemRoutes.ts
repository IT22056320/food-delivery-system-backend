import express from "express"
import {
    createMenuItem,
    getMenuItems,
    getMenuItemById,
    updateMenuItem,
    updateMenuItemAvailability,
    deleteMenuItem,
} from "../controllers/menuItemController"
import { protect, isRestaurantOwner } from "../middlewares/authMiddleware"

const router = express.Router()

// Public routes
router.get("/restaurant/:restaurantId", getMenuItems)
router.get("/:id", getMenuItemById)

// Protected routes
router.post("/", protect, isRestaurantOwner, createMenuItem)
router.put("/:id", protect, isRestaurantOwner, updateMenuItem)
router.patch("/:id/availability", protect, isRestaurantOwner, updateMenuItemAvailability)
router.delete("/:id", protect, isRestaurantOwner, deleteMenuItem)

export default router

