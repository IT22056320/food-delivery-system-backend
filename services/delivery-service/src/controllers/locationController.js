const DeliveryLocation = require("../models/DeliveryLocation")
const Delivery = require("../models/Delivery")

// Update delivery person's location
exports.updateLocation = async (req, res) => {
    try {
        const { lat, lng, status, heading, speed } = req.body
        const deliveryPersonId = req.user.id

        if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and longitude are required" })
        }

        // Find the delivery person's current active delivery
        const activeDelivery = await Delivery.findOne({
            delivery_person_id: deliveryPersonId,
            status: { $in: ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"] },
        })

        // Parse coordinates once to avoid repeated parsing
        const parsedLng = Number.parseFloat(lng)
        const parsedLat = Number.parseFloat(lat)
        const parsedHeading = heading ? Number.parseFloat(heading) : 0
        const parsedSpeed = speed ? Number.parseFloat(speed) : 0

        // Update or create location record
        const updatedLocation = await DeliveryLocation.findOneAndUpdate(
            { delivery_person_id: deliveryPersonId },
            {
                location: {
                    type: "Point",
                    coordinates: [parsedLng, parsedLat], // MongoDB uses [longitude, latitude]
                },
                status: status || (activeDelivery ? "BUSY" : "AVAILABLE"),
                last_updated: new Date(),
                delivery_id: activeDelivery ? activeDelivery._id : null,
                heading: parsedHeading,
                speed: parsedSpeed,
            },
            { new: true, upsert: true },
        )

        // Emit location update via Socket.io only if there's an active delivery
        if (req.io && activeDelivery) {
            // Emit to all clients tracking this delivery
            req.io.to(`delivery:${activeDelivery._id}`).emit("locationUpdate", {
                deliveryId: activeDelivery._id,
                location: {
                    lat: parsedLat,
                    lng: parsedLng,
                },
                heading: parsedHeading,
                speed: parsedSpeed,
                timestamp: new Date(),
            })

            // Emit to admin dashboard
            req.io.to("admin").emit("driverLocationUpdate", {
                driverId: deliveryPersonId,
                location: {
                    lat: parsedLat,
                    lng: parsedLng,
                },
                status: updatedLocation.status,
                heading: parsedHeading,
                speed: parsedSpeed,
                timestamp: new Date(),
            })
        }

        return res.status(200).json(updatedLocation)
    } catch (error) {
        console.error("Error updating location:", error)
        return res.status(500).json({ message: "Error updating location", error: error.message })
    }
}

// Get nearby delivery personnel
exports.getNearbyDrivers = async (req, res) => {
    try {
        const { lat, lng, maxDistance = 5000, limit = 10 } = req.query // maxDistance in meters

        if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and longitude are required" })
        }

        // Find available drivers within the specified radius
        const nearbyDrivers = await DeliveryLocation.find({
            status: "AVAILABLE",
            location: {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [Number.parseFloat(lng), Number.parseFloat(lat)], // MongoDB uses [longitude, latitude]
                    },
                    $maxDistance: Number.parseInt(maxDistance),
                },
            },
        })
            .limit(Number.parseInt(limit))
            .select("delivery_person_id location last_updated")

        return res.status(200).json(nearbyDrivers)
    } catch (error) {
        console.error("Error finding nearby drivers:", error)
        return res.status(500).json({ message: "Error finding nearby drivers", error: error.message })
    }
}

// Get location of a specific delivery
exports.getDeliveryLocation = async (req, res) => {
    try {
        const { deliveryId } = req.params

        // Find the delivery
        const delivery = await Delivery.findById(deliveryId)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        // Check if user is authorized to view this delivery
        const isCustomer = req.user.role === "customer" && delivery.customer_id === req.user.id
        const isDeliveryPerson = req.user.role === "delivery_person" && delivery.delivery_person_id === req.user.id
        const isRestaurant = req.user.role === "restaurant" && delivery.restaurant_id === req.user.id
        const isAdmin = req.user.role === "admin"

        if (!(isCustomer || isDeliveryPerson || isRestaurant || isAdmin)) {
            return res.status(403).json({ message: "Not authorized to view this delivery location" })
        }

        // If no delivery person assigned yet
        if (!delivery.delivery_person_id) {
            return res.status(200).json({ message: "No delivery person assigned yet", location: null })
        }

        // Get the delivery person's location
        const locationData = await DeliveryLocation.findOne({ delivery_person_id: delivery.delivery_person_id })

        if (!locationData) {
            return res.status(200).json({ message: "Delivery person location not available", location: null })
        }

        return res.status(200).json({
            deliveryId: delivery._id,
            status: delivery.status,
            location: {
                lat: locationData.location.coordinates[1],
                lng: locationData.location.coordinates[0],
            },
            heading: locationData.heading,
            speed: locationData.speed,
            lastUpdated: locationData.last_updated,
        })
    } catch (error) {
        console.error("Error getting delivery location:", error)
        return res.status(500).json({ message: "Error getting delivery location", error: error.message })
    }
}

// Get all active delivery locations (for admin dashboard)
exports.getAllActiveLocations = async (req, res) => {
    try {
        // Only admin can access this endpoint
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Not authorized to access this resource" })
        }

        // Get all active delivery locations
        const activeLocations = await DeliveryLocation.find({
            status: { $in: ["AVAILABLE", "BUSY"] },
        }).select("delivery_person_id location status last_updated delivery_id heading speed")

        // Format the response
        const formattedLocations = activeLocations.map((loc) => ({
            driverId: loc.delivery_person_id,
            location: {
                lat: loc.location.coordinates[1],
                lng: loc.location.coordinates[0],
            },
            status: loc.status,
            deliveryId: loc.delivery_id,
            heading: loc.heading,
            speed: loc.speed,
            lastUpdated: loc.last_updated,
        }))

        return res.status(200).json(formattedLocations)
    } catch (error) {
        console.error("Error getting active locations:", error)
        return res.status(500).json({ message: "Error getting active locations", error: error.message })
    }
}
