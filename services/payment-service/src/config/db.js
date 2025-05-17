const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    console.log("Payment service: Attempting to connect to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Payment service: MongoDB connected successfully");
  } catch (err) {
    console.error("Payment service: MongoDB connection error:", err.message);
    console.error("Please check your MONGO_URI environment variable");
    process.exit(1);
  }
};

module.exports = connectDB;
