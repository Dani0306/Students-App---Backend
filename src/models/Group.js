import mongoose from "mongoose"

const { Schema } = mongoose

const groupModel = new Schema({
    number: { type: String, required: true },
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    term: { type: String, required: true },
    schedule: [
        {
            day: { type: String, enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], required: true },
            startTime: { type: String, required: true }, // e.g. "10:00"
            endTime: { type: String, required: true }    // e.g. "12:00"
        }
    ],
    classRoom: { type: String, required: true },
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
    versionKey: false,
    timestamps: true
})


const Group = mongoose.model("Group", groupModel)

export default Group