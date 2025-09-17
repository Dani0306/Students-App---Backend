import mongoose from "mongoose"


const { Schema } = mongoose;

const userSchema = new Schema({
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true }, 
    email: { type: String, required: true }, 
    id: { type: String, required: true, unique: true }, 
    role: { type: String, enum: ["student", "teacher", "admin"], default: "student" }
}, {
    versionKey: false,
    timestamps: true
})

const User = mongoose.model("Student", userSchema);

export default User;