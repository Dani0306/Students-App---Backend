import { Router } from "express"
import User from "../models/User.js";

const router = Router();

router.post("/create", async (req, res) => {
    try {
        const { firstName, lastName, email, id } = req.body;

        const newUser = await new User({
            firstName, lastName, email, id
        }).save()

        return res.status(200).json(newUser)
    } catch (e) {
        return res.status(400).json({ error: "Error creating User" })
    }
})

// Get all users

router.get("/all", async (req, res) => {
    try {
        const users = await User.find();

        return res.status(200).json(users)
    } catch (error) {
        return res.status(400).json({ error, message: "Failed to get users" })
    }
})

// Delete all users

router.delete("/all", async (req, res) => {
    try {
        const deleted = await User.deleteMany();

        return res.status(200).json(deleted)
    } catch (error) {
        return res.status(400).json({ error, message: "Failed to delete users" })
    }
})



export default router;