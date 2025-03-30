import express from "express"
import {
    verifyRestaurant,
    getUnverifiedRestaurants,
    getRestaurantStats,
    getSystemStats,
} from "../controllers/adminController"
import { protect, isAdmin } from "../middlewares/authMiddleware"

const router = express.Router()

// All routes are admin-only
router.use(protect)
router.use(isAdmin)

router.patch("/restaurants/:id/verify", verifyRestaurant)
router.get("/restaurants/unverified", getUnverifiedRestaurants)
router.get("/restaurants/:restaurantId/stats", getRestaurantStats)
router.get("/system/stats", getSystemStats)

export default router

