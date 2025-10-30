import mongoose from "mongoose";

const { Schema } = mongoose;

const assessmentSchema = new Schema(
  {
    group: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Group",
      required: true,
    },
    percentage: { type: Number, min: 5, max: 20, required: true },
    assessment: { type: String, default: "", required: true },
    term: { type: String, required: true },
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    pending: { type: Boolean, default: true },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

const Assessment = mongoose.model("Assessment", assessmentSchema);

export default Assessment;
