const express = require("express");
const {
  createRestaurant,
  getAllRestaurants,
  getRestaurantById,
  getMyRestaurants,
  updateRestaurant,
  updateAvailability,
  deleteRestaurant,
} = require("../controllers/restaurantController");
const {
  protect,
  isRestaurantOwner,
  isAdmin,
} = require("../middlewares/authMiddleware");
const { upload } = require("../config/cloudinary");

const router = express.Router();

// Public routes
router.get("/:id", getRestaurantById);
router.get("/", getAllRestaurants);

// Protected routes
router.post(
  "/",
  protect,
  isRestaurantOwner,
  upload.single("image"),
  createRestaurant
);
router.get("/owner/my-restaurants", protect, getMyRestaurants);
router.put(
  "/:id",
  protect,
  isRestaurantOwner,
  upload.single("image"),
  updateRestaurant
);
router.patch(
  "/:id/availability",
  protect,
  isRestaurantOwner,
  updateAvailability
);
router.delete("/:id", protect, isRestaurantOwner, deleteRestaurant);

module.exports = router;
