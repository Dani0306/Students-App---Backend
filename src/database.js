import mongoose from "mongoose";

export default () => mongoose.connect(process.env.DB_URI);
