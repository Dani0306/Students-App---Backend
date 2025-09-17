import { Router } from "express";
import Assessment from "../models/Assessment.js";
import mongoose from "mongoose";
import User from "../models/User.js"

const router = Router()

// Get all asssesments

router.get("/all", async (req, res) => {
    try {
        const assessments = await Assessment.find();

        return res.status(200).json(assessments)
    } catch (error) {
        return res.status(400).json({ error, message: "Failed getting all assessments" })
    }
})


// Get all assessments from one user from one subject

router.get("/many/:studentId/:subjectId", async (req, res) => {
    try {
        const { studentId, subjectId, userEmail} = req.params;

        const user = await User.findOne({ email: userEmail });

        if(user.role !== "teacher" || user.role !== "admin") {
            return res.status(403).json({ error: "You do not have the permissions to execute this operation" })
        }

        // Ensure they are valid ObjectIds if required by schema
        if (!mongoose.Types.ObjectId.isValid(studentId) || !mongoose.Types.ObjectId.isValid(subjectId)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const assessments = await Assessment.find({
            student: new mongoose.Types.ObjectId(studentId),
            subject: new mongoose.Types.ObjectId(subjectId),
        }).lean();

        return res.status(200).json(assessments);
    } catch (e) {
        console.error("Failed getting grades:", e);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// create an assessment


router.post("/add", async (req, res) => {
    try {
        const { student, subject, grade, percentage, assessment } = req.body;

        if (!student || !subject) {
            return res.status(400).json({ error: "student and subject are required" })
        }

        if (!mongoose.Types.ObjectId.isValid(student) || !mongoose.Types.ObjectId.isValid(subject)) {
            return res.status(400).json({ error: "Invalid ID format" });
        }

        const newAssessment = await new Assessment({
            student: new mongoose.Types.ObjectId(student),
            subject: new mongoose.Types.ObjectId(subject),
            grade,
            percentage,
            assessment: assessment.trim(),
        }).save();

        return res.status(200).json(newAssessment);
    } catch (e) {
        console.log(e, "Failed creating grade")
    }

})


// Get final grades


router.get("/final/:studentId/:subjectId", async (req, res) => {
    try {
        const { studentId, subjectId } = req.params

        const assessments = await Assessment.find({
            student: studentId,
            subject: subjectId
        }).lean();

        const total = (assessments.reduce((acc, el) => acc + (el.grade * el.percentage), 0) / 100).toFixed(2)

        return res.status(200).json(total)
    } catch (e) {
        return res.status(400).json({ error: "Failed calculating final" })
    }


})

// Delete all assessments

router.delete("/all", async (req, res) => {
    try {
        const deleted = await Assessment.deleteMany();

        return res.status(200).json(deleted)
    } catch (error) {
        return res.status(200).json({ error, message: "Failed to delete assessments" })
    }
})


export default router
