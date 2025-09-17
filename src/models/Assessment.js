import mongoose from "mongoose"

const { Schema } = mongoose;

const assessmentSchema = new Schema({
    student: { type: mongoose.Schema.Types.ObjectId, ref: "Student", required: true }, 
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true }, 
    grade: { type: Number, min: 0, max: 5 }, 
    percentage: { type: Number, min: 5, max: 20, required: true }, 
    assessment: { type: String, default: "", required: true}
}, {
    versionKey: false, 
    timestamps: true
})

const Assessment = mongoose.model("Assessment", assessmentSchema);

export default Assessment