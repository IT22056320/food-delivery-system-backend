const express = require('express');
const OrderController = require('../controllers/orderController');
const { protect, isRestaurantOwner } = require('../middlewares/authMiddleware');

const orderRoutes = express.Router();

orderRoutes.use(protect); 
orderRoutes.use(isRestaurantOwner);

orderRoutes.post('/', OrderController.createOrder);
orderRoutes.get('/:orderId', OrderController.getOrderById);

module.exports = orderRoutes;