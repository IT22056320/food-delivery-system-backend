const Order = require("../models/Order")
const axios = require("axios")

// Initialize Stripe with proper error handling
let stripe
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not defined in environment variables")
    // Provide a fallback or throw a more descriptive error
  } else {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error.message)
}

// Create a new order
exports.createOrder = async (req, res) => {
  const customer_id = req.user.id
  console.log("Customer ID:", customer_id, req.user.id)
  const {
    restaurant_id,
    items,
    total_price,
    extra_notes,
    delivery_address,
    delivery_location,
    order_status,
    payment_status,
    payment_method,
    stripe_payment_id,
    order_processing_time,
    out_delivery_time,
  } = req.body

  console.log("Incoming request body:", req.body) // Log the request body

  if (!customer_id || !restaurant_id || !items || !total_price || !delivery_address) {
    return res.status(400).json({ message: "All fields are required" })
  }

  try {
    // Extract coordinates from the request
    let lat, lng

    if (delivery_location && delivery_location.coordinates) {
      lat = Number(delivery_location.coordinates.lat)
      lng = Number(delivery_location.coordinates.lng)
    } else {
      return res.status(400).json({ message: "Delivery coordinates are required" })
    }

    // Create a new order with properly formatted GeoJSON
    const newOrder = new Order({
      customer_id,
      restaurant_id,
      items,
      total_price,
      extra_notes,
      delivery_address,
      // Store standard coordinates for easy access
      delivery_coordinates: {
        lat: lat,
        lng: lng,
      },
      // Create proper GeoJSON Point object directly at the top level
      delivery_location: {
        type: "Point",
        coordinates: [lng, lat], // GeoJSON format: [longitude, latitude]
      },
      order_status,
      payment_status,
      payment_method,
      stripe_payment_id,
      order_processing_time,
      out_delivery_time,
    })

    console.log("New order object:", newOrder) // Log the new order object

    const savedOrder = await newOrder.save()

    console.log("Saved order:", savedOrder) // Log the saved order

    // If payment method is card, create a payment intent
    if (payment_method === "CARD" && !stripe_payment_id) {
      try {
        // Check if Stripe is properly initialized
        if (!stripe) {
          throw new Error("Stripe is not properly initialized. Please check your API key.")
        }

        // Create a payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(total_price * 100), // Stripe requires amount in cents
          currency: "usd",
          metadata: {
            orderId: savedOrder._id.toString(),
            customerId: customer_id,
          },
          automatic_payment_methods: {
            enabled: true,
          },
        })

        // Update the order with the payment intent ID
        savedOrder.stripe_payment_id = paymentIntent.id
        await savedOrder.save()

        // Return the order with client secret for frontend processing
        return res.status(201).json({
          order: savedOrder,
          clientSecret: paymentIntent.client_secret,
        })
      } catch (stripeError) {
        console.error("Stripe error:", stripeError)
        // If Stripe fails, still return the order but with an error flag
        return res.status(201).json({
          order: savedOrder,
          paymentError: "Failed to create payment intent. Please try again.",
          stripeErrorMessage: stripeError.message,
        })
      }
    }

    // Improve the delivery creation process with better error handling and logging
    // Create delivery record in delivery service
    try {
      // Get restaurant details
      const restaurantRes = await axios.get(`http://localhost:5001/api/restaurants/${restaurant_id}`)
      const restaurant = restaurantRes.data

      // Make sure we have valid restaurant data
      if (!restaurant || !restaurant.address) {
        console.error("Invalid restaurant data:", restaurant)
        throw new Error("Invalid restaurant data")
      }

      // Extract restaurant coordinates properly
      let restaurantLat = 0,
        restaurantLng = 0
      if (restaurant.location && restaurant.location.coordinates) {
        // Check if it's GeoJSON format [lng, lat] or standard {lat, lng}
        if (Array.isArray(restaurant.location.coordinates)) {
          restaurantLng = restaurant.location.coordinates[0]
          restaurantLat = restaurant.location.coordinates[1]
        } else {
          restaurantLat = restaurant.location.coordinates.lat || 0
          restaurantLng = restaurant.location.coordinates.lng || 0
        }
      }

      console.log("Creating delivery record for order:", savedOrder._id)
      console.log("Restaurant details:", restaurant.name, restaurant.address)
      console.log("Restaurant coordinates:", restaurantLat, restaurantLng)
      console.log("Delivery address:", delivery_address)
      console.log("Delivery coordinates:", lat, lng)

      // Create delivery record with more detailed error handling
      try {
        const deliveryResponse = await axios.post(
          "http://localhost:5003/api/deliveries",
          {
            order_id: savedOrder._id.toString(), // Ensure it's a string
            pickup_location: {
              address: restaurant.address,
              coordinates: {
                lat: restaurantLat,
                lng: restaurantLng,
              },
            },
            delivery_location: {
              address: delivery_address,
              coordinates: {
                lat: lat,
                lng: lng,
              },
            },
            customer_contact: {
              name: req.user.name || "Customer",
              phone: req.user.phone || "Unknown",
            },
            restaurant_contact: {
              name: restaurant.name,
              phone: restaurant.phone || "Unknown",
            },
            order: {
              total_price: total_price,
              items: items.length,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
              Cookie: req.headers.cookie, // Forward auth cookie
            },
          },
        )
        console.log("Delivery record created successfully:", deliveryResponse.data)

        // Update the order with the delivery ID
        savedOrder.delivery_id = deliveryResponse.data._id
        await savedOrder.save()
      } catch (axiosError) {
        console.error("Axios error creating delivery:", axiosError.message)
        if (axiosError.response) {
          console.error("Response data:", axiosError.response.data)
          console.error("Response status:", axiosError.response.status)
          console.error("Response headers:", axiosError.response.headers)
        } else if (axiosError.request) {
          console.error("No response received:", axiosError.request)
        } else {
          console.error("Error setting up request:", axiosError.message)
        }
      }
    } catch (deliveryError) {
      console.error("Error in delivery creation process:", deliveryError.message)
      // Continue execution even if delivery creation fails
    }

    return res.status(201).json(savedOrder)
  } catch (error) {
    console.error("Error in createOrder:", error)
    return res.status(500).json({ message: "Error creating order", error: error.message })
  }
}

// Get an order by ID
exports.getOrderById = async (req, res) => {
  const { orderId } = req.params

  if (!orderId) {
    return res.status(400).json({ message: "Order ID is required" })
  }

  try {
    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Fetch restaurant from Restaurant Service
    const restaurantRes = await axios.get(`http://localhost:5001/api/restaurants/${order.restaurant_id}`)
    const restaurant = restaurantRes.data

    // Fetch each menu item from Menu Service
    const enrichedItems = await Promise.all(
      order.items.map(async (item) => {
        const menuRes = await axios.get(`http://localhost:5001/api/menu-items/${item.menu_id}`)
        const menu = menuRes.data

        return {
          _id: item._id,
          quantity: item.quantity,
          price: item.price,
          name: menu.name,
        }
      }),
    )

    // Try to fetch delivery information
    let delivery = null
    try {
      const deliveryRes = await axios.get(`http://localhost:5003/api/deliveries/by-order/${order._id}`, {
        headers: {
          Cookie: req.headers.cookie, // Forward auth cookie
        },
      })
      delivery = deliveryRes.data
    } catch (error) {
      console.log("No delivery information found for this order")
    }

    const {
      _id,
      customer_id,
      total_price,
      extra_notes,
      delivery_address,
      delivery_coordinates,
      delivery_location,
      order_status,
      payment_status,
      payment_method,
      stripe_payment_id,
      order_processing_time,
      createdAt,
      updatedAt,
    } = order

    const enrichedOrder = {
      _id,
      customer_id,
      items: enrichedItems,
      total_price,
      extra_notes,
      delivery_address,
      delivery_coordinates,
      delivery_location,
      order_status,
      payment_status,
      payment_method,
      stripe_payment_id,
      order_processing_time,
      createdAt,
      updatedAt,
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
      },
      delivery: delivery,
    }

    return res.status(200).json(enrichedOrder)
  } catch (error) {
    console.error("Order fetch error:", error.message)
    return res.status(500).json({ message: "Error fetching order", error })
  }
}

// Get all orders for a user
exports.getUserOrders = async (req, res) => {
  try {
    // Get user ID from the authenticated user in the request
    const userId = req.user.id

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" })
    }

    console.log(`Fetching orders for user: ${userId}`)

    const orders = await Order.find({ customer_id: userId }).sort({ createdAt: -1 })
    console.log(`Found ${orders.length} orders for user ${userId}`)

    // Enrich orders with basic restaurant info
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        try {
          const restaurantRes = await axios.get(`http://localhost:5001/api/restaurants/${order.restaurant_id}`)
          const restaurant = restaurantRes.data

          // Try to fetch delivery information
          let delivery = null
          try {
            const deliveryRes = await axios.get(`http://localhost:5003/api/deliveries/by-order/${order._id}`, {
              headers: {
                Cookie: req.headers.cookie, // Forward auth cookie
              },
            })
            delivery = deliveryRes.data
          } catch (error) {
            console.log(`No delivery information found for order ${order._id}`)
          }

          return {
            ...order.toObject(),
            restaurant_name: restaurant.name,
            restaurant: {
              id: restaurant._id,
              name: restaurant.name,
            },
            delivery: delivery,
          }
        } catch (error) {
          console.error(`Error fetching restaurant for order ${order._id}:`, error)
          return {
            ...order.toObject(),
            restaurant_name: "Unknown Restaurant",
          }
        }
      }),
    )

    return res.status(200).json(enrichedOrders)
  } catch (error) {
    console.error("Error fetching user orders:", error)
    return res.status(500).json({ message: "Error fetching orders", error: error.message })
  }
}

// Update order status - COMPLETELY REWRITTEN to bypass validation
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params
    const { status } = req.body

    if (!orderId || !status) {
      return res.status(400).json({ message: "Order ID and status are required" })
    }

    console.log(`Updating order ${orderId} status to ${status}`)

    // Use findByIdAndUpdate with { new: true } to return the updated document
    // Use { runValidators: false } to bypass validation for fields that aren't being updated
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { order_status: status },
      {
        new: true,
        runValidators: false,
        // Set timestamps if needed based on status
        $set:
          status === "OUT_FOR_DELIVERY"
            ? { out_delivery_time: new Date() }
            : status === "DELIVERED"
              ? { delivery_time: new Date() }
              : {},
      },
    )

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" })
    }

    console.log("Order status updated successfully:", updatedOrder)

    // If order is cancelled and payment was made, initiate refund
    if (status === "CANCELLED" && updatedOrder.payment_status === "COMPLETED" && updatedOrder.stripe_payment_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: updatedOrder.stripe_payment_id,
        })

        // Update payment status separately
        await Order.findByIdAndUpdate(
          orderId,
          {
            payment_status: "REFUNDED",
            refund_id: refund.id,
          },
          { runValidators: false },
        )
      } catch (refundError) {
        console.error("Refund error:", refundError)
        return res.status(500).json({ message: "Error processing refund", error: refundError.message })
      }
    }

    return res.status(200).json(updatedOrder)
  } catch (error) {
    console.error("Error updating order status:", error)
    return res.status(500).json({ message: "Error updating order", error })
  }
}

// Get orders that are ready for pickup
exports.getOrdersReadyForPickup = async (req, res) => {
  try {
    const orders = await Order.find({
      order_status: "READY_FOR_PICKUP",
      delivery_id: { $exists: false }, // Only orders that don't have a delivery assigned yet
    }).sort({ createdAt: 1 }) // Oldest first

    res.status(200).json(orders)
  } catch (error) {
    console.error("Error fetching orders ready for pickup:", error)
    res.status(500).json({ message: "Error fetching orders", error: error.message })
  }
}

// Update order with delivery ID
exports.updateOrderDelivery = async (req, res) => {
  try {
    const { id } = req.params
    const { delivery_id } = req.body

    if (!delivery_id) {
      return res.status(400).json({ message: "Delivery ID is required" })
    }

    const order = await Order.findById(id)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Use findByIdAndUpdate to bypass validation
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      {
        delivery_id: delivery_id,
        // If the order is ready for pickup, update status to OUT_FOR_DELIVERY
        ...(order.order_status === "READY_FOR_PICKUP"
          ? {
            order_status: "OUT_FOR_DELIVERY",
            out_delivery_time: new Date(),
          }
          : {}),
      },
      { new: true, runValidators: false },
    )

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.status(200).json(updatedOrder)
  } catch (error) {
    console.error("Error updating order with delivery ID:", error)
    res.status(500).json({ message: "Error updating order", error: error.message })
  }
}
