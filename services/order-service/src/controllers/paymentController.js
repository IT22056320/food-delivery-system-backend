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

const Order = require("../models/Order")
const axios = require("axios")

// Create a payment intent with Stripe
exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = "usd", metadata = {} } = req.body

        if (!amount) {
            return res.status(400).json({ error: "Amount is required" })
        }

        // Check if Stripe is properly initialized
        if (!stripe) {
            return res.status(500).json({
                error: "Stripe is not properly initialized. Please check your API key.",
            })
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Stripe requires amount in cents
            currency,
            metadata,
            automatic_payment_methods: {
                enabled: true,
            },
        })

        // Send the client secret to the client
        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        })
    } catch (error) {
        console.error("Payment intent error:", error)
        res.status(500).json({ error: error.message || "Error creating payment intent" })
    }
}

// Handle Stripe webhook events
exports.handleWebhook = async (req, res) => {
    const sig = req.headers["stripe-signature"]
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    let event

    try {
        // Verify the event came from Stripe
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret)
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`)
        return res.status(400).send(`Webhook Error: ${err.message}`)
    }

    // Handle the event
    switch (event.type) {
        case "payment_intent.succeeded":
            const paymentIntent = event.data.object
            // Update order status based on payment intent metadata
            if (paymentIntent.metadata.orderId) {
                await Order.findByIdAndUpdate(paymentIntent.metadata.orderId, {
                    payment_status: "COMPLETED",
                    stripe_payment_id: paymentIntent.id,
                })
            }
            break
        case "payment_intent.payment_failed":
            const failedPaymentIntent = event.data.object
            // Update order status for failed payment
            if (failedPaymentIntent.metadata.orderId) {
                await Order.findByIdAndUpdate(failedPaymentIntent.metadata.orderId, {
                    payment_status: "FAILED",
                    stripe_payment_id: failedPaymentIntent.id,
                })
            }
            break
        default:
            console.log(`Unhandled event type ${event.type}`)
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send()
}

// Confirm payment status
exports.confirmPayment = async (req, res) => {
    try {
        const { orderId, paymentIntentId } = req.body

        if (!orderId || !paymentIntentId) {
            return res.status(400).json({ error: "Order ID and Payment Intent ID are required" })
        }

        // Retrieve the payment intent from Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

        // Update order based on payment status
        let paymentStatus
        if (paymentIntent.status === "succeeded") {
            paymentStatus = "COMPLETED"
        } else if (["requires_payment_method", "requires_action"].includes(paymentIntent.status)) {
            paymentStatus = "PENDING"
        } else {
            paymentStatus = "FAILED"
        }

        // Find the order
        const order = await Order.findById(orderId)

        if (!order) {
            return res.status(404).json({ error: "Order not found" })
        }

        // Update the order with payment status
        order.payment_status = paymentStatus
        order.stripe_payment_id = paymentIntentId
        await order.save()

        // Create delivery record in delivery service
        try {
            // Get restaurant details
            const restaurantRes = await axios.get(`http://localhost:5001/api/restaurants/${order.restaurant_id}`)
            const restaurant = restaurantRes.data

            // Create delivery record
            const deliveryResponse = await axios.post(
                "http://localhost:5003/api/deliveries",
                {
                    order_id: order._id,
                    pickup_location: {
                        address: restaurant.address,
                        coordinates: restaurant.location?.coordinates || { lat: 0, lng: 0 },
                    },
                    delivery_location: {
                        address: order.delivery_address,
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
        } catch (deliveryError) {
            console.error("Error in delivery creation process:", deliveryError.message)
            // Continue execution even if delivery creation fails
        }

        res.status(200).json({
            success: true,
            order: order,
            paymentStatus,
        })
    } catch (error) {
        console.error("Payment confirmation error:", error)
        res.status(500).json({ error: error.message || "Error confirming payment" })
    }
}
