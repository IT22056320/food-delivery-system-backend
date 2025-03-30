import type { Request, Response, NextFunction } from "express"

interface AppError extends Error {
    statusCode?: number
}

const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
    console.error("❌ Error:", err.stack)

    const statusCode = err.statusCode || 500

    res.status(statusCode).json({
        message: err.message || "Internal Server Error",
        stack: process.env.NODE_ENV === "production" ? null : err.stack,
    })
}

export default errorHandler

