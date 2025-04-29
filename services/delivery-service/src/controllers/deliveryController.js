const Delivery = require("../models/Delivery")
const axios = require("axios")

// Create a new delivery
exports.createDelivery = async (req, res) => {
    try {
        const { order_id, pickup_location, delivery_location, customer_contact, restaurant_contact, order } = req.body

        console.log("Creating delivery with data:", {
            order_id,
            pickup_location,
            delivery_location,
            customer_contact,
            restaurant_contact,
            order,
        })

        console.log("Pickup location details:", {
            address: pickup_location?.address,
            coordinates: pickup_location?.coordinates,
        })
        console.log("Delivery location details:", {
            address: delivery_location?.address,
            coordinates: delivery_location?.coordinates,
        })

        // Validate required fields
        if (!order_id || !pickup_location || !delivery_location || !order) {
            return res.status(400).json({ message: "Missing required fields" })
        }

        // Validate coordinates
        if (!pickup_location.coordinates) {
            console.error("Missing pickup location coordinates")
            return res.status(400).json({ message: "Missing pickup location coordinates" })
        }

        if (!delivery_location.coordinates) {
            console.error("Missing delivery location coordinates")
            return res.status(400).json({ message: "Missing delivery location coordinates" })
        }

        // Validate pickup address
        if (!pickup_location.address || pickup_location.address.trim() === "") {
            console.error("Missing or empty pickup address")
            return res.status(400).json({ message: "Missing pickup address" })
        }

        // Ensure coordinates are numbers and not zero
        const pickupLat = Number(pickup_location.coordinates.lat) || 0
        const pickupLng = Number(pickup_location.coordinates.lng) || 0
        const deliveryLat = Number(delivery_location.coordinates.lat) || 0
        const deliveryLng = Number(delivery_location.coordinates.lng) || 0

        if (deliveryLat === 0 || deliveryLng === 0) {
            console.error("Warning: Delivery coordinates are zero", delivery_location)
        }

        // Check if a delivery already exists for this order
        const existingDelivery = await Delivery.findOne({ order_id })
        if (existingDelivery) {
            return res.status(409).json({
                message: "A delivery already exists for this order",
                delivery: existingDelivery,
            })
        }

        // Create new delivery with validated coordinates
        const newDelivery = new Delivery({
            order_id,
            pickup_location: {
                address: pickup_location.address,
                coordinates: {
                    lat: pickupLat,
                    lng: pickupLng,
                },
            },
            delivery_location: {
                address: delivery_location.address,
                coordinates: {
                    lat: deliveryLat,
                    lng: deliveryLng,
                },
            },
            customer_contact: customer_contact || { name: "Customer", phone: "Not available" },
            restaurant_contact: restaurant_contact || { name: "Restaurant", phone: "Not available" },
            order,
            status: "PENDING",
            estimated_delivery_time: new Date(Date.now() + 45 * 60000), // Default 45 minutes from now
        })

        console.log("Saving delivery with coordinates:", {
            pickup: newDelivery.pickup_location.coordinates,
            delivery: newDelivery.delivery_location.coordinates,
        })

        const savedDelivery = await newDelivery.save()

        // Update the order with the delivery ID
        try {
            await axios.put(
                `http://localhost:5002/api/orders/${order_id}/delivery`,
                {
                    delivery_id: savedDelivery._id,
                },
                {
                    headers: {
                        Cookie: req.headers.cookie, // Forward auth cookie
                    },
                },
            )
        } catch (error) {
            console.error("Error updating order with delivery ID:", error)
            // Continue even if order update fails
        }

        // Automatically try to assign a delivery person
        this.autoAssignDelivery(req, { params: { id: savedDelivery._id } }, (err, result) => {
            if (err) {
                console.error("Error auto-assigning delivery:", err)
            }
        })

        res.status(201).json(savedDelivery)
    } catch (error) {
        console.error("Error creating delivery:", error)
        res.status(500).json({ message: "Error creating delivery", error: error.message })
    }
}

// Find nearest available delivery person
exports.findNearestDeliveryPerson = async (restaurantLocation) => {
    try {
        // In a real system, you would query your database for available delivery persons
        // and calculate distances to find the nearest one

        // For this implementation, we'll query the auth service to find delivery persons
        const response = await axios.get("http://localhost:5000/api/users/delivery-persons", {
            params: {
                status: "available",
                lat: restaurantLocation.coordinates.lat,
                lng: restaurantLocation.coordinates.lng,
                maxDistance: 10000, // 10km radius
            },
        })

        if (response.data && response.data.length > 0) {
            // Sort by distance and return the nearest one
            return response.data[0]
        }

        // For demo purposes, return a mock delivery person if no real ones are found
        return {
            _id: "default_delivery_person_id",
            name: "John Delivery",
            phone: "123-456-7890",
            location: {
                coordinates: {
                    lat: restaurantLocation.coordinates.lat + 0.01, // Slightly offset from restaurant
                    lng: restaurantLocation.coordinates.lng + 0.01,
                },
            },
        }
    } catch (error) {
        console.error("Error finding nearest delivery person:", error)
        return null
    }
}

// Get all deliveries
exports.getAllDeliveries = async (req, res) => {
    try {
        const deliveries = await Delivery.find().sort({ createdAt: -1 })
        res.status(200).json(deliveries)
    } catch (error) {
        console.error("Error fetching deliveries:", error)
        res.status(500).json({ message: "Error fetching deliveries", error: error.message })
    }
}

// Get delivery by ID
exports.getDeliveryById = async (req, res) => {
    try {
        const delivery = await Delivery.findById(req.params.id)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        res.status(200).json(delivery)
    } catch (error) {
        console.error("Error fetching delivery:", error)
        res.status(500).json({ message: "Error fetching delivery", error: error.message })
    }
}

// Get delivery by order ID
exports.getDeliveryByOrderId = async (req, res) => {
    try {
        const delivery = await Delivery.findOne({ order_id: req.params.orderId })

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found for this order" })
        }

        res.status(200).json(delivery)
    } catch (error) {
        console.error("Error fetching delivery by order ID:", error)
        res.status(500).json({ message: "Error fetching delivery", error: error.message })
    }
}

// Update delivery status
exports.updateDeliveryStatus = async (req, res) => {
    try {
        const { id } = req.params
        const { status } = req.body

        if (!status) {
            return res.status(400).json({ message: "Status is required" })
        }

        const delivery = await Delivery.findById(id)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        // Update status and timestamp based on the new status
        delivery.status = status

        if (status === "ASSIGNED" && !delivery.assigned_at) {
            delivery.assigned_at = new Date()
        } else if (status === "PICKED_UP") {
            delivery.picked_up_at = new Date()
        } else if (status === "DELIVERED") {
            delivery.delivered_at = new Date()
        } else if (status === "CANCELLED") {
            delivery.cancelled_at = new Date()
        }

        const updatedDelivery = await delivery.save()

        // Update order status in order service
        try {
            await axios.put(
                `http://localhost:5002/api/orders/${delivery.order_id}/status`,
                {
                    status:
                        status === "DELIVERED"
                            ? "DELIVERED"
                            : status === "PICKED_UP"
                                ? "OUT_FOR_DELIVERY"
                                : status === "CANCELLED"
                                    ? "CANCELLED"
                                    : "IN_PROGRESS",
                },
                {
                    headers: {
                        Cookie: req.headers.cookie, // Forward auth cookie
                    },
                },
            )
        } catch (error) {
            console.error("Error updating order status:", error)
            // Continue even if order update fails
        }

        res.status(200).json(updatedDelivery)
    } catch (error) {
        console.error("Error updating delivery status:", error)
        res.status(500).json({ message: "Error updating delivery status", error: error.message })
    }
}

// Update delivery person's current location
exports.updateDeliveryLocation = async (req, res) => {
    try {
        const { id } = req.params
        const { lat, lng } = req.body

        if (!lat || !lng) {
            return res.status(400).json({ message: "Latitude and longitude are required" })
        }

        const delivery = await Delivery.findById(id)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        // Update current location
        delivery.current_location = {
            lat,
            lng,
            updated_at: new Date(),
        }

        // If delivery is in progress, update estimated delivery time
        if (delivery.status === "PICKED_UP" || delivery.status === "IN_TRANSIT") {
            // In a real system, you would use the Distance Matrix API to calculate the ETA
            // For demo purposes, we'll just set it to 15 minutes from now
            delivery.estimated_delivery_time = new Date(Date.now() + 15 * 60000)
            delivery.status = "IN_TRANSIT" // Ensure status is IN_TRANSIT once we're moving
        }

        const updatedDelivery = await delivery.save()

        res.status(200).json(updatedDelivery)
    } catch (error) {
        console.error("Error updating delivery location:", error)
        res.status(500).json({ message: "Error updating delivery location", error: error.message })
    }
}

// Get delivery person's current location
exports.getDeliveryLocation = async (req, res) => {
    try {
        const { id } = req.params

        const delivery = await Delivery.findById(id)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        // Calculate estimated arrival time based on current location
        let estimatedArrivalTime = "Unknown"

        if (delivery.current_location && delivery.current_location.lat && delivery.current_location.lng) {
            // In a real system, you would use the Distance Matrix API to calculate the ETA
            // For demo purposes, we'll just use the stored estimated_delivery_time
            if (delivery.estimated_delivery_time) {
                const now = new Date()
                const eta = new Date(delivery.estimated_delivery_time)
                const minutesDiff = Math.round((eta - now) / 60000)

                if (minutesDiff > 0) {
                    estimatedArrivalTime = `${minutesDiff} minutes`
                } else {
                    estimatedArrivalTime = "Arriving now"
                }
            }
        }

        res.status(200).json({
            currentLocation: delivery.current_location,
            status: delivery.status,
            estimatedArrivalTime,
        })
    } catch (error) {
        console.error("Error fetching delivery location:", error)
        res.status(500).json({ message: "Error fetching delivery location", error: error.message })
    }
}

// Assign delivery to a delivery person
exports.assignDelivery = async (req, res) => {
    try {
        const { id } = req.params
        const { delivery_person_id, delivery_person_name, accept } = req.body

        // If this is a response to an assignment (accept/reject)
        if (typeof accept === "boolean") {
            const delivery = await Delivery.findById(id)

            if (!delivery) {
                return res.status(404).json({ message: "Delivery not found" })
            }

            if (accept) {
                // Delivery person accepts the assignment
                delivery.status = "ASSIGNED"
                delivery.assigned_at = new Date()

                // In a real app, you would get these from the authenticated user
                delivery.delivery_person_id = req.user.id
                delivery.delivery_person_name = req.user.name

                const updatedDelivery = await delivery.save()
                return res.status(200).json(updatedDelivery)
            } else {
                // Delivery person rejects the assignment
                // In a real app, you might want to track rejections and find another delivery person
                return res.status(200).json({ message: "Delivery assignment rejected" })
            }
        }

        // Manual assignment by admin
        if (!delivery_person_id || !delivery_person_name) {
            return res.status(400).json({ message: "Delivery person ID and name are required" })
        }

        const delivery = await Delivery.findById(id)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        delivery.delivery_person_id = delivery_person_id
        delivery.delivery_person_name = delivery_person_name
        delivery.status = "ASSIGNED"
        delivery.assigned_at = new Date()

        const updatedDelivery = await delivery.save()

        res.status(200).json(updatedDelivery)
    } catch (error) {
        console.error("Error assigning delivery:", error)
        res.status(500).json({ message: "Error assigning delivery", error: error.message })
    }
}

// Get deliveries for a specific delivery person
exports.getDeliveriesForDeliveryPerson = async (req, res) => {
    try {
        const { delivery_person_id } = req.params

        const deliveries = await Delivery.find({
            delivery_person_id,
            status: { $nin: ["DELIVERED", "CANCELLED"] },
        }).sort({ createdAt: -1 })

        res.status(200).json(deliveries)
    } catch (error) {
        console.error("Error fetching deliveries for delivery person:", error)
        res.status(500).json({ message: "Error fetching deliveries", error: error.message })
    }
}

// Get delivery history for a specific delivery person
exports.getDeliveryHistoryForDeliveryPerson = async (req, res) => {
    try {
        const { delivery_person_id } = req.params

        const deliveries = await Delivery.find({
            delivery_person_id,
            status: { $in: ["DELIVERED", "CANCELLED"] },
        }).sort({ createdAt: -1 })

        res.status(200).json(deliveries)
    } catch (error) {
        console.error("Error fetching delivery history:", error)
        res.status(500).json({ message: "Error fetching delivery history", error: error.message })
    }
}

// Get available deliveries for assignment
exports.getAvailableDeliveries = async (req, res) => {
    try {
        // Find deliveries that are pending assignment
        const deliveries = await Delivery.find({
            status: "PENDING",
        }).sort({ createdAt: -1 })

        res.status(200).json(deliveries)
    } catch (error) {
        console.error("Error fetching available deliveries:", error)
        res.status(500).json({ message: "Error fetching available deliveries", error: error.message })
    }
}

// Auto-assign delivery to nearest delivery person
exports.autoAssignDelivery = async (req, res, next) => {
    try {
        const { id } = req.params

        const delivery = await Delivery.findById(id)

        if (!delivery) {
            return res.status(404).json({ message: "Delivery not found" })
        }

        if (delivery.status !== "PENDING") {
            return res.status(400).json({ message: "Delivery is already assigned or completed" })
        }

        // Find the nearest available delivery person
        const nearestDeliveryPerson = await exports.findNearestDeliveryPerson(delivery.pickup_location)

        if (!nearestDeliveryPerson) {
            return res.status(404).json({ message: "No available delivery persons found" })
        }

        // Assign the delivery
        delivery.delivery_person_id = nearestDeliveryPerson._id
        delivery.delivery_person_name = nearestDeliveryPerson.name
        delivery.status = "ASSIGNED"
        delivery.assigned_at = new Date()

        const updatedDelivery = await delivery.save()

        // Notify the delivery person (would be implemented in a real system)
        // For example, send a push notification or email

        if (next) {
            // If called as middleware, continue
            return next()
        }

        res.status(200).json(updatedDelivery)
    } catch (error) {
        console.error("Error auto-assigning delivery:", error)
        if (next) {
            return next(error)
        }
        res.status(500).json({ message: "Error auto-assigning delivery", error: error.message })
    }
}

// Add a new route to get orders ready for pickup
exports.getOrdersReadyForPickup = async (req, res) => {
    try {
        // Query the order service for orders that are ready for pickup
        const response = await axios.get("http://localhost:5002/api/orders/ready-for-pickup", {
            headers: {
                Cookie: req.headers.cookie, // Forward auth cookie
            },
        })

        res.status(200).json(response.data)
    } catch (error) {
        console.error("Error fetching orders ready for pickup:", error)
        res.status(500).json({ message: "Error fetching orders ready for pickup", error: error.message })
    }
}
