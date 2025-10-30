import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    firstName: { type: String, required: true, immutbale: true },
    lastName: { type: String, required: true, immutbale: true },
    email: { type: String, required: true },
    id: { type: String, required: true, unique: true, immutable: true },
    documentType: { type: String, default: "CC", required: true },
    status: {
      type: String,
      enum: ["active", "blocked", "suspended"],
      default: "active",
    },
    blockedAt: { type: Date, default: null },
    blockedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },

    birthDate: { type: Date },
    gender: { type: String, enum: ["MASCULINO", "FEMENINO", "OTRO"] },
    mobilePhone: { type: String },
    address: { type: String },
    countryOfBirth: { type: String },
    cityOfBirth: { type: String },
    countryOfResidence: { type: String },
    cityOfResidence: { type: String },
    maritalStatus: { type: String },
    occupation: { type: String, default: "Estudiante" },
    role: {
      type: String,
      enum: ["student", "teacher", "admin"],
      default: "student",
    },
    emergency_contact: { type: String },
    password: { type: String },
    needToChange: { type: Boolean, default: true },
    active: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
