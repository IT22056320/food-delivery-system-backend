// Make sure dotenv is loaded at the very beginning of the file
require("dotenv").config()

const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDB = require("./src/config/db")

const orderRoutes = require("./src/routes/orderRoutes.js")
const paymentRoutes = require("./src/routes/paymentRoutes.js")

// Log environment variables for debugging (remove in production)
console.log("Environment variables loaded:", {
    PORT: process.env.PORT,
    MONGO_URI: process.env.MONGO_URI ? "Set" : "Not set",
    JWT_SECRET: process.env.JWT_SECRET ? "Set" : "Not set",
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY ? "Set" : "Not set",
})

const app = express()

app.use(
    cors({
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        credentials: true,
    }),
)
app.use(express.json())
app.use(cookieParser())



connectDB()

app.use("/api/orders", orderRoutes)
app.use("/api/payments", paymentRoutes)

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`)
})
