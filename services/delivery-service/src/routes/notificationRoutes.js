const express = require("express")
const notificationController = require("../controllers/notificationController")
const { protect, isDeliveryPerson } = require("../middlewares/authMiddleware")

const router = express.Router()

// Apply authentication middleware to all routes
router.use(protect)

// Routes for delivery personnel
router.get("/", isDeliveryPerson, notificationController.getMyNotifications)
router.patch("/:notificationId/read", isDeliveryPerson, notificationController.markAsRead)
router.patch("/mark-all-read", isDeliveryPerson, notificationController.markAllAsRead)

// Admin route for creating notifications
router.post("/", notificationController.createNotification)

module.exports = router
