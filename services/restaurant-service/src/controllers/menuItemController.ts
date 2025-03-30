import type { Response } from "express"
import MenuItem from "../models/MenuItem"
import Restaurant from "../models/Restaurant"
import type { RequestWithUser } from "../types"
import mongoose from "mongoose"

// Create a new menu item
export const createMenuItem = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { restaurantId, name, description, price, category, image, preparationTime, ingredients, nutritionalInfo } =
            req.body

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Check if restaurant exists and user is the owner
        const restaurant = await Restaurant.findById(restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to add menu items to this restaurant" })
            return
        }

        const menuItem = await MenuItem.create({
            restaurantId,
            name,
            description,
            price,
            category,
            image,
            preparationTime,
            ingredients,
            nutritionalInfo,
            isAvailable: true,
        })

        res.status(201).json(menuItem)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to create menu item",
        })
    }
}

// Get all menu items for a restaurant
export const getMenuItems = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { restaurantId } = req.params

        const menuItems = await MenuItem.find({ restaurantId })

        res.status(200).json(menuItems)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch menu items",
        })
    }
}

// Get menu item by ID
export const getMenuItemById = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params

        const menuItem = await MenuItem.findById(id)

        if (!menuItem) {
            res.status(404).json({ error: "Menu item not found" })
            return
        }

        res.status(200).json(menuItem)
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to fetch menu item",
        })
    }
}

// Update menu item
export const updateMenuItem = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        // Check if valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
            res.status(400).json({ error: "Invalid menu item ID" })
            return
        }

        const menuItem = await MenuItem.findById(id)

        if (!menuItem) {
            res.status(404).json({ error: "Menu item not found" })
            return
        }

        // Check if user is the restaurant owner
        const restaurant = await Restaurant.findById(menuItem.restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to update this menu item" })
            return
        }

        const updatedMenuItem = await MenuItem.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })

        res.status(200).json(updatedMenuItem)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to update menu item",
        })
    }
}

// Update menu item availability
export const updateMenuItemAvailability = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params
        const { isAvailable } = req.body

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const menuItem = await MenuItem.findById(id)

        if (!menuItem) {
            res.status(404).json({ error: "Menu item not found" })
            return
        }

        // Check if user is the restaurant owner
        const restaurant = await Restaurant.findById(menuItem.restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to update this menu item" })
            return
        }

        menuItem.isAvailable = isAvailable
        await menuItem.save()

        res.status(200).json(menuItem)
    } catch (error) {
        res.status(400).json({
            error: error instanceof Error ? error.message : "Failed to update menu item availability",
        })
    }
}

// Delete menu item
export const deleteMenuItem = async (req: RequestWithUser, res: Response): Promise<void> => {
    try {
        const { id } = req.params

        if (!req.user) {
            res.status(401).json({ error: "User not authenticated" })
            return
        }

        const menuItem = await MenuItem.findById(id)

        if (!menuItem) {
            res.status(404).json({ error: "Menu item not found" })
            return
        }

        // Check if user is the restaurant owner
        const restaurant = await Restaurant.findById(menuItem.restaurantId)

        if (!restaurant) {
            res.status(404).json({ error: "Restaurant not found" })
            return
        }

        if (restaurant.ownerId !== req.user._id && req.user.role !== "admin") {
            res.status(403).json({ error: "Not authorized to delete this menu item" })
            return
        }

        await MenuItem.findByIdAndDelete(id)

        res.status(200).json({ message: "Menu item deleted successfully" })
    } catch (error) {
        res.status(500).json({
            error: error instanceof Error ? error.message : "Failed to delete menu item",
        })
    }
}

