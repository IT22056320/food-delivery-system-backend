import type { Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import type { RequestWithUser } from "../types"

interface DecodedToken {
    id: string
    role: string
}

// Verify JWT token
export const protect = (req: RequestWithUser, res: Response, next: NextFunction): void => {
    const token = req.cookies.token

    if (!token) {
        res.status(401).json({ error: "Unauthorized - No token provided" })
        return
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as DecodedToken
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
export const authorize = (...roles: string[]) => {
    return (req: RequestWithUser, res: Response, next: NextFunction): void => {
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
export const isAdmin = (req: RequestWithUser, res: Response, next: NextFunction): void => {
    authorize("admin")(req, res, next)
}

export const isRestaurantOwner = (req: RequestWithUser, res: Response, next: NextFunction): void => {
    authorize("restaurant_owner")(req, res, next)
}

