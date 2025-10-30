import express from "express";
import morgan from "morgan";
import cors from "cors";
import connect from "./src/database.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import AssessmentRouter from "./src/routes/assessmentRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import GroupRouter from "./src/routes/groupRoutes.js";
import subjectRouter from "./src/routes/subjectRoutes.js";
import loginRouter from "./src/routes/login.js";
import gradeRouter from "./src/routes/gradeRoutes.js";
import activityRouter from "./src/routes/activityRoutes.js";

dotenv.config();

const app = express();

// * middlewares

app.use(express.json());
app.use(cookieParser());
app.use(morgan("common"));
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true, //^ <— required to allow cookies/Authorization across origins
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// * trust the first proxy (common for simple setups)
app.set("trust proxy", 1);

// * or to trust all proxies (careful, but common in managed platforms)
app.set("trust proxy", true);

// * routers

app.use("/assessment", AssessmentRouter);
app.use("/user", userRoutes);
app.use("/group", GroupRouter);
app.use("/subject", subjectRouter);
app.use("/auth", loginRouter);
app.use("/grade", gradeRouter);
app.use("/activity", activityRouter);

// * running app

connect().then(() => {
  app.listen(process.env.PORT || 4000, () => {
    console.log("App running");
    console.log("Database running");
  });
});

// ^ users:  1000

//  ^ subjects 60

//  ^ gruops 200

//  ^ assessments 1400

//  ^ grades 14000
