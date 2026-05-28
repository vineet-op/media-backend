import cors from "cors"
import cookieParser from "cookie-parser"
import express from "express"
import userRouter from "./routes/user.routes.js"

const app = express()
app.use(cors())
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(cookieParser())


//Routes defination

app.use("/api/v1/users", userRouter)



export { app }