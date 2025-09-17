import mongoose from "mongoose"

const { Schema } = mongoose

const groupModel = new Schema({
    number: { type: String, required: true }, 
    students: [{ type:  mongoose.Schema.Types.ObjectId, ref: "Student" }],
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
    term: { type: String, default: "2025-2", required: true }
}, {
    versionKey: false, 
    timestamps: true
})


const Group = mongoose.model("Group", groupModel)

export default Group