import type { Request, Response } from "express"
import Restaurant from "../models/Restaurant"
import type { RequestWithUser } from "../types"
import mongoose from "mongoose"

// Create a new restaurant
export const createRestaurant = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { name, address, phone, email, description, cuisine, openingHours } = req.body

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const restaurant = await Restaurant.create({
            name,
            ownerId: req.user._id,
            address,
            phone,
            email,
            description,
            cuisine,
            openingHours,
            isVerified: false, // Requires admin verification
        })

        res.status(201).json(restaurant)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to create restaurant",
        })
    }
}

// Get all restaurants (for admin)
export const getAllRestaurants = async (req: Request, res: Response): Promise<void> => {
    try {
        const restaurants = await Restaurant.find()
        res.status(200).json(restaurants)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch restaurants",
        })
    }
}

// Get restaurant by ID
export const getRestaurantById = async (req: Request, res: Response): Promise<void> => {
    try {
        const restaurant = await Restaurant.findById(req.params.id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        res.status(200).json(restaurant)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch restaurant",
        })
    }
}

// Get restaurants owned by the logged-in user
export const getMyRestaurants = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const restaurants = await Restaurant.find({ ownerId: req.user._id })
        res.status(200).json(restaurants)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch restaurants",
        })
    }
}

// Update restaurant
export const updateRestaurant = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Check if valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid restaurant ID" })
            return
        }

        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        // Check if user is the owner or admin
        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to update this restaurant" })
            return
        }

        const updatedRestaurant = await Restaurant.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })

        res.status(200).json(updatedRestaurant)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to update restaurant",
        })
    }
}

// Update restaurant availability
export const updateAvailability = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const { isAvailable } = req.body

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        // Check if user is the owner
        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to update this restaurant" })
            return
        }

        restaurant.isAvailable = isAvailable
        await restaurant.save()

        res.status(200).json(restaurant)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to update availability",
        })
    }
}

// Delete restaurant
export const deleteRestaurant = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const restaurant = await Restaurant.findById(id)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        // Check if user is the owner or admin
        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to delete this restaurant" })
            return
        }

        await Restaurant.findByIdAndDelete(id)

        res.status(200).json({ message: "Restaurant deleted successfully" })
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to delete restaurant",
        })
    }
}

