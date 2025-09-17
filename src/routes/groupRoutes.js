import { Router } from "express"
import Group from "../models/Group.js"

const router = Router();

// Create group

router.post("/create", async (req, res) => {
    try {
        const { number, students, subject, term } = req.body

        const newGroup = await new Group({
            number, students, subject, term
        }).save();

        return res.status(200).json(newGroup)
    } catch (e) {
        return res.status(400).json({ error: "Failed creating gruop" })
    }
})

// get all subjects

router.get("/all", async (req , res) => {
    try {
        const groups = await Group.find();
        return res.status(200).json(groups)
    } catch (e){
        return res.status(400).json({ error: "Failed getting groups" })
    }
})

// delete all subjects

router.delete("/all", async (req , res) => {
    try {
        const groups = await Group.deleteMany();
        return res.status(200).json(groups)
    } catch (e){
        return res.status(400).json({ error: "Failed deleting groups" })
    }
})

export default router