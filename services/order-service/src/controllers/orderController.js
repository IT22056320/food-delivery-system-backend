const Order = require("../models/Order");
const axios = require("axios");

// Create a new order
exports.createOrder = async (req, res) => {
    const customer_id  = req.user.id;
    console.log("Customer ID:", customer_id, req.user.id);
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
  
      // Fetch restaurant from Restaurant Service
      const restaurantRes = await axios.get(`http://localhost:5001/api/restaurants/${order.restaurant_id}`);
      const restaurant = restaurantRes.data;
  
      // Fetch each menu item from Menu Service
      const enrichedItems = await Promise.all(
        order.items.map(async (item) => {
          const menuRes = await axios.get(`http://localhost:5001/api/menu-items/${item.menu_id}`);
          const menu = menuRes.data;
  
          return {
            _id: item._id,
            quantity: item.quantity,
            price: item.price,
            name: menu.name,
          };
        })
      );
  
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
        updatedAt
      } = order;

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
          name: restaurant.name
        }
      };
  
      return res.status(200).json(enrichedOrder);
    } catch (error) {
      console.error('Order fetch error:', error.message);
      return res.status(500).json({ message: "Error fetching order", error });
    }
  };
  
  