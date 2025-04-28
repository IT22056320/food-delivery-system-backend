const jwt = require("jsonwebtoken")
const { jwtSecret } = require("../config/jwt")

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

        try {
            // Verify token directly with jwt.verify
            const decoded = jwt.verify(token, jwtSecret)

            // Only log authentication for non-location update endpoints to reduce noise
            if (!req.originalUrl.includes("/api/locations/update")) {
                console.log("User authenticated:", {
                    id: decoded.id,
                    role: decoded.role,
                    endpoint: req.originalUrl,
                })
            }

            req.user = decoded
            next()
        } catch (tokenError) {
            console.error("Token verification failed:", tokenError)
            return res.status(401).json({ message: "Not authorized, token failed" })
        }
    } catch (error) {
        console.error("Auth middleware error:", error)
        return res.status(401).json({ message: "Not authorized, token failed" })
    }
}

// Middleware to verify user role is delivery person
exports.isDeliveryPerson = (req, res, next) => {
    // Check if user exists and has the delivery_person role
    if (req.user && req.user.role === "delivery_person") {
        next()
    } else {
        console.log("Access denied: Not a delivery person", {
            userId: req.user?.id,
            userRole: req.user?.role,
            requiredRole: "delivery_person",
        })
        res.status(403).json({ message: "Not authorized as delivery person" })
    }
}

// Middleware to verify user role is admin
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
        next()
    } else {
        console.log("Access denied: Not an admin", {
            userId: req.user?.id,
            userRole: req.user?.role,
            requiredRole: "admin",
        })
        res.status(403).json({ message: "Not authorized as admin" })
    }
}

// Middleware to verify user role is restaurant owner
exports.isRestaurant = (req, res, next) => {
    if (req.user && req.user.role === "restaurant_owner") {
        next()
    } else {
        console.log("Access denied: Not a restaurant owner", {
            userId: req.user?.id,
            userRole: req.user?.role,
            requiredRole: "restaurant_owner",
        })
        res.status(403).json({ message: "Not authorized as restaurant owner" })
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
