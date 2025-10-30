import mongoose from "mongoose"

const { Schema } = mongoose;

const gradeSchema = new Schema({
    teacher: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true  },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true }, 
    grade: { type: Number, min: 0, max: 5 }, 
    assessment: { type: mongoose.Schema.Types.ObjectId, ref: "Assessment"}, 
    term: { type: String, required: true }, 
    group: { type: mongoose.Schema.Types.ObjectId, ref: "Group", required: true }
}, {
    versionKey: false, 
    timestamps: true
})

const Grade = mongoose.model("Grade", gradeSchema);


export default Grade