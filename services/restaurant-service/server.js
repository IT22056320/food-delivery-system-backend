require("dotenv").config()

const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const { connectDB } = require("./src/config/db")
const restaurantRoutes = require("./src/routes/restaurantRoutes")
const menuItemRoutes = require("./src/routes/menuItemRoutes")
const orderRoutes = require("./src/routes/orderRoutes")
const adminRoutes = require("./src/routes/adminRoutes")
const errorHandler = require("./src/middlewares/errorHandler")

const app = express()

// Middleware
app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    }),
)

app.use(express.json())
app.use(cookieParser())

// Routes
app.use("/api/restaurants", restaurantRoutes)
app.use("/api/menu-items", menuItemRoutes)
app.use("/api/orders", orderRoutes)
app.use("/api/admin", adminRoutes)

// Global error handler
app.use(errorHandler)

// Connect to DB and start server
const PORT = process.env.PORT || 5001
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`🍔 Restaurant Service running at http://localhost:${PORT}`)
    })
})

