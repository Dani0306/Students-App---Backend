import express from "express"
import morgan from "morgan"
import cors from "cors"
import connect from "./src/database.js"
import AssessmentRouter from "./src/routes/assessmentRoutes.js"
import userRoutes from "./src/routes/userRoutes.js"
import GroupRouter from "./src/routes/groupRoutes.js"
import subjectRouter from "./src/routes/subjectRoutes.js"

const app = express();


app.use(express.json())
app.use(morgan("common"))
app.use(cors({
    origin: "http://localhost:5173"
}))

app.use("/assessment", AssessmentRouter)
app.use("/student", userRoutes)
app.use("/group", GroupRouter)
app.use("/subject", subjectRouter)

connect().then(() => {
    app.listen(4000, () => {
        console.log("App running")
        console.log("Database running")
    })
})