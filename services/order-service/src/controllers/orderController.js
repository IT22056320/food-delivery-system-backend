const Order = require("../models/Order");
const axios = require("axios");

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const {
      restaurant_id,
      items,
      total_price,
      delivery_address,
      delivery_location,
      payment_method,
      extra_notes,
    } = req.body;

    // Validate required fields
    if (
      !restaurant_id ||
      !items ||
      !total_price ||
      !delivery_address ||
      !payment_method
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate delivery location
    if (
      !delivery_location ||
      !delivery_location.coordinates ||
      !delivery_location.coordinates.lat ||
      !delivery_location.coordinates.lng
    ) {
      return res
        .status(400)
        .json({ error: "Valid delivery location coordinates are required" });
    }

    // Create new order
    const newOrder = new Order({
      customer_id: req.user.id,
      restaurant_id,
      items,
      total_price,
      delivery_address,
      delivery_coordinates: {
        lat: delivery_location.coordinates.lat,
        lng: delivery_location.coordinates.lng,
      },
      delivery_location: {
        type: "Point",
        coordinates: [
          delivery_location.coordinates.lng,
          delivery_location.coordinates.lat,
        ], // GeoJSON format: [longitude, latitude]
      },
      payment_method,
      payment_status: "PENDING",
      extra_notes: extra_notes || [],
    });

    const savedOrder = await newOrder.save();

    // If payment method is card, create a payment intent
    if (payment_method === "CARD") {
      try {
        // Call the payment service to create a payment intent
        const paymentResponse = await axios.post(
          "http://localhost:5004/api/payments/create-payment-intent",
          {
            amount: total_price,
            order_id: savedOrder._id,
            metadata: {
              customer_id: req.user.id,
              restaurant_id,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.cookie, // Forward the auth cookie
            },
          }
        );

        // Return the order with client secret
        return res.status(201).json({
          order: savedOrder,
          clientSecret: paymentResponse.data.clientSecret,
          paymentIntentId: paymentResponse.data.paymentIntentId,
        });
      } catch (paymentError) {
        console.error("Payment service error:", paymentError.message);
        // If payment service fails, still return the order but with an error
        return res.status(201).json({
          order: savedOrder,
          paymentError: "Failed to create payment intent. Please try again.",
        });
      }
    }

    // For cash on delivery, just return the order
    return res.status(201).json({ order: savedOrder });
  } catch (error) {
    console.error("Order creation error:", error);
    res.status(500).json({ error: error.message || "Error creating order" });
  }
};

// Update order payment status
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus, paymentId, paymentIntentId } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.payment_status = paymentStatus;
    order.stripe_payment_id = paymentIntentId;

    // If payment is completed and it was pending before, update order status
    if (paymentStatus === "COMPLETED" && order.order_status === "PENDING") {
      order.order_status = "CONFIRMED";
    }

    await order.save();

    // If payment is completed, create delivery record
    if (paymentStatus === "COMPLETED") {
      try {
        // Get restaurant details
        const restaurantRes = await axios.get(
          `http://localhost:5001/api/restaurants/${order.restaurant_id}`
        );
        const restaurant = restaurantRes.data;

        // Create delivery record
        await axios.post(
          "http://localhost:5003/api/deliveries",
          {
            order_id: order._id,
            pickup_location: {
              address: restaurant.address,
              coordinates: restaurant.location?.coordinates || {
                lat: 0,
                lng: 0,
              },
            },
            delivery_location: {
              address: order.delivery_address,
              coordinates: order.delivery_coordinates,
            },
            customer_contact: {
              name: req.user?.name || "Customer",
              phone: req.user?.phone || "Unknown",
            },
            restaurant_contact: {
              name: restaurant.name,
              phone: restaurant.phone || "Unknown",
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.cookie, // Forward the auth cookie
            },
          }
        );
      } catch (deliveryError) {
        console.error("Error creating delivery record:", deliveryError.message);
        // Continue execution even if delivery creation fails
      }
    }

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res
      .status(500)
      .json({ error: error.message || "Error updating payment status" });
  }
};

// Process refund for an order
exports.processRefund = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { refundId, refundAmount } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.payment_status = "REFUNDED";
    order.order_status = "REFUNDED";
    order.refund_id = refundId;

    await order.save();

    res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Error processing refund:", error);
    res.status(500).json({ error: error.message || "Error processing refund" });
  }
};

// Get all orders for the current user
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer_id: req.user.id }).sort({
      createdAt: -1,
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ error: error.message || "Error fetching orders" });
  }
};

// Get order by ID
exports.getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Check if user is authorized to view this order
    if (
      req.user.role !== "admin" &&
      req.user.role !== "restaurant_owner" &&
      order.customer_id !== req.user.id
    ) {
      return res
        .status(403)
        .json({ error: "Not authorized to view this order" });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    res.status(500).json({ error: error.message || "Error fetching order" });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Validate status transition
    const validTransitions = {
      PENDING: ["CONFIRMED", "CANCELLED"],
      CONFIRMED: ["PREPARING", "CANCELLED"],
      PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
      READY_FOR_PICKUP: ["OUT_FOR_DELIVERY", "CANCELLED"],
      OUT_FOR_DELIVERY: ["DELIVERED", "CANCELLED"],
      DELIVERED: ["REFUNDED"],
      CANCELLED: [],
      REFUNDED: [],
    };

    if (!validTransitions[order.order_status].includes(status)) {
      return res.status(400).json({
        error: `Invalid status transition from ${order.order_status} to ${status}`,
      });
    }

    order.order_status = status;

    // Update timestamps based on status
    if (status === "OUT_FOR_DELIVERY") {
      order.out_delivery_time = new Date();
    } else if (status === "DELIVERED") {
      order.delivery_time = new Date();
    }

    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({ error: error.message || "Error updating order status" });
  }
};

// Get orders for a restaurant
exports.getRestaurantOrders = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const orders = await Order.find({ restaurant_id: restaurantId }).sort({
      createdAt: -1,
    });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching restaurant orders:", error);
    res.status(500).json({ error: error.message || "Error fetching orders" });
  }
};

// Get all orders (admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json(orders);
  } catch (error) {
    console.error("Error fetching all orders:", error);
    res.status(500).json({ error: error.message || "Error fetching orders" });
  }
};
