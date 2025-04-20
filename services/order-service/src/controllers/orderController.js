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
    const newOrder = new Order({
      customer_id,
      restaurant_id,
      items,
      total_price,
      extra_notes,
      delivery_address,
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

    // Create delivery record in delivery service
    try {
      // Get restaurant details
      const restaurantRes = await axios.get(`http://localhost:5001/api/restaurants/${restaurant_id}`)
      const restaurant = restaurantRes.data

      console.log("Creating delivery record for order:", savedOrder._id)
      console.log("Restaurant details:", restaurant.name, restaurant.address)
      console.log("Delivery address:", delivery_address)

      // Create delivery record with more detailed error handling
      try {
        const deliveryResponse = await axios.post(
          "http://localhost:5003/api/deliveries",
          {
            order_id: savedOrder._id.toString(), // Ensure it's a string
            pickup_location: {
              address: restaurant.address,
              coordinates: restaurant.location?.coordinates || { lat: 0, lng: 0 },
            },
            delivery_location: {
              address: delivery_address,
              coordinates: { lat: 0, lng: 0 }, // Would be geocoded in a real app
            },
            customer_contact: {
              name: req.user.name || "Customer",
              phone: req.user.phone || "Unknown",
            },
            restaurant_contact: {
              name: restaurant.name,
              phone: restaurant.phone || "Unknown",
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            // Don't use credentials: 'include' with axios, it doesn't work the same as fetch
            // Instead, manually forward the auth token if needed
          },
        )
        console.log("Delivery record created successfully:", deliveryResponse.data)
      } catch (axiosError) {
        console.error("Axios error creating delivery:", axiosError.message)
        if (axiosError.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          console.error("Response data:", axiosError.response.data)
          console.error("Response status:", axiosError.response.status)
          console.error("Response headers:", axiosError.response.headers)
        } else if (axiosError.request) {
          // The request was made but no response was received
          console.error("No response received:", axiosError.request)
        } else {
          // Something happened in setting up the request that triggered an Error
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
    const userId = req.user.id

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" })
    }

    const orders = await Order.find({ customer_id: userId }).sort({ createdAt: -1 })

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
            console.log("No delivery information found for this order")
          }

          return {
            ...order.toObject(),
            restaurant: {
              id: restaurant._id,
              name: restaurant.name,
            },
            delivery: delivery,
          }
        } catch (error) {
          console.error(`Error fetching restaurant for order ${order._id}:`, error)
          return order
        }
      }),
    )

    return res.status(200).json(enrichedOrders)
  } catch (error) {
    console.error("Error fetching user orders:", error)
    return res.status(500).json({ message: "Error fetching orders", error })
  }
}

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params
    const { status } = req.body

    if (!orderId || !status) {
      return res.status(400).json({ message: "Order ID and status are required" })
    }

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    // Update the order status
    order.order_status = status

    // If order is cancelled and payment was made, initiate refund
    if (status === "CANCELLED" && order.payment_status === "COMPLETED" && order.stripe_payment_id) {
      try {
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_id,
        })

        order.payment_status = "REFUNDED"
        order.refund_id = refund.id
      } catch (refundError) {
        console.error("Refund error:", refundError)
        return res.status(500).json({ message: "Error processing refund", error: refundError.message })
      }
    }

    await order.save()

    return res.status(200).json(order)
  } catch (error) {
    console.error("Error updating order status:", error)
    return res.status(500).json({ message: "Error updating order", error })
  }
}
