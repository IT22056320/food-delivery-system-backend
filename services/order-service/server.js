require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./src/config/db");
const orderRoutes = require("./src/routes/orderRoutes");
const transactionRoutes = require("./src/routes/transactionRoutes"); // Add this line
const errorHandler = require("./src/middlewares/errorHandler");

// Initialize express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "https://foodhub.com",
    ],
    credentials: true,
  })
);

// Routes
app.use("/api/orders", orderRoutes);
app.use("/api/transactions", transactionRoutes); // Add this line

// Error handling middleware
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Order service running on port ${PORT}`);
});

module.exports = app;
