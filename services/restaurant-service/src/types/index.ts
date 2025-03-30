import type { Document } from "mongoose"
import type { Request } from "express"

export interface IRestaurant extends Document {
    name: string
    ownerId: string
    address: string
    phone: string
    email: string
    description: string
    cuisine: string[]
    openingHours: {
        day: string
        open: string
        close: string
    }[]
    isAvailable: boolean
    isVerified: boolean
    rating: number
    createdAt: Date
    updatedAt: Date
}

export interface IMenuItem extends Document {
    restaurantId: string
    name: string
    description: string
    price: number
    category: string
    image?: string
    isAvailable: boolean
    preparationTime: number
    ingredients: string[]
    nutritionalInfo?: {
        calories: number
        protein: number
        carbs: number
        fat: number
    }
    createdAt: Date
    updatedAt: Date
}

export interface IOrder extends Document {
    restaurantId: string
    userId: string
    items: {
        menuItemId: string
        name: string
        price: number
        quantity: number
    }[]
    totalAmount: number
    status: "pending" | "accepted" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled"
    deliveryAddress: string
    deliveryPerson?: string
    paymentStatus: "pending" | "completed" | "failed"
    paymentMethod: "card" | "cash" | "wallet"
    specialInstructions?: string
    estimatedDeliveryTime?: Date
    actualDeliveryTime?: Date
    createdAt: Date
    updatedAt: Date
}

export interface IUser {
    _id: string
    role: string
}

export interface RequestWithUser extends Request {
    user?: IUser
}

