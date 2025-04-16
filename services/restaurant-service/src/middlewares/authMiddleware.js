const jwt = require("jsonwebtoken")

// Verify JWT token
exports.protect = (req, res, next) => {
    const token = req.cookies.token

    if (!token) {
        res.status(401).json({ error: "Unauthorized - No token provided" })
        return
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = {
            _id: decoded.id,
            role: decoded.role,
        }
        next()
    } catch (error) {
        res.status(401).json({ error: "Unauthorized - Invalid token" })
    }
}

// Role-based authorization
exports.authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({
                error: `Access denied. Required role: ${roles.join(", ")}`,
            })
            return
        }
        next()
    }
}

// Convenience middleware for specific roles
exports.isAdmin = (req, res, next) => {
    exports.authorize("admin")(req, res, next)
}

exports.isRestaurantOwner = (req, res, next) => {
    exports.authorize("restaurant_owner")(req, res, next)
}

