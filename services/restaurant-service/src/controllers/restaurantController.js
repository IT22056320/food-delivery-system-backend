const Restaurant = require("../models/Restaurant")
const mongoose = require("mongoose")

// Create a new restaurant
exports.createRestaurant = async (req, res) => {
    try {
        const { name, address, phone, email, description, cuisine, openingHours, location } = req.body

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Validate that address is provided
        if (!address || address.trim() === "") {
            res.status(400).json({ error: "Restaurant address is required" })
            return
        }

        const restaurantData = {
            name,
            ownerId: req.user._id,
            address,
            phone,
            email,
            description,
            cuisine,
            openingHours,
            isVerified: false, // Requires admin verification
        }

        // Add location if provided and validate coordinates
        if (location) {
            // Log the location object for debugging
            console.log("Location data received:", JSON.stringify(location, null, 2))

            // Check if coordinates are already in the correct format [lng, lat]
            if (Array.isArray(location.coordinates) && location.coordinates.length === 2) {
                const [lng, lat] = location.coordinates

                // Validate that coordinates are valid numbers and not null
                if (lng !== null && lat !== null && !isNaN(Number(lng)) && !isNaN(Number(lat))) {
                    restaurantData.location = {
                        type: "Point",
                        coordinates: [Number(lng), Number(lat)],
                    }
                } else {
                    return res.status(400).json({
                        error: "Invalid location coordinates. Longitude and latitude must be valid numbers.",
                    })
                }
            }
            // Check if coordinates are in the format {lat, lng}
            else if (
                location.coordinates &&
                typeof location.coordinates.lat !== "undefined" &&
                typeof location.coordinates.lng !== "undefined"
            ) {
                const lat = Number(location.coordinates.lat)
                const lng = Number(location.coordinates.lng)

                // Validate that coordinates are valid numbers and not null
                if (location.coordinates.lat !== null && location.coordinates.lng !== null && !isNaN(lat) && !isNaN(lng)) {
                    restaurantData.location = {
                        type: "Point",
                        coordinates: [lng, lat], // MongoDB uses [longitude, latitude] order
                    }
                } else {
                    return res.status(400).json({
                        error: "Invalid location coordinates. Latitude and longitude must be valid numbers.",
                    })
                }
            } else {
                return res.status(400).json({
                    error: "Invalid location format. Expected coordinates as [lng, lat] array or {lat, lng} object.",
                })
            }
        }

        console.log("Creating restaurant with data:", JSON.stringify(restaurantData, null, 2))
        const restaurant = await Restaurant.create(restaurantData)

        res.status(201).json(restaurant)
    } catch (error) {
        console.error("Restaurant creation error:", error)
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to create restaurant",
        })
    }
}

// Get all restaurants (for admin)
exports.getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find()
        res.status(200).json(restaurants)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch restaurants",
        })
    }
}

// Get restaurant by ID
exports.getRestaurantById = async (req, res) => {
    try {
        const { id } = req.params
        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            return res.status(404).json({ message: "Restaurant not found" })
        }

        // Add this logging
        console.log("Restaurant data being sent:", {
            id: restaurant._id,
            name: restaurant.name,
            address: restaurant.address,
            location: restaurant.location,
        })

        res.status(200).json(restaurant)
    } catch (error) {
        console.error("Error fetching restaurant:", error)
        res.status(500).json({ message: "Error fetching restaurant", error: error.message })
    }
}

// Get restaurants owned by the logged-in user
exports.getMyRestaurants = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const restaurants = await Restaurant.find({ ownerId: req.user._id })
        res.status(200).json(restaurants)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch restaurants",
        })
    }
}

// Update restaurant
exports.updateRestaurant = async (req, res) => {
    try {
        const { id } = req.params
        const updateData = { ...req.body }

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Check if valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid restaurant ID" })
            return
        }

        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        // Check if user is the owner or admin
        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to update this restaurant" })
            return
        }

        // Validate location coordinates if provided
        if (updateData.location) {
            // Check if coordinates are already in the correct format [lng, lat]
            if (Array.isArray(updateData.location.coordinates) && updateData.location.coordinates.length === 2) {
                const [lng, lat] = updateData.location.coordinates

                // Validate that coordinates are valid numbers and not null
                if (lng !== null && lat !== null && !isNaN(Number(lng)) && !isNaN(Number(lat))) {
                    updateData.location = {
                        type: "Point",
                        coordinates: [Number(lng), Number(lat)],
                    }
                } else {
                    return res.status(400).json({
                        error: "Invalid location coordinates. Longitude and latitude must be valid numbers.",
                    })
                }
            }
            // Check if coordinates are in the format {lat, lng}
            else if (
                updateData.location.coordinates &&
                typeof updateData.location.coordinates.lat !== "undefined" &&
                typeof updateData.location.coordinates.lng !== "undefined"
            ) {
                const lat = Number(updateData.location.coordinates.lat)
                const lng = Number(updateData.location.coordinates.lng)

                // Validate that coordinates are valid numbers and not null
                if (
                    updateData.location.coordinates.lat !== null &&
                    updateData.location.coordinates.lng !== null &&
                    !isNaN(lat) &&
                    !isNaN(lng)
                ) {
                    updateData.location = {
                        type: "Point",
                        coordinates: [lng, lat], // MongoDB uses [longitude, latitude] order
                    }
                } else {
                    return res.status(400).json({
                        error: "Invalid location coordinates. Latitude and longitude must be valid numbers.",
                    })
                }
            } else {
                return res.status(400).json({
                    error: "Invalid location format. Expected coordinates as [lng, lat] array or {lat, lng} object.",
                })
            }
        }

        console.log("Updating restaurant with data:", JSON.stringify(updateData, null, 2))
        const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

        res.status(200).json(updatedRestaurant)
    } catch (error) {
        console.error("Restaurant update error:", error)
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to update restaurant",
        })
    }
}

// Update restaurant availability
exports.updateAvailability = async (req, res) => {
    try {
        const { id } = req.params
        const { isAvailable } = req.body

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        // Check if user is the owner
        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to update this restaurant" })
            return
        }

        restaurant.isAvailable = isAvailable
        await restaurant.save()

        res.status(200).json(restaurant)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to update availability",
        })
    }
}

// Delete restaurant
exports.deleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        // Check if user is the owner or admin
        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to delete this restaurant" })
            return
        }

        await Restaurant.findByIdAndDelete(id)

        res.status(200).json({ message: "Restaurant deleted successfully" })
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to delete restaurant",
        })
    }
}
