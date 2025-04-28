require("dotenv").config()

const express = require("express")
const cookieParser = require("cookie-parser")
const cors = require("cors")
const dotenv = require("dotenv")
const connectDB = require("./src/config/db")

const orderRoutes = require("./src/routes/orderRoutes.js")
const paymentRoutes = require("./src/routes/paymentRoutes.js")


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

const PORT = process.env.PORT || 5002
app.listen(PORT, () => {
    console.log(`Order service running on port ${PORT}`)
})
