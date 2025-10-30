import mongoose from "mongoose";

const { Schema } = mongoose;

const subjectSchema = new Schema({
    code: { type: String, unique: true, required: true },
    name: { type: String, required: true }, 
    credits: { type: Number, required: true }, 
    active: { type: Boolean, default: true }, 
    groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "Group" }],
    term: { type: String, required: true }, 
    description: { type: String }
}, {
    versionKey: false, 
    timestamps: true
})


const Subject = mongoose.model("Subject", subjectSchema);

export default Subject