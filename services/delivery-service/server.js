const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const dotenv = require("dotenv")
const { verifyToken } = require("./src/middlewares/authMiddleware")
const errorHandler = require("./src/middlewares/errorHandler")
const deliveryRoutes = require("./src/routes/deliveryRoutes")

// Load environment variables
dotenv.config()

const app = express()

// Middleware
app.use(express.json())
app.use(cookieParser())
app.use(
    cors({
        origin: ["http://localhost:3000", "http://localhost:3001"],
        credentials: true,
    }),
)

// Connect to MongoDB
mongoose
    .connect(process.env.MONGODB_URI || "mongodb+srv://udulajoker026:CvARzY4spvLIQ75l@cluster0.2imectr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/deliveries", deliveryRoutes)

// Health check route
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})

// Error handling middleware
app.use(errorHandler)

// Start server
const PORT = process.env.PORT || 5003
app.listen(PORT, () => {
    console.log(`Delivery service running on port ${PORT}`)
})

module.exports = app