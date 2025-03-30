import dotenv from "dotenv"
dotenv.config()

import express, { type Express } from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { connectDB } from "./src/config/db"
import restaurantRoutes from "./src/routes/restaurantRoutes"
import menuItemRoutes from "./src/routes/menuItemRoutes"
import orderRoutes from "./src/routes/orderRoutes"
import adminRoutes from "./src/routes/adminRoutes"
import errorHandler from "./src/middlewares/errorHandler"

const app: Express = express()

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

