import { Router } from "express"
import Subject from "../models/Subject.js"


const router = Router();

// create subject

router.post("/create", async (req, res) => {
    try {
        const { code, name, credits, groups, term } = req.body;

        const newSubject = await new Subject({
            code, name, credits, groups, term
        }).save()

        return res.status(200).json(newSubject)
    } catch (e) {
        return res.status(400).json({ error: "Failed creating Subject" })
    }
})

// get all subjects

router.get("/all", async (req, res) => {
    try {
        const subejcts = await Subject.find();
        return res.status(200).json(subejcts)
    } catch (e) {
        return res.status(400).json({ error: "Failed getting subjects" })
    }
})

// delete all subjects

router.delete("/all", async (req, res) => {
    try {
        const subejcts = await Subject.deleteMany();
        return res.status(200).json(subejcts)
    } catch (e) {
        return res.status(400).json({ error: "Failed deleting subjects" })
    }
})

router.put("/addGroup", async (req, res) => {
    try {
        const { subjectId, groupId } = req.body

        const updatedSubject = await Subject.findByIdAndUpdate(subjectId, {
            $push: { groups: groupId }
        }, { new: true });

        return res.status(200).json(updatedSubject)
    } catch (e) {
        return res.status(400).json({ error: "Failed adding group" })
    }
})


export default router