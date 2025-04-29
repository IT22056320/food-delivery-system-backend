const jwt = require("jsonwebtoken")

// Verify JWT token
exports.verifyToken = (req, res, next) => {
    // Get token from cookies
    const token = req.cookies.jwt

    if (!token) {
        return res.status(401).json({ message: "No token provided" })
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret")
        req.user = decoded
        next()
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" })
    }
}

// Check if user is a delivery person
exports.isDeliveryPerson = (req, res, next) => {
    if (req.user && req.user.role === "delivery_person") {
        next()
    } else {
        res.status(403).json({ message: "Access denied. Delivery person role required." })
    }
}

// Check if user is an admin
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next()
    } else {
        res.status(403).json({ message: "Access denied. Admin role required." })
    }
}

// Optional token verification (doesn't require authentication)
exports.optionalVerifyToken = (req, res, next) => {
    const token = req.cookies.jwt

    if (!token) {
        req.user = null
        return next()
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret")
        req.user = decoded
        next()
    } catch (error) {
        req.user = null
        next()
    }
}
