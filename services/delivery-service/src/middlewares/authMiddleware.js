const jwt = require("jsonwebtoken")
const { verifyToken } = require("../config/jwt")

// Middleware to protect routes
exports.protect = async (req, res, next) => {
    try {
        // Get token from cookie or authorization header
        let token
        if (req.cookies && req.cookies.token) {
            token = req.cookies.token
        } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1]
        }

        if (!token) {
            return res.status(401).json({ message: "Not authorized, no token" })
        }

        // Verify token
        const decoded = await verifyToken(token)
        req.user = decoded

        next()
    } catch (error) {
        console.error("Auth middleware error:", error)
        return res.status(401).json({ message: "Not authorized, token failed" })
    }
}

// Middleware to verify user role is delivery person
exports.isDeliveryPerson = (req, res, next) => {
    if (req.user && req.user.role === "delivery_person") {
        next()
    } else {
        res.status(403).json({ message: "Not authorized as delivery person" })
    }
}

// Middleware to verify user role is admin
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next()
    } else {
        res.status(403).json({ message: "Not authorized as admin" })
    }
}

// Middleware to verify user role is restaurant
exports.isRestaurant = (req, res, next) => {
    if (req.user && req.user.role === "restaurant") {
        next()
    } else {
        res.status(403).json({ message: "Not authorized as restaurant" })
    }
}

// Socket.io authentication middleware
exports.verifySocketToken = (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.query.token

        if (!token) {
            return next(new Error("Authentication error: No token provided"))
        }

        // Verify token
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return next(new Error("Authentication error: Invalid token"))
            }

            // Attach user info to socket
            socket.user = decoded
            next()
        })
    } catch (error) {
        console.error("Socket authentication error:", error)
        next(new Error("Authentication error"))
    }
}
