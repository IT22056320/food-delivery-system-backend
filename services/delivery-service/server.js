require("dotenv").config()
const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const http = require("http")
const socketIo = require("socket.io")
const { connectDB } = require("./src/config/db")
const deliveryRoutes = require("./src/routes/deliveryRoutes")
const locationRoutes = require("./src/routes/locationRoutes")
const notificationRoutes = require("./src/routes/notificationRoutes")
const errorHandler = require("./src/middlewares/errorHandler")
const { verifySocketToken } = require("./src/middlewares/authMiddleware")

// Initialize express app
const app = express()
const server = http.createServer(app)
const io = socketIo(server, {
    cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
    },
})

// Debug environment variables
console.log("Environment variables loaded:", {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI ? "Set" : "Not set",
    JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Not set",
})

// Middleware
app.use(express.json())
app.use(cookieParser())
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    }),
)

// Socket.io middleware to attach io to request object
app.use((req, res, next) => {
    req.io = io
    next()
})

// Socket.io connection handling
io.use(verifySocketToken)
io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`)

    // Join rooms based on user role
    if (socket.user) {
        if (socket.user.role === "admin") {
            socket.join("admin")
        } else if (socket.user.role === "delivery_person") {
            socket.join(`driver:${socket.user.id}`)
        }
    }

    // Join delivery tracking room
    socket.on("trackDelivery", (deliveryId) => {
        if (deliveryId) {
            socket.join(`delivery:${deliveryId}`)
            console.log(`Socket ${socket.id} joined delivery tracking room: ${deliveryId}`)
        }
    })

    // Stop tracking delivery
    socket.on("stopTracking", (deliveryId) => {
        if (deliveryId) {
            socket.leave(`delivery:${deliveryId}`)
            console.log(`Socket ${socket.id} left delivery tracking room: ${deliveryId}`)
        }
    })

    // Handle disconnect
    socket.on("disconnect", () => {
        console.log(`Socket disconnected: ${socket.id}`)
    })
})

// Routes
app.use("/api/deliveries", deliveryRoutes)
app.use("/api/locations", locationRoutes)
app.use("/api/notifications", notificationRoutes)

// Health check endpoint
app.get("/health", (req, res) => {
    res.status(200).json({ status: "Delivery service is running" })
})

// Error handling middleware
app.use(errorHandler)

// Connect to MongoDB
console.log("Attempting to connect to MongoDB...")
connectDB()
    .then(() => {
        console.log("MongoDB connected successfully")

        // Start server
        const PORT = process.env.PORT || 5003
        server.listen(PORT, () => {
            console.log(`Delivery service running on port ${PORT}`)
        })
    })
    .catch((err) => {
        console.error("Failed to connect to MongoDB:", err.message)
        process.exit(1)
    })
