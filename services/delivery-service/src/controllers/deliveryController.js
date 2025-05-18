const Delivery = require("../models/Delivery");
const axios = require("axios");

// Create a new delivery
exports.createDelivery = async (req, res) => {
  try {
    const {
      order_id,
      pickup_location,
      delivery_location,
      customer_contact,
      restaurant_contact,
      order,
    } = req.body;

    console.log("Creating delivery with data:", {
      order_id,
      pickup_location,
      delivery_location,
      customer_contact,
      restaurant_contact,
      order,
    });

    // Validate required fields
    if (!order_id || !pickup_location || !delivery_location || !order) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Ensure coordinates are properly formatted
    const pickupLat = Number(pickup_location.coordinates?.lat) || 0;
    const pickupLng = Number(pickup_location.coordinates?.lng) || 0;
    const deliveryLat = Number(delivery_location.coordinates?.lat) || 0;
    const deliveryLng = Number(delivery_location.coordinates?.lng) || 0;

    // Validate coordinates
    if (pickupLat === 0 && pickupLng === 0) {
      console.error("Invalid pickup coordinates:", pickup_location.coordinates);
    }

    if (deliveryLat === 0 && deliveryLng === 0) {
      console.error(
        "Invalid delivery coordinates:",
        delivery_location.coordinates
      );
      // Use the coordinates from the delivery_location.address if available
      // This would require geocoding in a real app
    }

    // Check if a delivery already exists for this order
    const existingDelivery = await Delivery.findOne({ order_id });
    if (existingDelivery) {
      return res.status(409).json({
        message: "A delivery already exists for this order",
        delivery: existingDelivery,
      });
    }

    // Try to fetch complete order details from the order service
    let orderDetails = order;
    try {
      const orderResponse = await axios.get(
        `http://localhost:5002/api/orders/${order_id}`,
        {
          headers: {
            Cookie: req.headers.cookie, // Forward auth cookie
          },
        }
      );

      if (orderResponse.data) {
        orderDetails = {
          total_price: orderResponse.data.total_price || order.total_price || 0,
          items: orderResponse.data.items?.length || order.items || 0,
          subtotal: orderResponse.data.subtotal || 0,
          tax_amount: orderResponse.data.tax_amount || 0,
        };
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      // Continue with the provided order details
    }

    // Create new delivery with validated coordinates and order details
    const newDelivery = new Delivery({
      order_id,
      pickup_location: {
        address: pickup_location.address || "Restaurant Address",
        coordinates: {
          lat: pickupLat,
          lng: pickupLng,
        },
      },
      delivery_location: {
        address: delivery_location.address || "Delivery Address",
        coordinates: {
          lat: deliveryLat,
          lng: deliveryLng,
        },
      },
      customer_contact: customer_contact || {
        name: "Customer",
        phone: "Not available",
      },
      restaurant_contact: restaurant_contact || {
        name: "Restaurant",
        phone: "Not available",
      },
      order: orderDetails,
      status: "PENDING",
      estimated_delivery_time: new Date(Date.now() + 45 * 60000), // Default 45 minutes from now
    });

    console.log("Saving delivery with coordinates and order details:", {
      pickup: newDelivery.pickup_location.coordinates,
      delivery: newDelivery.delivery_location.coordinates,
      order: newDelivery.order,
    });

    const savedDelivery = await newDelivery.save();

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
        }
      );
    } catch (error) {
      console.error("Error updating order with delivery ID:", error);
      // Continue even if order update fails
    }

    // Automatically try to assign a delivery person
    this.autoAssignDelivery(
      req,
      { params: { id: savedDelivery._id } },
      (err, result) => {
        if (err) {
          console.error("Error auto-assigning delivery:", err);
        }
      }
    );

    res.status(201).json(savedDelivery);
  } catch (error) {
    console.error("Error creating delivery:", error);
    res
      .status(500)
      .json({ message: "Error creating delivery", error: error.message });
  }
};

// Find nearest available delivery person
exports.findNearestDeliveryPerson = async (restaurantLocation) => {
  try {
    // In a real system, you would query your database for available delivery persons
    // and calculate distances to find the nearest one

    // For this implementation, we'll query the auth service to find delivery persons
    const response = await axios.get(
      "http://localhost:5000/api/users/delivery-persons",
      {
        params: {
          status: "available",
          lat: restaurantLocation.coordinates.lat,
          lng: restaurantLocation.coordinates.lng,
          maxDistance: 10000, // 10km radius
        },
      }
    );

    if (response.data && response.data.length > 0) {
      // Sort by distance and return the nearest one
      return response.data[0];
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
    };
  } catch (error) {
    console.error("Error finding nearest delivery person:", error);
    return null;
  }
};

// Get all deliveries
exports.getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await Delivery.find().sort({ createdAt: -1 });
    res.status(200).json(deliveries);
  } catch (error) {
    console.error("Error fetching deliveries:", error);
    res
      .status(500)
      .json({ message: "Error fetching deliveries", error: error.message });
  }
};

// Get delivery by ID
exports.getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // If order details are missing or incomplete, try to fetch them
    if (
      !delivery.order ||
      !delivery.order.total_price ||
      delivery.order.total_price === 0
    ) {
      try {
        const orderResponse = await axios.get(
          `http://localhost:5002/api/orders/${delivery.order_id}`,
          {
            headers: {
              Cookie: req.headers.cookie, // Forward auth cookie
            },
          }
        );

        if (orderResponse.data) {
          delivery.order = {
            total_price: orderResponse.data.total_price || 0,
            items: orderResponse.data.items?.length || 0,
            subtotal: orderResponse.data.subtotal || 0,
            tax_amount: orderResponse.data.tax_amount || 0,
          };

          // Save the updated delivery with order details
          await delivery.save();
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        // Continue with the existing delivery
      }
    }

    res.status(200).json(delivery);
  } catch (error) {
    console.error("Error fetching delivery:", error);
    res
      .status(500)
      .json({ message: "Error fetching delivery", error: error.message });
  }
};

// Update the getDeliveryByOrderId function to properly handle errors
exports.getDeliveryByOrderId = async (req, res) => {
  try {
    const delivery = await Delivery.findOne({ order_id: req.params.orderId });

    if (!delivery) {
      return res
        .status(404)
        .json({ message: "Delivery not found for this order" });
    }

    // If order details are missing or incomplete, try to fetch them
    if (
      !delivery.order ||
      !delivery.order.total_price ||
      delivery.order.total_price === 0
    ) {
      try {
        const orderResponse = await axios.get(
          `http://localhost:5002/api/orders/${delivery.order_id}`,
          {
            headers: {
              Cookie: req.headers.cookie, // Forward auth cookie
            },
          }
        );

        if (orderResponse.data) {
          delivery.order = {
            total_price: orderResponse.data.total_price || 0,
            items: orderResponse.data.items?.length || 0,
            subtotal: orderResponse.data.subtotal || 0,
            tax_amount: orderResponse.data.tax_amount || 0,
          };

          // Save the updated delivery with order details
          await delivery.save();
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        // Continue with the existing delivery
      }
    }

    res.status(200).json(delivery);
  } catch (error) {
    console.error("Error fetching delivery by order ID:", error);
    res
      .status(500)
      .json({ message: "Error fetching delivery", error: error.message });
  }
};

// Update the updateDeliveryStatus function to properly handle delivery completion
exports.updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Update status and timestamp based on the new status
    delivery.status = status;

    if (status === "ASSIGNED" && !delivery.assigned_at) {
      delivery.assigned_at = new Date();
    } else if (status === "PICKED_UP") {
      delivery.picked_up_at = new Date();
    } else if (status === "DELIVERED") {
      delivery.delivered_at = new Date();

      // If order details are missing or incomplete, try to fetch them before completing
      if (
        !delivery.order ||
        !delivery.order.total_price ||
        delivery.order.total_price === 0
      ) {
        try {
          console.log(
            `Fetching order details for delivery ${id} before completion`
          );
          const orderResponse = await axios.get(
            `http://localhost:5002/api/orders/${delivery.order_id}`,
            {
              headers: {
                Cookie: req.headers.cookie, // Forward auth cookie
              },
            }
          );

          if (orderResponse.data) {
            delivery.order = {
              total_price: orderResponse.data.total_price || 0,
              items: orderResponse.data.items?.length || 0,
              subtotal: orderResponse.data.subtotal || 0,
              tax_amount: orderResponse.data.tax_amount || 0,
            };
            console.log(
              `Updated delivery ${id} with order details:`,
              delivery.order
            );
          }
        } catch (error) {
          console.error(
            `Failed to fetch order details for delivery ${id}:`,
            error
          );
          // Continue with the existing delivery
        }
      }
    } else if (status === "CANCELLED") {
      delivery.cancelled_at = new Date();
    }

    const updatedDelivery = await delivery.save();
    console.log(`Delivery ${id} status updated to ${status}:`, updatedDelivery);

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
        }
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      // Continue even if order update fails
    }

    res.status(200).json(updatedDelivery);
  } catch (error) {
    console.error("Error updating delivery status:", error);
    res.status(500).json({
      message: "Error updating delivery status",
      error: error.message,
    });
  }
};

// Update the updateDeliveryLocation function to calculate ETA
exports.updateDeliveryLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;

    if (!lat || !lng) {
      return res
        .status(400)
        .json({ message: "Latitude and longitude are required" });
    }

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Update current location
    delivery.current_location = {
      lat,
      lng,
      updated_at: new Date(),
    };

    // If delivery is in progress, update estimated delivery time
    if (delivery.status === "PICKED_UP" || delivery.status === "IN_TRANSIT") {
      // Calculate ETA based on distance to delivery location
      const deliveryLat = delivery.delivery_location.coordinates.lat;
      const deliveryLng = delivery.delivery_location.coordinates.lng;

      // Simple distance-based ETA calculation (would use Google Distance Matrix API in production)
      const distance = calculateDistance(
        { lat, lng },
        { lat: deliveryLat, lng: deliveryLng }
      );

      // Assume average speed of 30 km/h
      const timeInMinutes = Math.round((distance / 30) * 60);

      // Set ETA to current time + calculated time
      delivery.estimated_delivery_time = new Date(
        Date.now() + timeInMinutes * 60000
      );
      delivery.status = "IN_TRANSIT"; // Ensure status is IN_TRANSIT once we're moving
    }

    const updatedDelivery = await delivery.save();

    res.status(200).json(updatedDelivery);
  } catch (error) {
    console.error("Error updating delivery location:", error);
    res.status(500).json({
      message: "Error updating delivery location",
      error: error.message,
    });
  }
};

// Get delivery person's current location
exports.getDeliveryLocation = async (req, res) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Calculate estimated arrival time based on current location
    let estimatedArrivalTime = "Unknown";

    if (
      delivery.current_location &&
      delivery.current_location.lat &&
      delivery.current_location.lng
    ) {
      // In a real system, you would use the Distance Matrix API to calculate the ETA
      // For demo purposes, we'll just use the stored estimated_delivery_time
      if (delivery.estimated_delivery_time) {
        const now = new Date();
        const eta = new Date(delivery.estimated_delivery_time);
        const minutesDiff = Math.round((eta - now) / 60000);

        if (minutesDiff > 0) {
          estimatedArrivalTime = `${minutesDiff} minutes`;
        } else {
          estimatedArrivalTime = "Arriving now";
        }
      }
    }

    res.status(200).json({
      currentLocation: delivery.current_location,
      status: delivery.status,
      estimatedArrivalTime,
    });
  } catch (error) {
    console.error("Error fetching delivery location:", error);
    res.status(500).json({
      message: "Error fetching delivery location",
      error: error.message,
    });
  }
};

// Assign delivery to a delivery person
exports.assignDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_person_id, delivery_person_name, accept, order_details } =
      req.body;

    console.log("Assign delivery request:", {
      id,
      body: req.body,
      user: req.user,
    });

    // If this is a response to an assignment (accept/reject)
    if (typeof accept === "boolean") {
      const delivery = await Delivery.findById(id);

      if (!delivery) {
        return res.status(404).json({ message: "Delivery not found" });
      }

      if (accept) {
        // Delivery person accepts the assignment
        delivery.status = "ASSIGNED";
        delivery.assigned_at = new Date();

        // In a real app, you would get these from the authenticated user
        delivery.delivery_person_id = req.user.id;
        delivery.delivery_person_name = req.user.name;

        const updatedDelivery = await delivery.save();
        return res.status(200).json(updatedDelivery);
      } else {
        // Delivery person rejects the assignment
        // In a real app, you might want to track rejections and find another delivery person
        return res
          .status(200)
          .json({ message: "Delivery assignment rejected" });
      }
    }

    // Get the delivery
    const delivery = await Delivery.findById(id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    // Check if we have the authenticated user
    if (req.user && req.user.id) {
      // If we have an authenticated user, use their ID and name
      delivery.delivery_person_id = req.user.id;
      delivery.delivery_person_name = delivery_person_name || req.user.name;
    } else if (delivery_person_id && delivery_person_name) {
      // If both ID and name are provided in the request
      delivery.delivery_person_id = delivery_person_id;
      delivery.delivery_person_name = delivery_person_name;
    } else if (delivery_person_name) {
      // If only name is provided, try to find the user by name
      try {
        // In a real app, you would query your user database to find the user by name
        // For now, we'll just use the name as the ID
        delivery.delivery_person_id = delivery_person_name
          .toLowerCase()
          .replace(/\s+/g, "_");
        delivery.delivery_person_name = delivery_person_name;
      } catch (error) {
        console.error("Error finding delivery person by name:", error);
        return res.status(400).json({
          message: "Could not find delivery person with the provided name",
        });
      }
    } else {
      return res
        .status(400)
        .json({ message: "Delivery person ID and name are required" });
    }

    // Update order details if provided
    if (order_details && (order_details.total_price || order_details.items)) {
      delivery.order = {
        ...delivery.order,
        total_price:
          order_details.total_price || delivery.order.total_price || 0,
        items: order_details.items || delivery.order.items || 0,
      };
    }

    // If order details are still missing or incomplete, try to fetch them
    if (
      !delivery.order ||
      !delivery.order.total_price ||
      delivery.order.total_price === 0
    ) {
      try {
        const orderResponse = await axios.get(
          `http://localhost:5002/api/orders/${delivery.order_id}`,
          {
            headers: {
              Cookie: req.headers.cookie, // Forward auth cookie
            },
          }
        );

        if (orderResponse.data) {
          delivery.order = {
            total_price:
              orderResponse.data.total_price || delivery.order.total_price || 0,
            items:
              orderResponse.data.items?.length || delivery.order.items || 0,
            subtotal: orderResponse.data.subtotal || 0,
            tax_amount: orderResponse.data.tax_amount || 0,
          };
        }
      } catch (error) {
        console.error("Error fetching order details:", error);
        // Continue with the existing delivery
      }
    }

    delivery.status = "ASSIGNED";
    delivery.assigned_at = new Date();

    const updatedDelivery = await delivery.save();

    // Update the order status to IN_PROGRESS
    try {
      await axios.put(
        `http://localhost:5002/api/orders/${delivery.order_id}/status`,
        {
          status: "OUT_FOR_DELIVERY",
        },
        {
          headers: {
            Cookie: req.headers.cookie, // Forward auth cookie
          },
        }
      );
    } catch (error) {
      console.error("Error updating order status:", error);
      // Continue even if order update fails
    }

    res.status(200).json(updatedDelivery);
  } catch (error) {
    console.error("Error assigning delivery:", error);
    res
      .status(500)
      .json({ message: "Error assigning delivery", error: error.message });
  }
};

// Get deliveries for a specific delivery person
exports.getDeliveriesForDeliveryPerson = async (req, res) => {
  try {
    const { delivery_person_id } = req.params;

    const deliveries = await Delivery.find({
      delivery_person_id,
      status: { $nin: ["DELIVERED", "CANCELLED"] },
    }).sort({ createdAt: -1 });

    // Enhance deliveries with complete order details if needed
    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        // If order details are missing or incomplete, fetch them
        if (
          !delivery.order ||
          !delivery.order.total_price ||
          delivery.order.total_price === 0
        ) {
          try {
            const orderResponse = await axios.get(
              `http://localhost:5002/api/orders/${delivery.order_id}`,
              {
                headers: {
                  Cookie: req.headers.cookie, // Forward auth cookie
                },
              }
            );

            if (orderResponse.data) {
              delivery.order = {
                total_price: orderResponse.data.total_price || 0,
                items: orderResponse.data.items?.length || 0,
                subtotal: orderResponse.data.subtotal || 0,
                tax_amount: orderResponse.data.tax_amount || 0,
              };

              // Save the updated delivery with order details
              await delivery.save();
            }
          } catch (error) {
            console.error(
              `Failed to fetch order details for delivery ${delivery._id}:`,
              error
            );
          }
        }
        return delivery;
      })
    );

    res.status(200).json(enhancedDeliveries);
  } catch (error) {
    console.error("Error fetching deliveries for delivery person:", error);
    res
      .status(500)
      .json({ message: "Error fetching deliveries", error: error.message });
  }
};

// Update the getDeliveryHistoryForDeliveryPerson function to better handle errors and log data
exports.getDeliveryHistoryForDeliveryPerson = async (req, res) => {
  try {
    const { delivery_person_id } = req.params;
    console.log(
      `Fetching delivery history for delivery person ${delivery_person_id}`
    );

    const deliveries = await Delivery.find({
      delivery_person_id,
      status: { $in: ["DELIVERED", "CANCELLED"] },
    }).sort({ createdAt: -1 });

    console.log(
      `Found ${deliveries.length} deliveries in history for ${delivery_person_id}`
    );

    // Enhance deliveries with complete order details if needed
    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        // If order details are missing or incomplete, fetch them
        if (
          !delivery.order ||
          !delivery.order.total_price ||
          delivery.order.total_price === 0
        ) {
          try {
            console.log(
              `Fetching order details for delivery ${delivery._id}, order_id: ${delivery.order_id}`
            );
            const orderResponse = await axios.get(
              `http://localhost:5002/api/orders/${delivery.order_id}`,
              {
                headers: {
                  Cookie: req.headers.cookie, // Forward auth cookie
                },
              }
            );

            if (orderResponse.data) {
              delivery.order = {
                total_price: orderResponse.data.total_price || 0,
                items: orderResponse.data.items?.length || 0,
                subtotal: orderResponse.data.subtotal || 0,
                tax_amount: orderResponse.data.tax_amount || 0,
              };

              console.log(
                `Updated delivery ${delivery._id} with order details:`,
                delivery.order
              );

              // Save the updated delivery with order details
              await delivery.save();
            }
          } catch (error) {
            console.error(
              `Failed to fetch order details for delivery ${delivery._id}:`,
              error
            );
          }
        }
        return delivery;
      })
    );

    console.log(`Returning ${enhancedDeliveries.length} enhanced deliveries`);
    res.status(200).json(enhancedDeliveries);
  } catch (error) {
    console.error("Error fetching delivery history:", error);
    res.status(500).json({
      message: "Error fetching delivery history",
      error: error.message,
    });
  }
};

// Get earnings statistics for a specific delivery person
exports.getEarningsStats = async (req, res) => {
  try {
    const { delivery_person_id } = req.params;
    const { timeFilter } = req.query;

    // Get delivery history
    const deliveries = await Delivery.find({
      delivery_person_id,
      status: "DELIVERED",
    }).sort({ delivered_at: -1 });

    // Enhance deliveries with complete order details if needed
    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        // If order details are missing or incomplete, fetch them
        if (
          !delivery.order ||
          !delivery.order.total_price ||
          delivery.order.total_price === 0
        ) {
          try {
            const orderResponse = await axios.get(
              `http://localhost:5002/api/orders/${delivery.order_id}`,
              {
                headers: {
                  Cookie: req.headers.cookie, // Forward auth cookie
                },
              }
            );

            if (orderResponse.data) {
              delivery.order = {
                total_price: orderResponse.data.total_price || 0,
                items: orderResponse.data.items?.length || 0,
                subtotal: orderResponse.data.subtotal || 0,
                tax_amount: orderResponse.data.tax_amount || 0,
              };

              // Save the updated delivery with order details
              await delivery.save();
            }
          } catch (error) {
            console.error(
              `Failed to fetch order details for delivery ${delivery._id}:`,
              error
            );
          }
        }
        return delivery;
      })
    );

    // Calculate earnings from delivery history
    const earningsHistory = enhancedDeliveries.map((delivery) => {
      // Calculate earnings (80% of delivery fee, which is 10% of order total)
      const deliveryFee = delivery.order?.total_price * 0.1 || 0;
      const earnings = deliveryFee * 0.8;

      return {
        ...delivery.toObject(),
        earnings: earnings,
        date: delivery.delivered_at || delivery.createdAt,
      };
    });

    // Filter by time if specified
    let filteredEarnings = [...earningsHistory];

    if (timeFilter) {
      const now = new Date();

      if (timeFilter === "today") {
        const today = now.toDateString();
        filteredEarnings = earningsHistory.filter(
          (delivery) => new Date(delivery.date).toDateString() === today
        );
      } else if (timeFilter === "week") {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        filteredEarnings = earningsHistory.filter(
          (delivery) => new Date(delivery.date) >= weekStart
        );
      } else if (timeFilter === "month") {
        const monthStart = new Date(now);
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);

        filteredEarnings = earningsHistory.filter(
          (delivery) => new Date(delivery.date) >= monthStart
        );
      } else if (timeFilter === "year") {
        const yearStart = new Date(now);
        yearStart.setMonth(0, 1);
        yearStart.setHours(0, 0, 0, 0);

        filteredEarnings = earningsHistory.filter(
          (delivery) => new Date(delivery.date) >= yearStart
        );
      }
    }

    // Calculate total earnings
    const totalEarnings = filteredEarnings.reduce(
      (sum, delivery) => sum + delivery.earnings,
      0
    );

    // Calculate today's earnings
    const today = new Date().toDateString();
    const todayEarnings = earningsHistory
      .filter((delivery) => new Date(delivery.date).toDateString() === today)
      .reduce((sum, delivery) => sum + delivery.earnings, 0);

    // Calculate this week's earnings
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEarnings = earningsHistory
      .filter((delivery) => new Date(delivery.date) >= weekStart)
      .reduce((sum, delivery) => sum + delivery.earnings, 0);

    // Calculate this month's earnings
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthEarnings = earningsHistory
      .filter((delivery) => new Date(delivery.date) >= monthStart)
      .reduce((sum, delivery) => sum + delivery.earnings, 0);

    res.status(200).json({
      total: totalEarnings,
      today: todayEarnings,
      thisWeek: weekEarnings,
      thisMonth: monthEarnings,
      history: filteredEarnings,
    });
  } catch (error) {
    console.error("Error fetching earnings stats:", error);
    res.status(500).json({
      message: "Error fetching earnings statistics",
      error: error.message,
    });
  }
};

// Get available deliveries for assignment
exports.getAvailableDeliveries = async (req, res) => {
  try {
    // Find deliveries that are pending assignment
    const deliveries = await Delivery.find({
      status: "PENDING",
    }).sort({ createdAt: -1 });

    // Enhance deliveries with complete order details if needed
    const enhancedDeliveries = await Promise.all(
      deliveries.map(async (delivery) => {
        // If order details are missing or incomplete, fetch them
        if (
          !delivery.order ||
          !delivery.order.total_price ||
          delivery.order.total_price === 0
        ) {
          try {
            const orderResponse = await axios.get(
              `http://localhost:5002/api/orders/${delivery.order_id}`,
              {
                headers: {
                  Cookie: req.headers.cookie, // Forward auth cookie
                },
              }
            );

            if (orderResponse.data) {
              delivery.order = {
                total_price: orderResponse.data.total_price || 0,
                items: orderResponse.data.items?.length || 0,
                subtotal: orderResponse.data.subtotal || 0,
                tax_amount: orderResponse.data.tax_amount || 0,
              };

              // Save the updated delivery with order details
              await delivery.save();
            }
          } catch (error) {
            console.error(
              `Failed to fetch order details for delivery ${delivery._id}:`,
              error
            );
          }
        }
        return delivery;
      })
    );

    res.status(200).json(enhancedDeliveries);
  } catch (error) {
    console.error("Error fetching available deliveries:", error);
    res.status(500).json({
      message: "Error fetching available deliveries",
      error: error.message,
    });
  }
};

// Auto-assign delivery to nearest delivery person
exports.autoAssignDelivery = async (req, res, next) => {
  try {
    const { id } = req.params;

    const delivery = await Delivery.findById(id);

    if (!delivery) {
      return res.status(404).json({ message: "Delivery not found" });
    }

    if (delivery.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "Delivery is already assigned or completed" });
    }

    // Find the nearest available delivery person
    const nearestDeliveryPerson = await exports.findNearestDeliveryPerson(
      delivery.pickup_location
    );

    if (!nearestDeliveryPerson) {
      return res
        .status(404)
        .json({ message: "No available delivery persons found" });
    }

    // Assign the delivery
    delivery.delivery_person_id = nearestDeliveryPerson._id;
    delivery.delivery_person_name = nearestDeliveryPerson.name;
    delivery.status = "ASSIGNED";
    delivery.assigned_at = new Date();

    const updatedDelivery = await delivery.save();

    // Notify the delivery person (would be implemented in a real system)
    // For example, send a push notification or email

    if (next) {
      // If called as middleware, continue
      return next();
    }

    res.status(200).json(updatedDelivery);
  } catch (error) {
    console.error("Error auto-assigning delivery:", error);
    if (next) {
      return next(error);
    }
    res
      .status(500)
      .json({ message: "Error auto-assigning delivery", error: error.message });
  }
};

// Add a new route to get orders ready for pickup
exports.getOrdersReadyForPickup = async (req, res) => {
  try {
    // Query the order service for orders that are ready for pickup
    const response = await axios.get(
      "http://localhost:5002/api/orders/ready-for-pickup",
      {
        headers: {
          Cookie: req.headers.cookie, // Forward auth cookie
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    console.error("Error fetching orders ready for pickup:", error);
    res.status(500).json({
      message: "Error fetching orders ready for pickup",
      error: error.message,
    });
  }
};

// Add a helper function to calculate distance between two points
function calculateDistance(point1, point2) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(point2.lat - point1.lat);
  const dLng = deg2rad(point2.lng - point1.lng);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(point1.lat)) *
      Math.cos(deg2rad(point2.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
