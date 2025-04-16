const express = require('express');
const OrderController = require('../controllers/OrderController');
const { protect, isCustomer } = require('../middlewares/authMiddleware');

const orderRoutes = express.Router();

orderRoutes.use(protect); 
orderRoutes.use(isCustomer);

orderRoutes.post('/', OrderController.createOrder);
orderRoutes.get('/:orderId', OrderController.getOrderById);

module.exports = orderRoutes;