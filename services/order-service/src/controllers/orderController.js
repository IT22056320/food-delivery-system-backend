const Order = require("../models/Order");

// Create a new order
exports.createOrder = async (req, res) => {
    const { customer_id } = req.user;
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
    } = req.body;

    if (!customer_id || !restaurant_id || !items || !total_price || !delivery_address) {
        return res.status(400).json({ message: "All fields are required" });
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
        });

        const savedOrder = await newOrder.save();
        return res.status(201).json(savedOrder);
    } catch (error) {
        return res.status(500).json({ message: "Error creating order", error });
    }

}

// Get an order by ID
exports.getOrderById = async (req, res) => {
    const { orderId } = req.params;

    if (!orderId) {
        return res.status(400).json({ message: "Order ID is required" });
    }

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        return res.status(200).json(order);
    } catch (error) {
        return res.status(500).json({ message: "Error fetching order", error });
    }
}