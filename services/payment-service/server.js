require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const connectDB = require("./src/config/db");

const paymentRoutes = require("./src/routes/paymentRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Connect to MongoDB
connectDB();

// Routes
app.use("/api/payments", paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Payment service error:", err.stack);
  res.status(500).json({
    error: err.message || "Internal Server Error in Payment Service",
  });
});

const PORT = process.env.PORT || 5006;
app.listen(PORT, () => {
  console.log(`Payment service running on port ${PORT}`);
});
