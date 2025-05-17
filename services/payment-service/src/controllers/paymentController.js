// Initialize Stripe with proper error handling
let stripe;
try {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY is not defined in environment variables");
  } else {
    stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  }
} catch (error) {
  console.error("Failed to initialize Stripe:", error.message);
}

const Payment = require("../models/Payment");
const axios = require("axios");

// Create a payment intent with Stripe
exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount, currency = "usd", metadata = {}, order_id } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    if (!order_id) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    // Check if Stripe is properly initialized
    if (!stripe) {
      return res.status(500).json({
        error: "Stripe is not properly initialized. Please check your API key.",
      });
    }

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Stripe requires amount in cents
      currency,
      metadata: { ...metadata, order_id },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create a payment record in our database
    const payment = new Payment({
      order_id,
      amount,
      currency,
      payment_method: "CARD",
      status: "PENDING",
      stripe_payment_intent_id: paymentIntent.id,
      stripe_client_secret: paymentIntent.client_secret,
      metadata,
    });

    await payment.save();

    // Send the client secret to the client
    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentId: payment._id,
    });
  } catch (error) {
    console.error("Payment intent error:", error);
    res
      .status(500)
      .json({ error: error.message || "Error creating payment intent" });
  }
};

// Handle Stripe webhook events
exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    // Verify the event came from Stripe
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object;
      // Update payment status
      await handlePaymentSuccess(paymentIntent);
      break;
    case "payment_intent.payment_failed":
      const failedPaymentIntent = event.data.object;
      // Update payment status for failed payment
      await handlePaymentFailure(failedPaymentIntent);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send();
};

// Confirm payment status
exports.confirmPayment = async (req, res) => {
  try {
    const { orderId, paymentIntentId } = req.body;

    if (!orderId || !paymentIntentId) {
      return res
        .status(400)
        .json({ error: "Order ID and Payment Intent ID are required" });
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find the payment record
    const payment = await Payment.findOne({
      stripe_payment_intent_id: paymentIntentId,
    });

    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    // Update payment status based on Stripe status
    let paymentStatus;
    if (paymentIntent.status === "succeeded") {
      paymentStatus = "COMPLETED";
    } else if (
      ["requires_payment_method", "requires_action"].includes(
        paymentIntent.status
      )
    ) {
      paymentStatus = "PENDING";
    } else {
      paymentStatus = "FAILED";
    }

    payment.status = paymentStatus;
    await payment.save();

    // Notify order service about the payment status
    try {
      await axios.post(
        `http://localhost:5002/api/orders/${orderId}/payment-update`,
        {
          paymentStatus,
          paymentId: payment._id,
          paymentIntentId,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (orderUpdateError) {
      console.error(
        "Error updating order with payment status:",
        orderUpdateError
      );
      // Continue execution even if order update fails
    }

    res.status(200).json({
      success: true,
      payment,
      paymentStatus,
    });
  } catch (error) {
    console.error("Payment confirmation error:", error);
    res
      .status(500)
      .json({ error: error.message || "Error confirming payment" });
  }
};

// Process refund
exports.processRefund = async (req, res) => {
  try {
    const { paymentId, amount, reason } = req.body;

    if (!paymentId) {
      return res.status(400).json({ error: "Payment ID is required" });
    }

    // Find the payment record
    const payment = await Payment.findById(paymentId);

    if (!payment) {
      return res.status(404).json({ error: "Payment not found" });
    }

    if (payment.status !== "COMPLETED") {
      return res
        .status(400)
        .json({ error: "Only completed payments can be refunded" });
    }

    // Process refund through Stripe
    const refundAmount = amount || payment.amount;
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: reason || "requested_by_customer",
    });

    // Update payment record
    payment.status = "REFUNDED";
    payment.refund_id = refund.id;
    payment.refund_amount = refundAmount;
    await payment.save();

    // Notify order service about the refund
    try {
      await axios.post(
        `http://localhost:5002/api/orders/${payment.order_id}/refund`,
        {
          refundId: refund.id,
          refundAmount: refundAmount,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    } catch (orderUpdateError) {
      console.error(
        "Error updating order with refund information:",
        orderUpdateError
      );
      // Continue execution even if order update fails
    }

    res.status(200).json({
      success: true,
      refund,
      payment,
    });
  } catch (error) {
    console.error("Refund processing error:", error);
    res.status(500).json({ error: error.message || "Error processing refund" });
  }
};

// Get payment by order ID
exports.getPaymentByOrderId = async (req, res) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "Order ID is required" });
    }

    const payment = await Payment.findOne({ order_id: orderId });

    if (!payment) {
      return res
        .status(404)
        .json({ error: "Payment not found for this order" });
    }

    res.status(200).json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({ error: error.message || "Error fetching payment" });
  }
};

// Helper functions
async function handlePaymentSuccess(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.order_id;

    // Update payment record
    const payment = await Payment.findOne({
      stripe_payment_intent_id: paymentIntent.id,
    });
    if (payment) {
      payment.status = "COMPLETED";
      await payment.save();
    }

    // Notify order service
    if (orderId) {
      await axios.post(
        `http://localhost:5002/api/orders/${orderId}/payment-update`,
        {
          paymentStatus: "COMPLETED",
          paymentId: payment?._id,
          paymentIntentId: paymentIntent.id,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error handling payment success:", error);
  }
}

async function handlePaymentFailure(paymentIntent) {
  try {
    const orderId = paymentIntent.metadata.order_id;

    // Update payment record
    const payment = await Payment.findOne({
      stripe_payment_intent_id: paymentIntent.id,
    });
    if (payment) {
      payment.status = "FAILED";
      payment.error_message =
        paymentIntent.last_payment_error?.message || "Payment failed";
      await payment.save();
    }

    // Notify order service
    if (orderId) {
      await axios.post(
        `http://localhost:5002/api/orders/${orderId}/payment-update`,
        {
          paymentStatus: "FAILED",
          paymentId: payment?._id,
          paymentIntentId: paymentIntent.id,
          errorMessage: payment?.error_message,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Error handling payment failure:", error);
  }
}
