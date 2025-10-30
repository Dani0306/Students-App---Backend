import mongoose from "mongoose";

const { Schema } = mongoose;

const activitySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    role: {
      type: String,
      enum: ["student", "teacher", "admin", "unknown"],
      default: "unknown",
    },
    action: { type: String, required: true },
    translatedAction: { type: String, default: null },
    description: { type: String, required: true },
    entity: { type: String, required: true },
    ip: { type: String, index: true },
    location: { type: String, default: null },
    coordinates: {
      type: [Number],
      index: "2dsphere",
      default: undefined,
    },
    browser: { type: String, default: null },
    os: { type: String, default: null },
    device: { type: String, default: "Desktop" },
    geo: {
      city: { type: String, default: null },
      region: { type: String, default: null },
      country: { type: String, default: null },
      timezone: { type: String, default: null },
      source: { type: String, enum: ["local", "remote"], default: "local" },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
