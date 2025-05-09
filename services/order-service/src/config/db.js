const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    console.log("Attempting to connect to MongoDB...")
    await mongoose.connect(process.env.MONGO_URI)
    console.log("MongoDB connected successfully")
  } catch (err) {
    console.error("MongoDB connection error:", err.message)
    console.error("Please check your MONGO_URI environment variable")
    process.exit(1)
  }
}

module.exports = connectDB
